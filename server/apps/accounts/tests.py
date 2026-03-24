"""Tests for the accounts app — registration, Google OAuth, JWT tokens."""
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserProfile


class RegistrationTest(TestCase):

    def test_register_creates_user(self):
        client = APIClient()
        resp = client.post(
            "/api/accounts/register/",
            {"username": "newuser", "email": "new@test.com", "password": "StrongPass1!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_creates_user_profile(self):
        client = APIClient()
        client.post(
            "/api/accounts/register/",
            {"username": "profileuser", "email": "p@test.com", "password": "StrongPass1!"},
            format="json",
        )
        user = User.objects.get(username="profileuser")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_register_duplicate_username_rejected(self):
        User.objects.create_user(username="existing", password="pass")
        client = APIClient()
        resp = client.post(
            "/api/accounts/register/",
            {"username": "existing", "email": "e@test.com", "password": "StrongPass1!"},
            format="json",
        )
        self.assertNotEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_register_with_wrong_admin_key_does_not_create_admin(self):
        client = APIClient()
        resp = client.post(
            "/api/accounts/register/",
            {
                "username": "wannabeadmin",
                "email": "wa@test.com",
                "password": "StrongPass1!",
                "role": "regional_admin",
                "admin_key": "WRONGKEY",
            },
            format="json",
        )
        # Should fail validation
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class JWTTokenTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="jwtuser", password="jwtpass123")

    def test_obtain_token_returns_access_and_refresh(self):
        client = APIClient()
        resp = client.post(
            "/api/token/",
            {"username": "jwtuser", "password": "jwtpass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)

    def test_wrong_credentials_returns_401(self):
        client = APIClient()
        resp = client.post(
            "/api/token/",
            {"username": "jwtuser", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_returns_new_access(self):
        client = APIClient()
        resp = client.post(
            "/api/token/",
            {"username": "jwtuser", "password": "jwtpass123"},
            format="json",
        )
        refresh = resp.json()["refresh"]
        resp2 = client.post("/api/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp2.json())

    def test_protected_endpoint_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/disasters/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_accessible_with_token(self):
        client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        resp = client.get("/api/disasters/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class GoogleAuthTest(TestCase):

    @patch("apps.accounts.views.requests.get")
    def test_google_auth_creates_user(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "user_id": "google123",
            "email": "googleuser@gmail.com",
            "name": "Google User",
        }
        mock_get.return_value = mock_response

        client = APIClient()
        resp = client.post(
            "/api/accounts/google-auth/google_auth/",
            {"token": "fake_google_token"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertTrue(User.objects.filter(email="googleuser@gmail.com").exists())

    @patch("apps.accounts.views.requests.get")
    def test_google_auth_existing_user_returns_tokens(self, mock_get):
        user = User.objects.create_user(username="googlematch", email="g2@gmail.com")
        UserProfile.objects.create(user=user, google_id="existing_google_id")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "user_id": "existing_google_id",
            "email": "g2@gmail.com",
            "name": "Existing",
        }
        mock_get.return_value = mock_response

        client = APIClient()
        resp = client.post(
            "/api/accounts/google-auth/google_auth/",
            {"token": "valid_token"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Should NOT create a second user
        self.assertEqual(User.objects.filter(email="g2@gmail.com").count(), 1)

    def test_google_auth_missing_token_returns_400(self):
        client = APIClient()
        resp = client.post("/api/accounts/google-auth/google_auth/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.accounts.views.requests.get")
    def test_google_auth_invalid_token_returns_401(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_get.return_value = mock_response

        client = APIClient()
        resp = client.post(
            "/api/accounts/google-auth/google_auth/",
            {"token": "bad_token"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
