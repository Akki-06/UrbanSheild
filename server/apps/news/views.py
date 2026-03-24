from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.services.news_service import fetch_incident_news


class NewsViewSet(ViewSet):

    @action(detail=False, methods=["get"])
    def incidents(self, request):
        try:
            limit = int(request.query_params.get("limit", 12))
        except (TypeError, ValueError):
            limit = 12
        data = fetch_incident_news(limit=max(1, min(limit, 30)))
        return Response(data)
