from django.shortcuts import render
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from apps.core.utils import haversine, UTTARAKHAND_BOUNDS, is_within_uttarakhand

import requests

from apps.core.services.dijkstra_route_service import compute_smart_route
from apps.core.services.evacuation_service import compute_evacuation_route, check_user_in_danger_zone
from apps.core.models import UserLocation, UserAlertPreference, DisasterAlert, EvacuationZone
from apps.core.serializers import (
    UserLocationSerializer, UserAlertPreferenceSerializer, 
    DisasterAlertSerializer, EvacuationZoneSerializer
)
from apps.disasters.models import Disaster
from apps.traffic.models import TrafficIncident


# Create your views here.


class RouteViewSet(viewsets.ViewSet):
    """Expose routing endpoints used by the front end.

    Currently the only implemented action is ``smart_route`` which accepts a
    start/end coordinate pair and returns a route that attempts to avoid
    congestion and ongoing disasters by leveraging the Dijkstra service.
    """

    @action(detail=False, methods=["get"])
    def smart_route(self, request):
        params = request.query_params
        try:
            start_lat = float(params.get("start_lat"))
            start_lon = float(params.get("start_lon"))
            end_lat = float(params.get("end_lat"))
            end_lon = float(params.get("end_lon"))
        except (TypeError, ValueError):
            return Response(
                {"error": "start_lat/start_lon/end_lat/end_lon must be provided and numeric"},
                status=400,
            )

        result = compute_smart_route((start_lat, start_lon), (end_lat, end_lon))
        return Response(result)


class UserLocationViewSet(viewsets.ViewSet):
    """Handle user GPS location tracking and updates"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def update_location(self, request):
        """Update user's current GPS location"""
        try:
            latitude = float(request.data.get('latitude'))
            longitude = float(request.data.get('longitude'))
            accuracy = request.data.get('accuracy')
        except (TypeError, ValueError):
            return Response(
                {"error": "latitude and longitude must be numeric"},
                status=status.HTTP_400_BAD_REQUEST
            )

        location, created = UserLocation.objects.update_or_create(
            user=request.user,
            defaults={
                'latitude': latitude,
                'longitude': longitude,
                'accuracy': float(accuracy) if accuracy else None,
                'is_active': True
            }
        )

        # Trigger alert check for nearby disasters
        self._check_nearby_disasters(request.user, (latitude, longitude))

        serializer = UserLocationSerializer(location)
        return Response({
            'message': 'Location updated successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def get_location(self, request):
        """Get user's current location"""
        try:
            location = UserLocation.objects.get(user=request.user)
            serializer = UserLocationSerializer(location)
            return Response(serializer.data)
        except UserLocation.DoesNotExist:
            return Response(
                {"error": "No location data found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def _check_nearby_disasters(self, user, user_location):
        """Check if user is near any active disasters and create alerts"""
        try:
            prefs = UserAlertPreference.objects.get(user=user)
        except UserAlertPreference.DoesNotExist:
            # Create default preferences if not exist
            prefs = UserAlertPreference.objects.create(
                user=user,
                alert_radius_km=5,
                min_severity=5,
                disaster_types=['flood', 'fire', 'earthquake', 'cyclone', 'heatwave']
            )

        if not prefs.alert_enabled:
            return

        # Find nearby active disasters
        active_disasters = Disaster.objects.filter(status='active')

        for disaster in active_disasters:
            # Skip if alert already sent
            if DisasterAlert.objects.filter(user=user, disaster=disaster).exists():
                continue

            # Check if within alert radius
            if check_user_in_danger_zone(
                user_location, 
                (disaster.latitude, disaster.longitude),
                radius_km=prefs.alert_radius_km
            ):
                # Check disaster type and severity
                if (disaster.disaster_type in prefs.disaster_types and 
                    disaster.severity >= prefs.min_severity):
                    
                    # Compute evacuation route
                    route_data = compute_evacuation_route(user_location, disaster)

                    # Create alert record
                    DisasterAlert.objects.create(
                        user=user,
                        disaster=disaster,
                        distance_km=route_data.get('distance_km', 0),
                        evacuation_route=route_data
                    )


class UserAlertPreferenceViewSet(viewsets.ViewSet):
    """Manage user alert preferences"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get", "post"])
    def preferences(self, request):
        """Get or update user's alert preferences"""
        if request.method == 'GET':
            try:
                prefs = UserAlertPreference.objects.get(user=request.user)
            except UserAlertPreference.DoesNotExist:
                prefs = UserAlertPreference.objects.create(user=request.user)
            
            serializer = UserAlertPreferenceSerializer(prefs)
            return Response(serializer.data)

        elif request.method == 'POST':
            prefs, _ = UserAlertPreference.objects.get_or_create(user=request.user)
            serializer = UserAlertPreferenceSerializer(prefs, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DisasterAlertViewSet(viewsets.ViewSet):
    """View and manage disaster alerts for users"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def my_alerts(self, request):
        """Get all alerts for current user"""
        alerts = DisasterAlert.objects.filter(user=request.user).order_by('-alert_sent_at')
        serializer = DisasterAlertSerializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active_alerts(self, request):
        """Get only unviewed/unseen alerts"""
        alerts = DisasterAlert.objects.filter(
            user=request.user,
            status__in=['sent', 'action_taken']
        ).order_by('-alert_sent_at')
        serializer = DisasterAlertSerializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def mark_viewed(self, request):
        """Mark an alert as viewed"""
        alert_id = request.data.get('alert_id')
        try:
            alert = DisasterAlert.objects.get(id=alert_id, user=request.user)
            alert.alert_viewed_at = timezone.now()
            alert.status = 'viewed'
            alert.save()
            serializer = DisasterAlertSerializer(alert)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DisasterAlert.DoesNotExist:
            return Response(
                {"error": "Alert not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["post"])
    def get_evacuation_route(self, request):
        """Get evacuation route for a specific disaster"""
        disaster_id = request.data.get('disaster_id')
        try:
            user_loc = UserLocation.objects.get(user=request.user)
            disaster = Disaster.objects.get(id=disaster_id)
            
            route_data = compute_evacuation_route(
                (user_loc.latitude, user_loc.longitude),
                disaster
            )
            
            return Response(route_data, status=status.HTTP_200_OK)
        except (UserLocation.DoesNotExist, Disaster.DoesNotExist) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )


class EvacuationZoneViewSet(viewsets.ModelViewSet):
    """Manage evacuation zones for disasters"""
    queryset = EvacuationZone.objects.all()
    serializer_class = EvacuationZoneSerializer

    @action(detail=False, methods=["get"])
    def by_disaster(self, request):
        """Get evacuation zones for a specific disaster"""
        disaster_id = request.query_params.get('disaster_id')
        if not disaster_id:
            return Response(
                {"error": "disaster_id parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        zones = EvacuationZone.objects.filter(disaster_id=disaster_id).order_by('zone_number')
        serializer = EvacuationZoneSerializer(zones, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# simple search/geocode endpoints used by the React frontend
# ---------------------------------------------------------------------------

class SearchView(APIView):
    """Lookup a place name within Uttarakhand via Nominatim."""
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([], status=200)

        bounds = UTTARAKHAND_BOUNDS
        viewbox = (
            f"{bounds['min_lon']},{bounds['min_lat']}"
            f",{bounds['max_lon']},{bounds['max_lat']}"
        )
        try:
            resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": query,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": 5,
                    "viewbox": viewbox,
                    "bounded": 1,
                },
                headers={"User-Agent": "UrbanShield/1.0 (contact@urbanshield.example)"},
                timeout=10,
            )
            results = resp.json()
        except Exception:
            return Response([], status=200)

        filtered = []
        for item in results:
            try:
                lat = float(item.get("lat"))
                lon = float(item.get("lon"))
            except (TypeError, ValueError):
                continue
            if is_within_uttarakhand(lat, lon):
                filtered.append({
                    "name": item.get("display_name"),
                    "lat": lat,
                    "lon": lon,
                })
        return Response(filtered)


class SearchInfoView(APIView):
    """Return counts of traffic & disasters within a radius around a point."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params.get("lat"))
            lon = float(request.query_params.get("lon"))
        except (TypeError, ValueError):
            return Response({"error": "invalid coordinates"}, status=400)

        radius_km = float(request.query_params.get("radius", 10))

        tcount = 0
        for t in TrafficIncident.objects.all():
            if haversine(lat, lon, t.latitude, t.longitude) <= radius_km:
                tcount += 1

        dcount = 0
        for d in Disaster.objects.all():
            if haversine(lat, lon, d.latitude, d.longitude) <= radius_km:
                dcount += 1

        return Response({
            "traffic_count": tcount,
            "disaster_count": dcount,
        })

