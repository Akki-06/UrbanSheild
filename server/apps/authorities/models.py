from django.db import models


class Authority(models.Model):

    AUTHORITY_TYPES = [
        ('ndrf', 'NDRF'),
        ('police', 'Police'),
        ('fire', 'Fire Department'),
        ('medical', 'Medical Emergency'),
        ('sdrf', 'SDRF'),
    ]

    name = models.CharField(max_length=255)
    authority_type = models.CharField(max_length=20, choices=AUTHORITY_TYPES)

    latitude = models.FloatField()
    longitude = models.FloatField()

    phone = models.CharField(max_length=20)
    email = models.EmailField()

    state = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.authority_type})"