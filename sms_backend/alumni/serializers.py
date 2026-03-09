from rest_framework import serializers
from .models import AlumniProfile, AlumniEvent, AlumniEventAttendee

class AlumniProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumniProfile
        fields = '__all__'

class AlumniEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumniEvent
        fields = '__all__'

class AlumniEventAttendeeSerializer(serializers.ModelSerializer):
    alumni_name = serializers.CharField(source='alumni.first_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = AlumniEventAttendee
        fields = '__all__'
