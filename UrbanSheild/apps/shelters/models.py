from django.db import models


class Shelter(models.Model):

    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()

    capacity = models.IntegerField()
    current_occupancy = models.IntegerField(default=0)

    contact = models.CharField(max_length=20)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name