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
    student_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PersonRegistry
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return None

    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}"
        return None

class ClockEventSerializer(serializers.ModelSerializer):
    person_display_name = serializers.ReadOnlyField(source='person.display_name')
    device_name = serializers.ReadOnlyField(source='device.name')

    class Meta:
        model = ClockEvent
        fields = '__all__'
