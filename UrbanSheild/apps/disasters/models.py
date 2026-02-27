from django.db import models
from django.core.mail import send_mail

from apps.core.utils import haversine
from apps.authorities.models import Authority


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
                send_mail(
                    subject=f"Emergency Alert - {self.disaster_type.upper()}",
                    message=f"""
Disaster Type: {self.disaster_type}
Severity: {self.severity}
Location: {self.latitude}, {self.longitude}
Status: CRITICAL

Cluster detected in region.
Immediate action required.
""",
                    from_email=None,
                    recipient_list=[nearest_authority.email],
                )

                EscalationLog.objects.create(
                    disaster=self,
                    authority_name=nearest_authority.name,
                    email_sent=True
                )


class EscalationLog(models.Model):
    disaster = models.ForeignKey(Disaster, on_delete=models.CASCADE)
    authority_name = models.CharField(max_length=255)
    email_sent = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalation for {self.disaster.disaster_type}"