from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import TrafficIncident
from .serializers import TrafficIncidentSerializer
from apps.core.services.smart_traffic_service import simulate_smart_traffic


class TrafficIncidentViewSet(viewsets.ModelViewSet):
    queryset = TrafficIncident.objects.all()
    serializer_class = TrafficIncidentSerializer

    @action(detail=False, methods=['get'])
    def simulate(self, request):
        return Response(simulate_smart_traffic())