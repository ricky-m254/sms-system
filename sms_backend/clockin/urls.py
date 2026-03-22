from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BiometricDeviceViewSet, 
    SchoolShiftViewSet, 
    PersonRegistryViewSet, 
    ClockEventViewSet,
    ScanView,
    DashboardView,
    RealtimeView,
    DeviceDiscoverView,
)

router = DefaultRouter()
router.register(r'devices', BiometricDeviceViewSet)
router.register(r'registry', PersonRegistryViewSet)
router.register(r'shifts', SchoolShiftViewSet)
router.register(r'events', ClockEventViewSet)

urlpatterns = [
    path('scan/', ScanView.as_view()),
    path('kiosk/scan/', ScanView.as_view()),
    path('dashboard/', DashboardView.as_view()),
    path('realtime/', RealtimeView.as_view()),
    path('devices/discover/', DeviceDiscoverView.as_view()),
    path('', include(router.urls)),
]
