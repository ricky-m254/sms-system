from rest_framework import serializers
from .models import MaintenanceCategory, MaintenanceRequest, MaintenanceChecklist

class MaintenanceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceCategory
        fields = '__all__'

class MaintenanceChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceChecklist
        fields = '__all__'

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.username', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.first_name', read_only=True) # hr.Employee has first_name/last_name
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    checklist_items = MaintenanceChecklistSerializer(many=True, read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
