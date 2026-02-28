from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import TrafficIncident
from .serializers import TrafficIncidentSerializer

from apps.core.utils import UTTARAKHAND_BOUNDS, haversine
from apps.core.services.smart_traffic_service import fetch_real_uttarakhand_traffic


class TrafficIncidentViewSet(viewsets.ModelViewSet):
    serializer_class = TrafficIncidentSerializer
    permission_classes = [AllowAny]

    # 🔒 Restrict traffic data to Uttarakhand only
    def get_queryset(self):
        queryset = TrafficIncident.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

        try:
            lat = float(self.request.query_params.get("lat"))
            lon = float(self.request.query_params.get("lon"))
            radius_km = float(self.request.query_params.get("radius", 10))
        except (TypeError, ValueError):
            return queryset

        in_radius_ids = [
            t.id for t in queryset
            if haversine(lat, lon, t.latitude, t.longitude) <= radius_km
        ]
        return queryset.filter(id__in=in_radius_ids)

    # 🚦 Fetch real traffic from TomTom (Uttarakhand only)
    @action(detail=False, methods=["get"])
    def fetch_real(self, request):
        result = fetch_real_uttarakhand_traffic()
        return Response(result)
