import requests
from django.conf import settings
from apps.disasters.models import Disaster


# Optimized India Monitoring Points (Under API Limit)
INDIA_MONITORING_POINTS = [
    # North
    (30.7333, 76.7794),  # Chandigarh
    (34.0837, 74.7973),  # Srinagar
    (28.6139, 77.2090),  # Delhi

    # Northeast
    (26.1445, 91.7362),  # Guwahati
    (27.0844, 93.6053),  # Arunachal

    # East
    (22.5726, 88.3639),  # Kolkata
    (23.3441, 85.3096),  # Jharkhand

    # Central
    (23.2599, 77.4126),  # Bhopal
    (21.1458, 79.0882),  # Nagpur

    # West
    (19.0760, 72.8777),  # Mumbai
    (23.0225, 72.5714),  # Ahmedabad

    # South
    (13.0827, 80.2707),  # Chennai
    (12.9716, 77.5946),  # Bengaluru
    (17.3850, 78.4867),  # Hyderabad

    # Coastal Cyclone Belt
    (15.9129, 79.7400),  # Andhra Coast
    (21.1702, 72.8311),  # Gujarat Coast
    (10.8505, 76.2711),  # Kerala

    # Heat Belt
    (26.9124, 75.7873),  # Jaipur
    (25.4358, 81.8463),  # Prayagraj

    # Additional Spread
    (24.5854, 73.7125),  # Udaipur
    (11.0168, 76.9558),  # Coimbatore
    (18.5204, 73.8567),  # Pune
]


def fetch_india_weather_disasters():
    api_key = settings.OPENWEATHER_API_KEY

    created = {
        "flood": 0,
        "heatwave": 0,
        "cyclone": 0
    }

    for lat, lon in INDIA_MONITORING_POINTS:

        url = "https://api.openweathermap.org/data/2.5/weather"

        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric"
        }

        response = requests.get(url, params=params, timeout=5)

        if response.status_code != 200:
            continue

        data = response.json()

        # ---------------- FLOOD ----------------
        rainfall = data.get("rain", {}).get("1h", 0)

        if rainfall >= 25:
            if not Disaster.objects.filter(
                disaster_type="flood",
                latitude=lat,
                longitude=lon,
                status="active"
            ).exists():

                Disaster.objects.create(
                    disaster_type="flood",
                    latitude=lat,
                    longitude=lon,
                    severity=8,
                    confidence_score=0.9,
                    status="active"
                )

                created["flood"] += 1

        # ---------------- HEATWAVE ----------------
        temp = data.get("main", {}).get("temp", 0)

        if temp >= 45:
            if not Disaster.objects.filter(
                disaster_type="heatwave",
                latitude=lat,
                longitude=lon,
                status="active"
            ).exists():

                Disaster.objects.create(
                    disaster_type="heatwave",
                    latitude=lat,
                    longitude=lon,
                    severity=9,
                    confidence_score=0.95,
                    status="active"
                )

                created["heatwave"] += 1

        # ---------------- CYCLONE ----------------
        description = data.get("weather", [{}])[0].get("description", "").lower()

        if "storm" in description or "cyclone" in description:
            if not Disaster.objects.filter(
                disaster_type="cyclone",
                latitude=lat,
                longitude=lon,
                status="active"
            ).exists():

                Disaster.objects.create(
                    disaster_type="cyclone",
                    latitude=lat,
                    longitude=lon,
                    severity=9,
                    confidence_score=0.95,
                    status="active"
                )

                created["cyclone"] += 1

    return created