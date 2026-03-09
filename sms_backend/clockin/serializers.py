from rest_framework import serializers
from .models import BiometricDevice, SchoolShift, PersonRegistry, ClockEvent

class BiometricDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricDevice
        fields = '__all__'
        read_only_fields = ('api_key', 'created_at')

    def create(self, validated_data):
        import uuid
        if 'api_key' not in validated_data:
            validated_data['api_key'] = str(uuid.uuid4())
        return super().create(validated_data)

class SchoolShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolShift
        fields = '__all__'

class PersonRegistrySerializer(serializers.ModelSerializer):
    admission_number = serializers.ReadOnlyField(source='student.admission_number')
    employee_id = serializers.ReadOnlyField(source='employee.employee_id')

    class Meta:
        model = PersonRegistry
        fields = '__all__'

class ClockEventSerializer(serializers.ModelSerializer):
    person_info = PersonRegistrySerializer(source='person', read_only=True)
    device_name = serializers.ReadOnlyField(source='device.name')

    class Meta:
        model = ClockEvent
        fields = '__all__'
