from rest_framework import viewsets
from .models import Authority
from .serializers import AuthoritySerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.utils import haversine


class AuthorityViewSet(viewsets.ModelViewSet):
    queryset = Authority.objects.all()
    serializer_class = AuthoritySerializer

    @action(detail=False, methods=['get'])
    def nearest(self, request):
        lat = float(request.query_params.get('lat'))
        lon = float(request.query_params.get('lon'))

        nearest_authority = None
        min_distance = float('inf')

        for authority in Authority.objects.all():
            distance = haversine(lat, lon, authority.latitude, authority.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_authority = authority

        if nearest_authority:
            return Response({
                "authority": AuthoritySerializer(nearest_authority).data,
                "distance_km": round(min_distance, 2)
            })

        return Response({"message": "No authority found"})

class AuthorityViewSet(viewsets.ModelViewSet):
    queryset = Authority.objects.all()
    serializer_class = AuthoritySerializer