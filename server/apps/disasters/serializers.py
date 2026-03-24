from rest_framework import serializers
from .models import Disaster, EscalationLog


class DisasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disaster
        fields = '__all__'


class EscalationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationLog
        fields = '__all__'