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
    DahuaEventView,
    DahuaSyncView,
)

router = DefaultRouter()
router.register(r'devices',  BiometricDeviceViewSet)
router.register(r'registry', PersonRegistryViewSet)
router.register(r'shifts',   SchoolShiftViewSet)
router.register(r'events',   ClockEventViewSet)

urlpatterns = [
    # Generic scan (existing)
    path('scan/',             ScanView.as_view()),
    path('kiosk/scan/',       ScanView.as_view()),

    # Dahua ASI6214S native endpoints
    path('dahua/event/',                  DahuaEventView.as_view()),   # HTTP Upload webhook
    path('dahua/<int:device_id>/sync/',   DahuaSyncView.as_view()),    # Pull records from device

    # Dashboard / realtime
    path('dashboard/',        DashboardView.as_view()),
    path('realtime/',         RealtimeView.as_view()),

    # Device discovery
    path('devices/discover/', DeviceDiscoverView.as_view()),

    path('', include(router.urls)),
]
