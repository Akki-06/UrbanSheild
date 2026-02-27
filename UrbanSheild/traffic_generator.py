"""
Direct Traffic Data Generator for Django Shell
Usage: python manage.py shell < traffic_generator.py
Or in Django shell: exec(open('traffic_generator.py').read())
"""

import random
from apps.traffic.models import TrafficIncident

# Clear existing data
TrafficIncident.objects.all().delete()
print("🗑️  Cleared existing traffic data\n")

# Major cities and highways in Uttarakhand with their approximate coordinates
traffic_zones = [
    # National Highway 119 (Delhi to Dehradun)
    {'name': 'NH119 - Saharanpur', 'lat': 29.9685, 'lon': 77.5619, 'radius': 0.03},
    {'name': 'NH119 - Roorkee Junction', 'lat': 29.8564, 'lon': 77.8834, 'radius': 0.02},
    {'name': 'NH119 - Mandi Bypass', 'lat': 29.5891, 'lon': 78.0123, 'radius': 0.04},
    
    # Dehradun City Roads
    {'name': 'Dehradun - Clock Tower', 'lat': 30.3165, 'lon': 78.0322, 'radius': 0.05},
    {'name': 'Dehradun - Rajpur Road', 'lat': 30.3400, 'lon': 78.0500, 'radius': 0.03},
    {'name': 'Dehradun - Survey Road', 'lat': 30.3200, 'lon': 78.0200, 'radius': 0.03},
    
    # National Highway 7 (Dehradun to Rishikesh)
    {'name': 'NH7 - Rishikesh', 'lat': 30.1937, 'lon': 78.1644, 'radius': 0.04},
    {'name': 'NH7 - Haridwar', 'lat': 29.9457, 'lon': 78.0123, 'radius': 0.05},
    
    # State Highway 1 (Mussoorie Road)
    {'name': 'SH1 - Mussoorie Bypass', 'lat': 30.4610, 'lon': 78.0775, 'radius': 0.03},
    {'name': 'SH1 - Doon Valley', 'lat': 30.2245, 'lon': 78.1234, 'radius': 0.04},
    
    # Uttarkashi Routes
    {'name': 'Uttarkashi - Main Road', 'lat': 30.7267, 'lon': 78.7597, 'radius': 0.05},
    
    # Nainital Routes
    {'name': 'Nainital - Main Road', 'lat': 29.3803, 'lon': 79.4504, 'radius': 0.04},
    {'name': 'Nainital - Lake Road', 'lat': 29.3900, 'lon': 79.4600, 'radius': 0.03},
    
    # Almora Routes
    {'name': 'Almora - Main Road', 'lat': 29.5941, 'lon': 79.6414, 'radius': 0.03},
    
    # Pithoragarh Routes
    {'name': 'Pithoragarh - Main Road', 'lat': 29.5854, 'lon': 80.2717, 'radius': 0.04},
    
    # Bageshwar Routes
    {'name': 'Bageshwar - Main Road', 'lat': 29.8262, 'lon': 79.9122, 'radius': 0.03},
    
    # Pauri Routes
    {'name': 'Pauri - Main Road', 'lat': 30.1937, 'lon': 78.7717, 'radius': 0.03},
    
    # Rudraprayag Routes
    {'name': 'Rudraprayag - Main Road', 'lat': 30.2829, 'lon': 78.7714, 'radius': 0.03},
    
    # Chamoli Routes
    {'name': 'Chamoli - Main Road', 'lat': 30.5240, 'lon': 79.2667, 'radius': 0.04},
    
    # Tehri Routes
    {'name': 'Tehri - Main Road', 'lat': 30.3831, 'lon': 78.5019, 'radius': 0.03},
    
    # US Nagar (Bazpur)
    {'name': 'Bazpur - Main Road', 'lat': 28.9800, 'lon': 79.1200, 'radius': 0.03},
    
    # Udham Singh Nagar
    {'name': 'Udham Singh Nagar - Main Road', 'lat': 28.9800, 'lon': 79.4500, 'radius': 0.04},
]

# Generate 60 traffic incidents
print("🚗 Generating traffic data across Uttarakhand...\n")

for i in range(60):
    # Pick a random zone
    zone = random.choice(traffic_zones)
    
    # Generate random coordinates within the zone's radius
    lat = zone['lat'] + random.uniform(-zone['radius'], zone['radius'])
    lon = zone['lon'] + random.uniform(-zone['radius'], zone['radius'])
    
    # Skew congestion towards higher values to simulate real traffic patterns
    random_val = random.random()
    if random_val < 0.2:  # 20% high congestion
        congestion_level = random.randint(8, 10)
        severity = '🔴 Critical'
    elif random_val < 0.4:  # 20% medium-high congestion
        congestion_level = random.randint(5, 7)
        severity = '🟠 Medium-High'
    elif random_val < 0.6:  # 20% medium congestion
        congestion_level = random.randint(3, 5)
        severity = '🟡 Medium'
    else:  # 40% low congestion
        congestion_level = random.randint(1, 3)
        severity = '🟢 Low'
    
    # 5% chance of blocked road
    is_blocked = random.random() < 0.05
    blocked_status = '🚫 BLOCKED' if is_blocked else '✓ Open'
    
    TrafficIncident.objects.create(
        latitude=lat,
        longitude=lon,
        congestion_level=congestion_level,
        is_blocked=is_blocked
    )
    
    print(f"{i+1}. {zone['name']:30} | Level: {congestion_level}/10 | {severity:20} | {blocked_status}")

# Print summary
print("\n" + "="*80)
total = TrafficIncident.objects.count()
print(f"\n✅ Successfully created {total} traffic data points!\n")

# Show statistics
high = TrafficIncident.objects.filter(congestion_level__gte=8).count()
medium_high = TrafficIncident.objects.filter(congestion_level__gte=5, congestion_level__lt=8).count()
medium = TrafficIncident.objects.filter(congestion_level__gte=3, congestion_level__lt=5).count()
low = TrafficIncident.objects.filter(congestion_level__lt=3).count()
blocked = TrafficIncident.objects.filter(is_blocked=True).count()

print(f"📊 Congestion Distribution:")
print(f"  🔴 Critical (8-10): {high} points")
print(f"  🟠 Medium-High (5-7): {medium_high} points")
print(f"  🟡 Medium (3-5): {medium} points")
print(f"  🟢 Low (1-2): {low} points")
print(f"  🚫 Blocked Roads: {blocked} points")
print(f"\n✨ Heatmap will now display with colors based on congestion!")
print(f"🌐 Visit http://localhost:5173 to see the traffic heatmap\n")
