import logging

from django.db import models
from django.core.mail import send_mail
from django.conf import settings

from apps.core.utils import haversine
from apps.authorities.models import Authority

logger = logging.getLogger(__name__)


class Disaster(models.Model):

    DISASTER_TYPES = [
        ('flood', 'Flood'),
        ('fire', 'Fire'),
        ('earthquake', 'Earthquake'),
        ('cyclone', 'Cyclone'),
        ('heatwave', 'Heatwave'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('critical', 'Critical'),
        ('resolved', 'Resolved'),
        ('archived', 'Archived'),
    ]

    disaster_type = models.CharField(max_length=20, choices=DISASTER_TYPES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    severity = models.IntegerField()
    confidence_score = models.FloatField(default=1.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.disaster_type} - {self.status}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # -----------------------------
        # AUTO MARK CRITICAL (HIGH SEVERITY)
        # -----------------------------
        if self.severity >= 8 and self.status != 'critical':
            self.status = 'critical'
            super().save(update_fields=['status'])

        # -----------------------------
        # CLUSTER DETECTION LOGIC
        # -----------------------------
        from django.utils import timezone
        from datetime import timedelta

        recent_time = timezone.now() - timedelta(hours=6)

        nearby_reports = Disaster.objects.filter(
            disaster_type=self.disaster_type,
            created_at__gte=recent_time
        )

        cluster_count = 0

        for report in nearby_reports:
            distance = haversine(
                self.latitude,
                self.longitude,
                report.latitude,
                report.longitude
            )
            if distance <= 3:  # within 3 km
                cluster_count += 1

        if cluster_count >= 5:
            Disaster.objects.filter(
                disaster_type=self.disaster_type,
                created_at__gte=recent_time
            ).update(status='critical')

        # -----------------------------
        # AUTO ESCALATION (ONLY ONCE)
        # -----------------------------
        if self.status == 'critical' and not EscalationLog.objects.filter(disaster=self).exists():

            nearest_authority = None
            min_distance = float('inf')

            for authority in Authority.objects.all():
                distance = haversine(
                    self.latitude,
                    self.longitude,
                    authority.latitude,
                    authority.longitude
                )
                if distance < min_distance:
                    min_distance = distance
                    nearest_authority = authority

            if nearest_authority:
                email_sent = False
                try:
                    send_mail(
                        subject=f"Emergency Alert - {self.disaster_type.upper()}",
                        message=(
                            f"Disaster Type: {self.disaster_type}\n"
                            f"Severity: {self.severity}\n"
                            f"Location: {self.latitude}, {self.longitude}\n"
                            f"Status: CRITICAL\n\n"
                            f"Cluster detected in region. Immediate action required."
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[nearest_authority.email],
                        fail_silently=False,
                    )
                    email_sent = True
                except Exception as exc:
                    logger.error(
                        "Auto-escalation email failed for disaster %s: %s",
                        self.pk, exc
                    )

                EscalationLog.objects.create(
                    disaster=self,
                    authority_name=nearest_authority.name,
                    email_sent=email_sent,
                )


class EscalationLog(models.Model):
    disaster = models.ForeignKey(Disaster, on_delete=models.CASCADE)
    authority_name = models.CharField(max_length=255)
    email_sent = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalation for {self.disaster.disaster_type}"