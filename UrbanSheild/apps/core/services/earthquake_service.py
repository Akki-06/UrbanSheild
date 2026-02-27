import requests
from apps.core.utils import is_within_uttarakhand
from apps.disasters.models import Disaster

def fetch_earthquakes_uttarakhand():

    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "minmagnitude": 4,
        "limit": 50
    }

    response = requests.get(url, params=params)
    data = response.json()

    count = 0

    for feature in data["features"]:
        coords = feature["geometry"]["coordinates"]
        lon = coords[0]
        lat = coords[1]
        magnitude = feature["properties"]["mag"]

        if is_within_uttarakhand(lat, lon):
            Disaster.objects.create(
                disaster_type="earthquake",
                severity=magnitude,
                latitude=lat,
                longitude=lon,
                status="active"
            )
            count += 1

    return {"earthquakes_added": count}