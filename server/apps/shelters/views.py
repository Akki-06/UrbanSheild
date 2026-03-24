from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Shelter
from .serializers import ShelterSerializer
from apps.core.utils import haversine


class ShelterViewSet(viewsets.ModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer

    @action(detail=False, methods=['get'])
    def nearest(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')

        if not lat or not lon:
            return Response({"error": "lat and lon required"}, status=400)

        lat = float(lat)
        lon = float(lon)

        nearest_shelter = None
        min_distance = float('inf')

        for shelter in Shelter.objects.filter(is_active=True):
            distance = haversine(lat, lon, shelter.latitude, shelter.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_shelter = shelter

        if nearest_shelter:
            return Response({
                "shelter": ShelterSerializer(nearest_shelter).data,
                "distance_km": round(min_distance, 2)
            })

        return Response({"message": "No shelter found"})

