import requests
from apps.disasters.models import Disaster

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def fetch_earthquakes_india():
    params = {
        "format": "geojson",
        "minmagnitude": 4,
        "limit": 50,

        # INDIA BOUNDING BOX
        "minlatitude": 6,
        "maxlatitude": 37,
        "minlongitude": 68,
        "maxlongitude": 98
    }

    response = requests.get(USGS_URL, params=params, timeout=5)

    if response.status_code != 200:
        return {"error": "Failed to fetch earthquake data"}

    data = response.json()
    created_count = 0

    for feature in data["features"]:
        coords = feature["geometry"]["coordinates"]
        magnitude = feature["properties"]["mag"]

        longitude = coords[0]
        latitude = coords[1]

        # Prevent duplicates
        if not Disaster.objects.filter(
            latitude=latitude,
            longitude=longitude,
            disaster_type="earthquake"
        ).exists():

            Disaster.objects.create(
                disaster_type="earthquake",
                latitude=latitude,
                longitude=longitude,
                severity=int(magnitude),
                confidence_score=0.95,
                status="active"
            )

            created_count += 1

    return {"earthquakes_added": created_count}