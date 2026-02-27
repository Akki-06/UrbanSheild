from django.core.management.base import BaseCommand
from django.utils import timezone
import random
from apps.traffic.models import TrafficIncident

class Command(BaseCommand):
    help = 'Generate simulated traffic data across Uttarakhand'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of traffic incidents to generate'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing traffic data before generating new'
        )

    def handle(self, *args, **options):
        if options['clear']:
            TrafficIncident.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all existing traffic data'))

        count = options['count']

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
            
            # Okhmath Routes
            {'name': 'Chopal - Main Road', 'lat': 30.2000, 'lon': 78.8000, 'radius': 0.03},
            
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

        created_count = 0

        # Generate traffic incidents
        for _ in range(count):
            # Pick a random zone
            zone = random.choice(traffic_zones)
            
            # Generate random coordinates within the zone's radius
            lat = zone['lat'] + random.uniform(-zone['radius'], zone['radius'])
            lon = zone['lon'] + random.uniform(-zone['radius'], zone['radius'])
            
            # Skew congestion towards higher values to simulate real traffic patterns
            # More severe congestion during certain hours
            random_val = random.random()
            if random_val < 0.2:  # 20% high congestion
                congestion_level = random.randint(8, 10)
            elif random_val < 0.4:  # 20% medium-high congestion
                congestion_level = random.randint(5, 7)
            elif random_val < 0.6:  # 20% medium congestion
                congestion_level = random.randint(3, 5)
            else:  # 40% low congestion
                congestion_level = random.randint(1, 3)
            
            # 5% chance of blocked road
            is_blocked = random.choice([True] * 5 + [False] * 95) == True

            TrafficIncident.objects.create(
                latitude=lat,
                longitude=lon,
                congestion_level=congestion_level,
                is_blocked=is_blocked
            )
            created_count += 1

        # Print summary
        self.stdout.write(self.style.SUCCESS(f'✅ Created {created_count} traffic incidents'))
        
        total = TrafficIncident.objects.count()
        self.stdout.write(f'📊 Total traffic data points: {total}')
        
        # Show distribution
        high = TrafficIncident.objects.filter(congestion_level__gte=8).count()
        medium = TrafficIncident.objects.filter(congestion_level__gte=5, congestion_level__lt=8).count()
        low = TrafficIncident.objects.filter(congestion_level__lt=5).count()
        blocked = TrafficIncident.objects.filter(is_blocked=True).count()
        
        self.stdout.write(f'\n📍 Congestion Distribution:')
        self.stdout.write(f'  🔴 Critical (8-10): {high}')
        self.stdout.write(f'  🟠 Medium (5-7): {medium}')
        self.stdout.write(f'  🟡 Low (1-4): {low}')
        self.stdout.write(f'  🚫 Blocked Roads: {blocked}')
