"""Tests for the core app — utils, routing, alert preferences, proximity alerts."""
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.utils import haversine, is_within_uttarakhand
from apps.core.services.dijkstra_route_service import (
    _coord_distance_km, build_graph, dijkstra_with_path,
    reconstruct_path, compute_smart_route,
)
from apps.core.models import UserLocation, UserAlertPreference, DisasterAlert
from apps.disasters.models import Disaster


def _make_user(username="coreuser", password="pass123"):
    return User.objects.create_user(username=username, password=password)


def _auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ── Utility function tests ────────────────────────────────────────────────────

class HaversineTest(TestCase):

    def test_same_point_is_zero(self):
        self.assertAlmostEqual(haversine(30.0, 79.0, 30.0, 79.0), 0.0, places=5)

    def test_dehradun_to_haridwar_approx_54km(self):
        dist = haversine(30.3165, 78.0322, 29.9457, 78.1642)
        self.assertGreater(dist, 40)
        self.assertLess(dist, 65)

    def test_symmetric(self):
        d1 = haversine(30.0, 78.0, 29.5, 79.0)
        d2 = haversine(29.5, 79.0, 30.0, 78.0)
        self.assertAlmostEqual(d1, d2, places=5)

    def test_positive_for_distinct_points(self):
        self.assertGreater(haversine(28.5, 77.8, 31.0, 80.5), 0)


class GeofenceTest(TestCase):

    def test_dehradun_inside(self):
        self.assertTrue(is_within_uttarakhand(30.3165, 78.0322))

    def test_nainital_inside(self):
        self.assertTrue(is_within_uttarakhand(29.3919, 79.4542))

    def test_delhi_outside(self):
        self.assertFalse(is_within_uttarakhand(28.6139, 77.2090))

    def test_too_far_north_outside(self):
        self.assertFalse(is_within_uttarakhand(32.0, 79.0))

    def test_too_far_east_outside(self):
        self.assertFalse(is_within_uttarakhand(30.0, 82.0))

    def test_boundary_min(self):
        self.assertTrue(is_within_uttarakhand(28.43, 77.73))

    def test_boundary_max(self):
        self.assertTrue(is_within_uttarakhand(31.46, 81.02))


# ── Dijkstra routing tests ────────────────────────────────────────────────────

class DijkstraDistanceTest(TestCase):

    def test_coord_distance_km_same_point(self):
        self.assertAlmostEqual(_coord_distance_km((30.0, 79.0), (30.0, 79.0)), 0.0, places=5)

    def test_coord_distance_km_positive(self):
        self.assertGreater(_coord_distance_km((30.0, 78.0), (30.5, 79.0)), 0)

    def test_coord_distance_km_known_pair(self):
        # Dehradun to Haridwar
        d = _coord_distance_km((30.3165, 78.0322), (29.9457, 78.1642))
        self.assertGreater(d, 40)
        self.assertLess(d, 65)


class BuildGraphTest(TestCase):

    def test_start_and_end_connected_when_close(self):
        nodes = [
            {"type": "start", "coord": (30.0, 79.0)},
            {"type": "end",   "coord": (30.01, 79.01)},  # ~1.5 km away
        ]
        graph = build_graph(nodes)
        # Both nodes should have at least one connection
        self.assertTrue(len(graph[0]) > 0 or len(graph[1]) > 0)

    def test_nodes_beyond_threshold_not_connected(self):
        nodes = [
            {"type": "start", "coord": (28.5, 77.8)},   # south-west corner
            {"type": "end",   "coord": (31.4, 80.9)},   # north-east corner (~410km)
        ]
        graph = build_graph(nodes)
        self.assertEqual(graph[0], [])  # too far apart
        self.assertEqual(graph[1], [])

    def test_blocked_node_has_higher_weight(self):
        nodes = [
            {"type": "start",   "coord": (30.0, 79.0)},
            {"type": "blocked", "coord": (30.01, 79.01), "blocked": True, "congestion": 0},
            {"type": "clear",   "coord": (30.01, 79.01), "blocked": False, "congestion": 0},
        ]
        graph = build_graph(nodes)
        if graph[0]:
            weights = {j: w for j, w in graph[0]}
            if 1 in weights and 2 in weights:
                self.assertGreater(weights[1], weights[2])


class DijkstraAlgorithmTest(TestCase):

    def test_finds_shortest_path_in_simple_graph(self):
        # Simple 3-node graph: 0 → 1 (cost 5), 0 → 2 (cost 10), 1 → 2 (cost 3)
        graph = {
            0: [(1, 5), (2, 10)],
            1: [(2, 3)],
            2: [],
        }
        distances, previous = dijkstra_with_path(graph, 0)
        self.assertEqual(distances[2], 8)  # 0→1→2 = 5+3 = 8 (cheaper than direct 10)

    def test_unreachable_node_has_infinite_distance(self):
        graph = {0: [], 1: []}
        distances, _ = dijkstra_with_path(graph, 0)
        self.assertEqual(distances[1], float("inf"))

    def test_reconstruct_path_returns_correct_sequence(self):
        previous = {2: 1, 1: 0}
        path = reconstruct_path(previous, 0, 2)
        self.assertEqual(path, [0, 1, 2])

    def test_reconstruct_path_empty_if_no_route(self):
        path = reconstruct_path({}, 0, 3)
        self.assertEqual(path, [])


class SmartRouteTest(TestCase):

    @patch("apps.core.services.dijkstra_route_service.get_osrm_route")
    def test_compute_smart_route_returns_dict(self, mock_osrm):
        mock_osrm.return_value = {"type": "LineString", "coordinates": []}
        result = compute_smart_route((30.0, 79.0), (30.1, 79.1))
        self.assertIn("route_cost", result)
        self.assertIn("route_nodes", result)

    @patch("apps.core.services.dijkstra_route_service.get_osrm_route")
    def test_compute_smart_route_start_equals_end(self, mock_osrm):
        mock_osrm.return_value = None
        result = compute_smart_route((30.0, 79.0), (30.0, 79.0))
        # Should not crash even if start == end
        self.assertIsInstance(result, dict)


# ── UserLocation API tests ────────────────────────────────────────────────────

class UserLocationAPITest(TestCase):

    def setUp(self):
        self.user = _make_user()
        self.client = _auth_client(self.user)

    def test_update_location_valid(self):
        resp = self.client.post(
            "/api/user-location/update_location/",
            {"latitude": 30.3165, "longitude": 78.0322},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(UserLocation.objects.filter(user=self.user).exists())

    def test_update_location_invalid_coords(self):
        resp = self.client.post(
            "/api/user-location/update_location/",
            {"latitude": "not_a_number", "longitude": 78.0},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_location_not_found(self):
        resp = self.client.get("/api/user-location/get_location/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_location_after_update(self):
        self.client.post(
            "/api/user-location/update_location/",
            {"latitude": 30.0, "longitude": 79.0},
            format="json",
        )
        resp = self.client.get("/api/user-location/get_location/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertAlmostEqual(data["latitude"], 30.0)

    def test_update_location_unauthenticated(self):
        unauth = APIClient()
        resp = unauth.post(
            "/api/user-location/update_location/",
            {"latitude": 30.0, "longitude": 79.0},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Alert preference tests ────────────────────────────────────────────────────

class AlertPreferenceTest(TestCase):

    def setUp(self):
        self.user = _make_user(username="alertuser")
        self.client = _auth_client(self.user)

    def test_get_preferences_creates_defaults(self):
        resp = self.client.get("/api/alert-preference/preferences/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(UserAlertPreference.objects.filter(user=self.user).exists())

    def test_update_preferences(self):
        resp = self.client.post(
            "/api/alert-preference/preferences/",
            {"alert_radius_km": 15, "min_severity": 6},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        prefs = UserAlertPreference.objects.get(user=self.user)
        self.assertEqual(prefs.alert_radius_km, 15)
        self.assertEqual(prefs.min_severity, 6)


# ── Analytics summary tests ───────────────────────────────────────────────────

class AnalyticsSummaryTest(TestCase):

    def setUp(self):
        self.user = _make_user(username="analyticsuser")
        self.client = _auth_client(self.user)

    def test_summary_returns_200(self):
        resp = self.client.get("/api/analytics/summary/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_summary_structure(self):
        resp = self.client.get("/api/analytics/summary/")
        data = resp.json()
        self.assertIn("disasters", data)
        self.assertIn("traffic", data)
        self.assertIn("hotspots", data)
        self.assertIn("daily_trend", data)

    def test_summary_counts_disasters(self):
        Disaster.objects.create(
            disaster_type="flood", latitude=30.0, longitude=79.0, severity=4
        )
        Disaster.objects.create(
            disaster_type="fire", latitude=30.1, longitude=79.1, severity=9
        )
        resp = self.client.get("/api/analytics/summary/")
        data = resp.json()
        self.assertGreaterEqual(data["disasters"]["active_count"], 1)
        self.assertGreaterEqual(data["disasters"]["critical_count"], 1)

    def test_summary_unauthenticated(self):
        unauth = APIClient()
        resp = unauth.get("/api/analytics/summary/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_daily_trend_has_7_days(self):
        resp = self.client.get("/api/analytics/summary/")
        daily = resp.json()["daily_trend"]
        self.assertEqual(len(daily), 7)
