from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Authority
from .serializers import AuthoritySerializer

from apps.core.services.authority_service import (
    fetch_police_stations,
    fetch_fire_stations,
)


class AuthorityViewSet(viewsets.ModelViewSet):
    serializer_class = AuthoritySerializer
    queryset = Authority.objects.filter(state="Uttarakhand")

    def get_queryset(self):
        queryset = super().get_queryset()
        authority_type = self.request.query_params.get("type")

        if authority_type:
            queryset = queryset.filter(authority_type=authority_type)

        return queryset

    @action(detail=False, methods=["get"])
    def fetch_police(self, request):
        return Response(fetch_police_stations())

    @action(detail=False, methods=["get"])
    def fetch_fire(self, request):
        return Response(fetch_fire_stations())