from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.disasters.models import Disaster


class Command(BaseCommand):
    help = "Archive old disasters automatically"

    def handle(self, *args, **kwargs):
        now = timezone.now()

        # Archive active disasters older than 24 hours
        cutoff_active = now - timedelta(hours=24)

        active_updated = Disaster.objects.filter(
            status='active',
            created_at__lte=cutoff_active
        ).update(status='archived')

        # Archive critical disasters older than 48 hours
        cutoff_critical = now - timedelta(hours=48)

        critical_updated = Disaster.objects.filter(
            status='critical',
            created_at__lte=cutoff_critical
        ).update(status='archived')

        self.stdout.write(
            self.style.SUCCESS(
                f"Archived {active_updated + critical_updated} old disasters."
            )
        )