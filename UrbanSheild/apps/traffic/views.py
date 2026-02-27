from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import TrafficIncident
from .serializers import TrafficIncidentSerializer

from apps.core.utils import UTTARAKHAND_BOUNDS
from apps.core.services.smart_traffic_service import fetch_real_uttarakhand_traffic


class TrafficIncidentViewSet(viewsets.ModelViewSet):
    serializer_class = TrafficIncidentSerializer
    permission_classes = [AllowAny]

    # 🔒 Restrict traffic data to Uttarakhand only
    def get_queryset(self):
        return TrafficIncident.objects.filter(
            latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
            latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
            longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
            longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
        )

    # 🚦 Fetch real traffic from TomTom (Uttarakhand only)
    @action(detail=False, methods=["get"])
    def fetch_real(self, request):
        result = fetch_real_uttarakhand_traffic()
        return Response(result)