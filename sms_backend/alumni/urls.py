from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlumniProfileViewSet, AlumniEventViewSet, AlumniEventAttendeeViewSet, AlumniDashboardView

router = DefaultRouter()
router.register('profiles', AlumniProfileViewSet)
router.register('events', AlumniEventViewSet)
router.register('attendees', AlumniEventAttendeeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', AlumniDashboardView.as_view(), name='alumni-dashboard'),
]
