from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from django.core.mail import send_mail
from django.conf import settings

from .models import Disaster, EscalationLog
from .serializers import DisasterSerializer, EscalationLogSerializer

from apps.shelters.models import Shelter
from apps.authorities.models import Authority
from apps.traffic.models import TrafficIncident

from apps.shelters.serializers import ShelterSerializer
from apps.authorities.serializers import AuthoritySerializer

from apps.core.utils import haversine, UTTARAKHAND_BOUNDS, is_within_uttarakhand
from apps.core.services.earthquake_service import fetch_earthquakes_uttarakhand
from apps.core.services.weather_service import fetch_uttarakhand_weather_disasters
from apps.core.services.dijkstra_route_service import find_best_route
from apps.core.services.escalation_service import escalate_disaster

class DisasterViewSet(viewsets.ModelViewSet):
    serializer_class = DisasterSerializer

    # ----------------------------------------
    # 🔒 Restrict disasters to Uttarakhand
    # ----------------------------------------
    def get_queryset(self):
        queryset = Disaster.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        ).order_by("-created_at")

        try:
            lat = float(self.request.query_params.get("lat"))
            lon = float(self.request.query_params.get("lon"))
            radius_km = float(self.request.query_params.get("radius", 10))
        except (TypeError, ValueError):
            return queryset

        in_radius_ids = [
            d.id for d in queryset
            if haversine(lat, lon, d.latitude, d.longitude) <= radius_km
        ]
        return queryset.filter(id__in=in_radius_ids).order_by("-created_at")

    # ----------------------------------------
    # 🔒 Prevent creation outside Uttarakhand
    # ----------------------------------------
    def perform_create(self, serializer):
        lat = serializer.validated_data["latitude"]
        lon = serializer.validated_data["longitude"]

        if not is_within_uttarakhand(lat, lon):
            raise ValidationError("Only Uttarakhand incidents allowed.")

        serializer.save()
        escalate_disaster()

    # ----------------------------------------
    # SMART RESPONSE PLAN
    # ----------------------------------------
    @action(detail=True, methods=["get"])
    def response_plan(self, request, pk=None):
        disaster = self.get_object()
        lat, lon = disaster.latitude, disaster.longitude

        nearest_shelter = None
        best_route_score = float("inf")
        shelter_distance = None

        # 🔒 Restrict shelters to Uttarakhand
        shelters = Shelter.objects.filter(
            is_active=True,
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

        # 🔒 Restrict traffic to Uttarakhand
        traffic_points = TrafficIncident.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

        for shelter in shelters:
            distance = haversine(lat, lon, shelter.latitude, shelter.longitude)

            if distance < 1:
                distance += 5

            congestion_penalty = 0

            for traffic in traffic_points:
                traffic_distance = haversine(
                    shelter.latitude,
                    shelter.longitude,
                    traffic.latitude,
                    traffic.longitude,
                )

                if traffic_distance < 2:
                    congestion_penalty += traffic.congestion_level
                    if traffic.is_blocked:
                        congestion_penalty += 20

            route_score = distance + congestion_penalty

            if route_score < best_route_score:
                best_route_score = route_score
                nearest_shelter = shelter
                shelter_distance = distance

        # 🔒 Restrict authorities to Uttarakhand
        nearest_authority = None
        min_authority_distance = float("inf")

        authorities = Authority.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

        for authority in authorities:
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

    # ----------------------------------------
    # ESCALATION
    # ----------------------------------------
    @action(detail=True, methods=["post"])
    def escalate(self, request, pk=None):
        disaster = self.get_object()

        if disaster.severity < 8:
            return Response({"message": "Escalation not required"}, status=400)

        lat, lon = disaster.latitude, disaster.longitude

        authorities = Authority.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

        nearest_authority = None
        min_distance = float("inf")

        for authority in authorities:
            distance = haversine(lat, lon, authority.latitude, authority.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_authority = authority

        if not nearest_authority:
            return Response({"error": "No authority found"}, status=400)

        recipient = getattr(settings, "EMAIL_TEST_RECIPIENT", None) or nearest_authority.email

        email_sent = False
        try:
            send_mail(
                subject=f"Emergency Alert - {disaster.disaster_type.upper()}",
                message=f"""
Disaster Type: {disaster.disaster_type}
Severity: {disaster.severity}
Location: {lat}, {lon}
Status: {disaster.status}
Immediate action recommended.
""",
                from_email=None,
                recipient_list=[recipient],
                fail_silently=False,
            )
            email_sent = True
        except Exception as exc:
            # Log but continue to record escalation
            email_sent = False

        EscalationLog.objects.create(
            disaster=disaster,
            authority_name=nearest_authority.name,
            email_sent=email_sent,
        )

        return Response({
            "message": "Escalation triggered successfully",
            "authority_notified": nearest_authority.name,
        })

    # ----------------------------------------
    # REAL DATA FETCH
    # ----------------------------------------
    @action(detail=False, methods=["get"])
    def fetch_earthquakes(self, request):
        return Response(fetch_earthquakes_uttarakhand())

    @action(detail=False, methods=["get"])
    def fetch_weather(self, request):
        return Response(fetch_uttarakhand_weather_disasters())

    # ----------------------------------------
    # SMART ROUTE
    # ----------------------------------------
    @action(detail=True, methods=["get"])
    def smart_route(self, request, pk=None):
        return Response(find_best_route(pk))


class EscalationLogViewSet(viewsets.ModelViewSet):
    queryset = EscalationLog.objects.all().order_by("-timestamp")
    serializer_class = EscalationLogSerializer
