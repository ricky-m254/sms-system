from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from school.permissions import HasModuleAccess
from .models import AssetCategory, Asset, AssetAssignment, AssetMaintenanceRecord
from .serializers import (
    AssetCategorySerializer,
    AssetSerializer,
    AssetAssignmentSerializer,
    AssetMaintenanceRecordSerializer
)

class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all().order_by('name')
    serializer_class = AssetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by('-created_at')
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"
    filterset_fields = ['status', 'category']

    def perform_create(self, serializer):
        # Auto-generate asset_code: AST-YYYY-XXXXX
        year = timezone.now().year
        count = Asset.objects.filter(created_at__year=year).count() + 1
        asset_code = f"AST-{year}-{count:05d}"
        serializer.save(asset_code=asset_code)

class AssetAssignmentViewSet(viewsets.ModelViewSet):
    queryset = AssetAssignment.objects.all().order_by('-assigned_date')
    serializer_class = AssetAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"
    filterset_fields = ['asset', 'status']

class AssetMaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AssetMaintenanceRecord.objects.all().order_by('-scheduled_date')
    serializer_class = AssetMaintenanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"
    filterset_fields = ['asset', 'status']

class AssetsDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"

    def get(self, request):
        total_assets = Asset.objects.count()
        active = Asset.objects.filter(status='Active').count()
        in_repair = Asset.objects.filter(status='In Repair').count()
        retired = Asset.objects.filter(status='Retired').count()
        disposed = Asset.objects.filter(status='Disposed').count()
        
        total_value = Asset.objects.filter(status='Active').aggregate(Sum('current_value'))['current_value__sum'] or 0
        categories_count = AssetCategory.objects.count()
        assignments_active = AssetAssignment.objects.filter(status='Active').count()
        maintenance_pending = AssetMaintenanceRecord.objects.filter(status='Pending').count()

        return Response({
            "total_assets": total_assets,
            "active": active,
            "in_repair": in_repair,
            "retired": retired,
            "disposed": disposed,
            "total_value": total_value,
            "categories_count": categories_count,
            "assignments_active": assignments_active,
            "maintenance_pending": maintenance_pending
        }, status=status.HTTP_200_OK)
