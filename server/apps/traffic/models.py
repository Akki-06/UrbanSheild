from django.db import models


class TrafficIncident(models.Model):

    latitude = models.FloatField()
    longitude = models.FloatField()

    congestion_level = models.IntegerField()  # 1-10
    is_blocked = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Congestion {self.congestion_level} - Blocked: {self.is_blocked}"
    
class RoadSegment(models.Model):
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    congestion_score = models.IntegerField(default=1)