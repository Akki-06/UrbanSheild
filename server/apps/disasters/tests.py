"""Tests for the disasters app — model logic, API endpoints, escalation."""
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authorities.models import Authority
from apps.disasters.models import Disaster, EscalationLog


def _make_user(username="testuser", password="testpass123"):
    user = User.objects.create_user(username=username, password=password)
    return user


def _auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ── Disaster model tests ──────────────────────────────────────────────────────

class DisasterModelTest(TestCase):

    def test_severity_8_auto_marks_critical(self):
        """Saving a disaster with severity >= 8 should set status to critical."""
        d = Disaster.objects.create(
            disaster_type="flood",
            latitude=30.0, longitude=79.0,
            severity=8,
        )
        d.refresh_from_db()
        self.assertEqual(d.status, "critical")

    def test_severity_7_stays_active(self):
        """Severity 7 should NOT be auto-escalated to critical."""
        d = Disaster.objects.create(
            disaster_type="flood",
            latitude=30.0, longitude=79.0,
            severity=7,
        )
        d.refresh_from_db()
        self.assertEqual(d.status, "active")

    def test_severity_10_auto_marks_critical(self):
        d = Disaster.objects.create(
            disaster_type="earthquake",
            latitude=30.5, longitude=78.5,
            severity=10,
        )
        d.refresh_from_db()
        self.assertEqual(d.status, "critical")

    @patch("apps.disasters.models.send_mail")
    def test_auto_escalation_sends_email_once(self, mock_send):
        """Critical disaster should trigger exactly one escalation email."""
        Authority.objects.create(
            name="NDRF Unit 1",
            authority_type="ndrf",
            latitude=30.1, longitude=78.5,
            phone="123", email="ndrf@test.com",
        )
        Disaster.objects.create(
            disaster_type="flood",
            latitude=30.0, longitude=79.0,
            severity=9,
        )
        # One EscalationLog should exist
        self.assertEqual(EscalationLog.objects.count(), 1)

    @patch("apps.disasters.models.send_mail")
    def test_auto_escalation_not_sent_twice_for_same_disaster(self, mock_send):
        """Re-saving a disaster should NOT create a second EscalationLog."""
        Authority.objects.create(
            name="NDRF Unit 1", authority_type="ndrf",
            latitude=30.1, longitude=78.5,
            phone="123", email="ndrf@test.com",
        )
        d = Disaster.objects.create(
            disaster_type="flood",
            latitude=30.0, longitude=79.0,
            severity=9,
        )
        # Trigger another save
        d.severity = 9
        d.save()
        self.assertEqual(EscalationLog.objects.filter(disaster=d).count(), 1)

    @patch("apps.disasters.models.send_mail", side_effect=Exception("SMTP error"))
    def test_email_failure_creates_log_with_email_sent_false(self, mock_send):
        """If email fails, an EscalationLog should still be created."""
        Authority.objects.create(
            name="NDRF HQ", authority_type="ndrf",
            latitude=30.0, longitude=79.0,
            phone="000", email="ndrf@test.com",
        )
        Disaster.objects.create(
            disaster_type="earthquake",
            latitude=30.1, longitude=78.5,
            severity=9,
        )
        log = EscalationLog.objects.first()
        self.assertIsNotNone(log)
        self.assertFalse(log.email_sent)


# ── Disaster API endpoint tests ───────────────────────────────────────────────

class DisasterAPITest(TestCase):

    def setUp(self):
        self.user = _make_user()
        self.client = _auth_client(self.user)

    def test_list_disasters_returns_200(self):
        resp = self.client.get("/api/disasters/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_create_disaster_inside_uttarakhand(self):
        payload = {
            "disaster_type": "flood",
            "latitude": 30.0,
            "longitude": 79.0,
            "severity": 5,
        }
        resp = self.client.post("/api/disasters/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Disaster.objects.count(), 1)

    def test_create_disaster_outside_uttarakhand_rejected(self):
        payload = {
            "disaster_type": "flood",
            "latitude": 28.6139,   # Delhi
            "longitude": 77.2090,
            "severity": 5,
        }
        resp = self.client.post("/api/disasters/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_radius_filter(self):
        """Only disasters within the radius should be returned."""
        Disaster.objects.create(
            disaster_type="flood", latitude=30.0, longitude=79.0, severity=4
        )
        Disaster.objects.create(
            disaster_type="fire", latitude=29.4, longitude=79.5, severity=4  # ~90km away
        )
        resp = self.client.get("/api/disasters/?lat=30.0&lon=79.0&radius=10")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["disaster_type"], "flood")

    def test_create_disaster_unauthenticated_rejected(self):
        unauth = APIClient()
        payload = {
            "disaster_type": "flood",
            "latitude": 30.0,
            "longitude": 79.0,
            "severity": 5,
        }
        resp = unauth.post("/api/disasters/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_fetch_earthquakes_endpoint(self):
        """The fetch_earthquakes action should return without error."""
        with patch(
            "apps.disasters.views.fetch_earthquakes_uttarakhand",
            return_value={"count": 0, "created": 0},
        ):
            resp = self.client.get("/api/disasters/fetch_earthquakes/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_manual_escalate_low_severity_rejected(self):
        d = Disaster.objects.create(
            disaster_type="flood", latitude=30.0, longitude=79.0, severity=5
        )
        resp = self.client.post(f"/api/disasters/{d.pk}/escalate/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Escalation not required", resp.json()["message"])


# ── EscalationLog API tests ───────────────────────────────────────────────────

class EscalationLogAPITest(TestCase):

    def setUp(self):
        self.user = _make_user()
        self.client = _auth_client(self.user)

    def test_list_escalation_logs(self):
        d = Disaster.objects.create(
            disaster_type="fire", latitude=30.0, longitude=79.0, severity=3
        )
        EscalationLog.objects.create(disaster=d, authority_name="Test Auth", email_sent=True)
        resp = self.client.get("/api/escalation-log/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()), 1)
