from apps.core.utils import haversine
from apps.core.services.dijkstra_route_service import compute_smart_route
from apps.shelters.models import Shelter
from apps.core.utils import UTTARAKHAND_BOUNDS


def compute_evacuation_route(user_location, disaster):
    """
    Compute the best evacuation route from user location to nearest safe shelter.
    Avoids disaster epicenter and considers traffic.
    
    Args:
        user_location: (lat, lon) tuple for current user position
        disaster: Disaster model instance
    
    Returns:
        dict with route_coordinates, nearest_shelter, distance_km, eta_minutes
    """
    
    # Find nearest active shelter outside disaster zone
    # Increase exclusion radius based on disaster severity
    exclusion_radius = max(2, disaster.severity / 2)  # 1-5km based on severity
    
    shelters = Shelter.objects.filter(
        is_active=True,
        latitude__gte=UTTARAKHAND_BOUNDS["min_lat"],
        latitude__lte=UTTARAKHAND_BOUNDS["max_lat"],
        longitude__gte=UTTARAKHAND_BOUNDS["min_lon"],
        longitude__lte=UTTARAKHAND_BOUNDS["max_lon"],
    )
    
    best_shelter = None
    best_distance = float('inf')
    
    for shelter in shelters:
        # Check if shelter is outside danger zone
        dist_to_disaster = haversine(
            shelter.latitude, shelter.longitude,
            disaster.latitude, disaster.longitude
        )
        
        if dist_to_disaster < exclusion_radius:
            continue  # Skip shelters too close to disaster
        
        # Calculate distance from user to shelter
        dist_to_shelter = haversine(
            user_location[0], user_location[1],
            shelter.latitude, shelter.longitude
        )
        
        if dist_to_shelter < best_distance:
            best_distance = dist_to_shelter
            best_shelter = shelter
    
    if not best_shelter:
        # If no shelter found, use second-best even if closer to disaster
        best_shelter = shelters.order_by('latitude', 'longitude').first()
    
    if not best_shelter:
        return {
            'status': 'error',
            'message': 'No shelters available',
            'evacuation_route': None
        }
    
    # Use smart routing with disaster avoidance
    route_result = compute_smart_route(
        start_coord=user_location,
        end_coord=(best_shelter.latitude, best_shelter.longitude)
    )
    
    return {
        'status': 'success',
        'evacuation_route': route_result.get('geojson_route'),
        'route_coordinates': route_result.get('route_nodes', []),
        'nearest_shelter': {
            'id': best_shelter.id,
            'name': best_shelter.name if hasattr(best_shelter, 'name') else 'Shelter',
            'latitude': best_shelter.latitude,
            'longitude': best_shelter.longitude,
            'distance_km': round(best_distance, 2)
        },
        'distance_km': round(best_distance, 2),
        'eta_minutes': round(best_distance * 1.5, 0)  # Approx 40km/h average speed
    }


def check_user_in_danger_zone(user_location, disaster, radius_km=5):
    """
    Check if user is within danger radius of a disaster.
    Returns True if user should be alerted.
    """
    distance = haversine(
        user_location[0], user_location[1],
        disaster.latitude, disaster.longitude
    )
    return distance <= radius_km
