from rest_framework import serializers
from .models import AssetCategory, Asset, AssetAssignment, AssetMaintenanceRecord, AssetDepreciation

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Asset
        fields = '__all__'

class AssetAssignmentSerializer(serializers.ModelSerializer):
    asset_name = serializers.ReadOnlyField(source='asset.name')
    employee_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetAssignment
        fields = '__all__'

    def get_employee_name(self, obj):
        if obj.assigned_to_employee:
            return f"{obj.assigned_to_employee.first_name} {obj.assigned_to_employee.last_name}"
        return None

    def get_student_name(self, obj):
        if obj.assigned_to_student:
            return f"{obj.assigned_to_student.first_name} {obj.assigned_to_student.last_name}"
        return None

class AssetMaintenanceRecordSerializer(serializers.ModelSerializer):
    asset_name = serializers.ReadOnlyField(source='asset.name')

    class Meta:
        model = AssetMaintenanceRecord
        fields = '__all__'

class AssetDepreciationSerializer(serializers.ModelSerializer):
    asset_code = serializers.ReadOnlyField(source='asset.asset_code')
    asset_name = serializers.ReadOnlyField(source='asset.name')

    class Meta:
        model = AssetDepreciation
        fields = '__all__'
