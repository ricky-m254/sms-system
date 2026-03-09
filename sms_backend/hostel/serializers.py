from rest_framework import serializers
from .models import Dormitory, BedSpace, HostelAllocation, HostelAttendance, HostelLeave

class DormitorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Dormitory
        fields = '__all__'

class BedSpaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BedSpace
        fields = '__all__'

class HostelAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelAllocation
        fields = '__all__'

class HostelAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelAttendance
        fields = '__all__'

class HostelLeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelLeave
        fields = '__all__'
