"""Analytics views — aggregate statistics for the dashboard.

Endpoint: GET /api/analytics/summary/
Returns counts and computed metrics so the React frontend can display
charts and KPI cards without running calculations client-side for the
admin-level overview.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.disasters.models import Disaster
from apps.traffic.models import TrafficIncident


class AnalyticsSummaryView(APIView):
    """Return a summary of disasters and traffic over the last 7 days."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        one_day_ago = now - timedelta(days=1)

        # ── disaster aggregations ─────────────────────────────────────────
        all_disasters = Disaster.objects.all()
        recent_disasters = all_disasters.filter(created_at__gte=seven_days_ago)

        active_count = all_disasters.filter(status__in=["active", "critical"]).count()
        critical_count = all_disasters.filter(status="critical").count()
        last24_disasters = all_disasters.filter(created_at__gte=one_day_ago).count()

        # Severity average
        severities = list(all_disasters.values_list("severity", flat=True))
        avg_severity = round(sum(severities) / len(severities), 2) if severities else 0

        # Type distribution
        type_dist: dict[str, int] = {}
        for d in recent_disasters:
            type_dist[d.disaster_type] = type_dist.get(d.disaster_type, 0) + 1

        # Status distribution
        status_dist: dict[str, int] = {}
        for d in all_disasters:
            status_dist[d.status] = status_dist.get(d.status, 0) + 1

        # 7-day daily breakdown
        daily: dict[str, dict] = {}
        for i in range(7):
            day = (now - timedelta(days=6 - i)).date()
            daily[str(day)] = {"disasters": 0, "traffic": 0}

        for d in recent_disasters:
            key = str(d.created_at.date())
            if key in daily:
                daily[key]["disasters"] += 1

        # ── traffic aggregations ──────────────────────────────────────────
        all_traffic = TrafficIncident.objects.all()
        recent_traffic = all_traffic.filter(created_at__gte=seven_days_ago)

        blocked_roads = all_traffic.filter(is_blocked=True).count()
        last24_traffic = all_traffic.filter(created_at__gte=one_day_ago).count()

        congestion_levels = list(all_traffic.values_list("congestion_level", flat=True))
        avg_congestion = (
            round(sum(congestion_levels) / len(congestion_levels), 2)
            if congestion_levels else 0
        )

        for t in recent_traffic:
            key = str(t.created_at.date())
            if key in daily:
                daily[key]["traffic"] += 1

        # ── hotspot detection (grid cell 0.1° ≈ 10km) ────────────────────
        hotspot_map: dict[str, dict] = {}
        for d in all_disasters:
            cell = f"{round(d.latitude, 1)},{round(d.longitude, 1)}"
            if cell not in hotspot_map:
                hotspot_map[cell] = {"lat": round(d.latitude, 1), "lon": round(d.longitude, 1),
                                     "count": 0, "max_severity": 0}
            hotspot_map[cell]["count"] += 1
            hotspot_map[cell]["max_severity"] = max(hotspot_map[cell]["max_severity"], d.severity)

        hotspots = sorted(
            hotspot_map.values(),
            key=lambda h: (-h["count"], -h["max_severity"])
        )[:8]

        return Response({
            "disasters": {
                "active_count": active_count,
                "critical_count": critical_count,
                "last_24h": last24_disasters,
                "avg_severity": avg_severity,
                "type_distribution": type_dist,
                "status_distribution": status_dist,
            },
            "traffic": {
                "blocked_roads": blocked_roads,
                "last_24h": last24_traffic,
                "avg_congestion": avg_congestion,
                "total": all_traffic.count(),
            },
            "hotspots": hotspots,
            "daily_trend": daily,
        })
