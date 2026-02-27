from rest_framework import serializers
from .models import TrafficIncident


class TrafficIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficIncident
        fields = '__all__'