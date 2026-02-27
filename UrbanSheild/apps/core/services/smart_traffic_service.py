import requests
from django.conf import settings
from apps.traffic.models import TrafficIncident


UTTARAKHAND_POINTS = [
    (30.3165, 78.0322),
    (29.9457, 78.1642),
    (30.0869, 78.2676),
    (29.2183, 79.5120),
    (29.8543, 77.8880),
]


def fetch_real_uttarakhand_traffic():
    api_key = settings.TOMTOM_API_KEY
    updated = 0

    for lat, lon in UTTARAKHAND_POINTS:
        url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

        params = {
            "key": api_key,
            "point": f"{lat},{lon}"
        }

        try:
            response = requests.get(url, params=params, timeout=10)
        except requests.exceptions.RequestException:
            continue

        if response.status_code != 200:
            # non-200 response; ignore or log as needed
            continue

        data = response.json()

        if "flowSegmentData" not in data:
            continue

        flow = data["flowSegmentData"]

        current_speed = flow.get("currentSpeed", 0)
        free_speed = flow.get("freeFlowSpeed", 1)

        if free_speed == 0:
            continue

        congestion_ratio = 1 - (current_speed / free_speed)
        jam_factor = max(0, min(int(congestion_ratio * 10), 10))

        TrafficIncident.objects.update_or_create(
            latitude=lat,
            longitude=lon,
            defaults={
                "congestion_level": jam_factor,
                "is_blocked": jam_factor >= 8
            }
        )

        updated += 1

    return {"traffic_points_updated": updated}