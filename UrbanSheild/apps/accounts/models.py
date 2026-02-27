from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ('user', 'User'),
        ('regional_admin', 'Regional Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    trust_score = models.IntegerField(default=50)
    home_latitude = models.FloatField(null=True, blank=True)
    home_longitude = models.FloatField(null=True, blank=True)
    last_report_time = models.DateTimeField(null=True, blank=True)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    region = models.CharField(max_length=100, null=True, blank=True)
    admin_key = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"