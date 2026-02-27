import random
import math
from apps.traffic.models import TrafficIncident
from apps.disasters.models import Disaster


TRAFFIC_POINTS = [
    (28.7041, 77.1025),  # Delhi
    (19.2183, 72.9781),  # Mumbai
    (22.5726, 88.3639),  # Kolkata
    (13.0674, 80.2376),  # Chennai
    (12.9716, 77.6412),  # Bengaluru
    (17.3850, 78.4867),  # Hyderabad
]


def calculate_distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)


def simulate_smart_traffic():

    active_disasters = Disaster.objects.filter(status="active")

    updated = 0

    for lat, lon in TRAFFIC_POINTS:

        # Base city congestion
        base_congestion = random.randint(2, 6)

        disaster_impact = 0
        blocked = False

        for disaster in active_disasters:

            distance = calculate_distance(
                lat, lon,
                disaster.latitude,
                disaster.longitude
            )

            # If within 1.5 degree radius (~regional impact)
            if distance < 1.5:

                disaster_impact += disaster.severity // 2

                if disaster.severity >= 8:
                    blocked = True

        final_congestion = base_congestion + disaster_impact
        final_congestion = max(0, min(final_congestion, 10))

        TrafficIncident.objects.update_or_create(
            latitude=lat,
            longitude=lon,
            defaults={
                "congestion_level": final_congestion,
                "is_blocked": blocked
            }
        )

        updated += 1

    return {
        "traffic_points_updated": updated,
        "active_disasters_considered": active_disasters.count()
    }