from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.services.news_service import fetch_incident_news


class NewsViewSet(ViewSet):

    @action(detail=False, methods=["get"])
    def incidents(self, request):
        data = fetch_incident_news()
        return Response(data)