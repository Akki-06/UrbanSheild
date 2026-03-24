from django.core.management.base import BaseCommand
from apps.disasters.models import Disaster
import random
from datetime import timedelta, datetime

# Helper to generate random lat/lon across India
INDIA_LAT_RANGE = (8.0, 37.0)
INDIA_LON_RANGE = (68.0, 98.0)

from apps.core.utils import UTTARAKHAND_BOUNDS, is_within_uttarakhand

class Command(BaseCommand):
    help = 'Generate random disaster records for testing and demonstration'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=30,
                            help='Number of disaster points to create')
        parser.add_argument('--clear', action='store_true',
                            help='Delete existing disasters before creating new ones')
        parser.add_argument('--anywhere', action='store_true',
                            help='Allow disasters anywhere in India instead of restricting to Uttarakhand')

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']
        anywhere = options.get('anywhere', False)

        if clear:
            Disaster.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all existing disaster data'))

        types = ['flood', 'fire', 'earthquake', 'cyclone', 'heatwave']

        severity_distribution = [0,1,2,3,4,5,6,7,8,9,10]

        for i in range(count):
            if anywhere:
                lat = random.uniform(*INDIA_LAT_RANGE)
                lon = random.uniform(*INDIA_LON_RANGE)
            else:
                # keep inside Uttarakhand bounds
                lat = random.uniform(UTTARAKHAND_BOUNDS['min_lat'], UTTARAKHAND_BOUNDS['max_lat'])
                lon = random.uniform(UTTARAKHAND_BOUNDS['min_lon'], UTTARAKHAND_BOUNDS['max_lon'])
            dtype = random.choice(types)
            severity = random.choice(severity_distribution)
            confidence = random.uniform(0.5, 1.0)
            status = random.choice(['active', 'resolved'])
            created_at = datetime.now() - timedelta(days=random.randint(0, 30))

            # skip any generated point accidentally outside if anywhere=False
            if not anywhere and not is_within_uttarakhand(lat, lon):
                # clamp
                lat = max(min(lat, UTTARAKHAND_BOUNDS['max_lat']), UTTARAKHAND_BOUNDS['min_lat'])
                lon = max(min(lon, UTTARAKHAND_BOUNDS['max_lon']), UTTARAKHAND_BOUNDS['min_lon'])

            Disaster.objects.create(
                latitude=lat,
                longitude=lon,
                disaster_type=dtype,
                severity=severity,
                confidence_score=confidence,
                status=status,
                created_at=created_at
            )

        total = Disaster.objects.count()
        self.stdout.write(self.style.SUCCESS(f'✅ Generated {count} disasters'))
        self.stdout.write(self.style.SUCCESS(f'📊 Total disaster points: {total}'))
