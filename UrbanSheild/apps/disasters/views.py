from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Disaster, EscalationLog
from .serializers import DisasterSerializer, EscalationLogSerializer

from apps.shelters.models import Shelter
from apps.authorities.models import Authority
from apps.shelters.serializers import ShelterSerializer
from apps.authorities.serializers import AuthoritySerializer

from apps.core.utils import haversine

from django.core.mail import send_mail

from apps.core.services.earthquake_service import fetch_earthquakes_india
from apps.core.services.weather_service import fetch_india_weather_disasters
from apps.core.services.dijkstra_route_service import find_best_route

@action(detail=False, methods=['get'])
def fetch_weather(self, request):
    result = fetch_india_weather_disasters()
    return Response(result)
class DisasterViewSet(viewsets.ModelViewSet):
    queryset = Disaster.objects.all().order_by('-created_at')
    serializer_class = DisasterSerializer

    @action(detail=True, methods=['get'])
    def response_plan(self, request, pk=None):
        disaster = self.get_object()

        lat = disaster.latitude
        lon = disaster.longitude

        from apps.traffic.models import TrafficIncident

        nearest_shelter = None
        best_route_score = float('inf')
        shelter_distance = None

        for shelter in Shelter.objects.filter(is_active=True):

            # Basic distance
            distance = haversine(lat, lon, shelter.latitude, shelter.longitude)

            # Disaster avoidance penalty
            if distance < 1:
                distance += 5  # avoid very close zone

            # Traffic penalty
            congestion_penalty = 0

            nearby_traffic = TrafficIncident.objects.all()

            for traffic in nearby_traffic:
                traffic_distance = haversine(
                    shelter.latitude,
                    shelter.longitude,
                    traffic.latitude,
                    traffic.longitude
                )

                if traffic_distance < 2:  # near route
                    congestion_penalty += traffic.congestion_level

                    if traffic.is_blocked:
                        congestion_penalty += 20  # heavy penalty

            route_score = distance + congestion_penalty

            if route_score < best_route_score:
                best_route_score = route_score
                nearest_shelter = shelter
                shelter_distance = distance

        # Find nearest authority
        nearest_authority = None
        min_authority_distance = float('inf')

        for authority in Authority.objects.all():
            distance = haversine(lat, lon, authority.latitude, authority.longitude)
            if distance < min_authority_distance:
                min_authority_distance = distance
                nearest_authority = authority

        return Response({
            "disaster": DisasterSerializer(disaster).data,
            "recommended_shelter": ShelterSerializer(nearest_shelter).data if nearest_shelter else None,
            "distance_km": round(shelter_distance, 2) if shelter_distance else None,
            "route_score": round(best_route_score, 2),
            "nearest_authority": AuthoritySerializer(nearest_authority).data if nearest_authority else None,
        })
        
    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        disaster = self.get_object()

        if disaster.severity < 8:
            return Response({"message": "Escalation not required for this severity"}, status=400)

        lat = disaster.latitude
        lon = disaster.longitude

        # Find nearest authority
        nearest_authority = None
        min_distance = float('inf')

        for authority in Authority.objects.all():
            distance = haversine(lat, lon, authority.latitude, authority.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_authority = authority

        if not nearest_authority:
            return Response({"error": "No authority found"}, status=400)

        # Send email
        subject = f"Emergency Alert - {disaster.disaster_type.upper()}"
        message = f"""
        Disaster Type: {disaster.disaster_type}
        Severity: {disaster.severity}
        Location: {lat}, {lon}
        Status: {disaster.status}

        Immediate action recommended.
        """

        send_mail(
            subject,
            message,
            None,
            [nearest_authority.email],
        )

        # Save log
        EscalationLog.objects.create(
            disaster=disaster,
            authority_name=nearest_authority.name,
            email_sent=True
        )

        return Response({
            "message": "Escalation triggered successfully",
            "authority_notified": nearest_authority.name
        })
        
    @action(detail=False, methods=['get'])
    def fetch_earthquakes(self, request):
        result = fetch_earthquakes_india()
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def fetch_weather(self, request):
        result = fetch_india_weather_disasters()
        return Response(result)
    

    @action(detail=True, methods=['get'])
    def smart_route(self, request, pk=None):
        return Response(find_best_route(pk))


class EscalationLogViewSet(viewsets.ModelViewSet):
    queryset = EscalationLog.objects.all().order_by('-timestamp')
    serializer_class = EscalationLogSerializer