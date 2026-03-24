from rest_framework import serializers
from .models import UserLocation, UserAlertPreference, DisasterAlert, EvacuationZone


class UserLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLocation
        fields = ['id', 'latitude', 'longitude', 'accuracy', 'last_updated', 'is_active']
        read_only_fields = ['id', 'last_updated']


class UserAlertPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAlertPreference
        fields = ['id', 'alert_radius_km', 'min_severity', 'disaster_types', 'alert_enabled', 'created_at']
        read_only_fields = ['id', 'created_at']


class DisasterAlertSerializer(serializers.ModelSerializer):
    disaster_type = serializers.SerializerMethodField()
    disaster_severity = serializers.SerializerMethodField()
    disaster_location = serializers.SerializerMethodField()
    
    class Meta:
        model = DisasterAlert
        fields = [
            'id', 'disaster', 'disaster_type', 'disaster_severity', 'disaster_location',
            'alert_sent_at', 'alert_viewed_at', 'status', 'distance_km', 'evacuation_route'
        ]
        read_only_fields = ['id', 'alert_sent_at', 'alert_viewed_at', 'evacuation_route']

    def get_disaster_type(self, obj):
        return obj.disaster.disaster_type

    def get_disaster_severity(self, obj):
        return obj.disaster.severity

    def get_disaster_location(self, obj):
        return {
            'latitude': obj.disaster.latitude,
            'longitude': obj.disaster.longitude
        }


class EvacuationZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvacuationZone
        fields = ['id', 'disaster', 'zone_number', 'radius_km_from', 'radius_km_to', 
                  'evacuation_order_issued_at', 'estimated_users_affected']
