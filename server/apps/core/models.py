from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserLocation(models.Model):
    """Real-time GPS location tracking for users"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='current_location')
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(null=True, blank=True)  # in meters
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} at ({self.latitude}, {self.longitude})"

    class Meta:
        verbose_name_plural = "User Locations"


class UserAlertPreference(models.Model):
    """User preferences for disaster alerts"""
    DISASTER_CHOICES = [
        ('flood', 'Flood'),
        ('fire', 'Fire'),
        ('earthquake', 'Earthquake'),
        ('cyclone', 'Cyclone'),
        ('heatwave', 'Heatwave'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='alert_preference')
    alert_radius_km = models.IntegerField(default=5)  # Notification range
    min_severity = models.IntegerField(default=5)  # Only alert for severity >= this
    disaster_types = models.JSONField(default=list, help_text="List of disaster types to alert for")
    alert_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.alert_radius_km}km radius"


class DisasterAlert(models.Model):
    """Notification record for disasters sent to users"""
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('action_taken', 'Action Taken'),
        ('dismissed', 'Dismissed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disaster_alerts')
    disaster = models.ForeignKey('disasters.Disaster', on_delete=models.CASCADE, related_name='user_alerts')
    alert_sent_at = models.DateTimeField(auto_now_add=True)
    alert_viewed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    distance_km = models.FloatField()  # Distance from user to disaster
    evacuation_route = models.JSONField(null=True, blank=True)  # Computed route data

    def __str__(self):
        return f"Alert: {self.user.username} - {self.disaster.disaster_type}"

    class Meta:
        unique_together = ('user', 'disaster')
        ordering = ['-alert_sent_at']


class EvacuationZone(models.Model):
    """Predefined evacuation zones and priority order"""
    disaster = models.ForeignKey('disasters.Disaster', on_delete=models.CASCADE, related_name='evacuation_zones')
    zone_number = models.IntegerField()  # Zone 1 = highest priority (innermost)
    radius_km_from = models.FloatField()  # Inner radius
    radius_km_to = models.FloatField()  # Outer radius
    evacuation_order_issued_at = models.DateTimeField(null=True, blank=True)
    estimated_users_affected = models.IntegerField(default=0)

    def __str__(self):
        return f"Zone {self.zone_number} - Disaster {self.disaster.id}"

    class Meta:
        unique_together = ('disaster', 'zone_number')
        ordering = ['disaster', 'zone_number']
