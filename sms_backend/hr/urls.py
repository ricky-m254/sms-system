from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StaffRefView, StaffViewSet

router = DefaultRouter()
router.register(r"staff", StaffViewSet, basename="hr_staff")

urlpatterns = [
    path("ref/staff/", StaffRefView.as_view(), name="hr_ref_staff"),
    path("", include(router.urls)),
]
