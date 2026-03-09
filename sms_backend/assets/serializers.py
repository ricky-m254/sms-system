from rest_framework import serializers
from .models import AssetCategory, Asset, AssetAssignment, AssetMaintenanceRecord, AssetDepreciation

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ('asset_code',)

class AssetAssignmentSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_code = serializers.CharField(source='asset.asset_code', read_only=True)

    class Meta:
        model = AssetAssignment
        fields = '__all__'

class AssetMaintenanceRecordSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_code = serializers.CharField(source='asset.asset_code', read_only=True)

    class Meta:
        model = AssetMaintenanceRecord
        fields = '__all__'


class AssetDepreciationSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_code = serializers.CharField(source='asset.asset_code', read_only=True)

    class Meta:
        model = AssetDepreciation
        fields = '__all__'
