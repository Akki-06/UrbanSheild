import requests
from django.conf import settings
from apps.disasters.models import Disaster
from apps.core.utils import is_within_uttarakhand


def fetch_uttarakhand_weather_disasters():

    api_key = settings.OPENWEATHER_API_KEY

    # Major Uttarakhand monitoring points
    cities = [
        ("Dehradun", 30.3165, 78.0322),
        ("Haridwar", 29.9457, 78.1642),
        ("Rishikesh", 30.0869, 78.2676),
        ("Nainital", 29.3803, 79.4636),
        ("Haldwani", 29.2183, 79.5120),
    ]

    created = 0

    for city, lat, lon in cities:

        if not is_within_uttarakhand(lat, lon):
            continue

        url = "https://api.openweathermap.org/data/2.5/weather"

        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric"
        }

        try:
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
        except:
            continue

        # 🌧 Heavy Rain → Flood
        rain = data.get("rain", {}).get("1h", 0)
        if rain >= 50:
            Disaster.objects.create(
                disaster_type="flood",
                latitude=lat,
                longitude=lon,
                severity=8,
                confidence_score=0.9,
                status="active"
            )
            created += 1

        # 🔥 Heatwave
        temp = data.get("main", {}).get("temp", 0)
        if temp >= 45:
            Disaster.objects.create(
                disaster_type="heatwave",
                latitude=lat,
                longitude=lon,
                severity=9 if temp >= 48 else 7,
                confidence_score=0.95,
                status="active"
            )
            created += 1

    return {"weather_disasters_added": created}