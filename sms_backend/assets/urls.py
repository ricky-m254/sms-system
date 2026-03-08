from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetCategoryViewSet,
    AssetViewSet,
    AssetAssignmentViewSet,
    AssetMaintenanceRecordViewSet,
    AssetsDashboardView
)

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet, basename='asset-category')
router.register(r'assignments', AssetAssignmentViewSet, basename='asset-assignment')
router.register(r'maintenance', AssetMaintenanceRecordViewSet, basename='asset-maintenance')
router.register(r'', AssetViewSet, basename='asset')

urlpatterns = [
    path('dashboard/', AssetsDashboardView.as_view(), name='assets-dashboard'),
    path('', include(router.urls)),
]
