from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from school.permissions import HasModuleAccess
from school.permissions import IsSchoolAdmin
from .models import Staff
from .serializers import StaffSerializer
from .events import staff_created, staff_updated, staff_deactivated


class StaffRefView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "HR"

    def get(self, request):
        data = Staff.objects.values(
            "id", "employee_id", "first_name", "last_name",
            "role", "phone", "is_active"
        ).order_by("employee_id")
        return Response(list(data), status=status.HTTP_200_OK)


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.filter(is_active=True)
    serializer_class = StaffSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "HR"

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        staff_deactivated.send(
            sender=StaffViewSet,
            staff_id=instance.id,
            employee_id=instance.employee_id
        )

    def perform_create(self, serializer):
        staff = serializer.save()
        staff_created.send(
            sender=StaffViewSet,
            staff_id=staff.id,
            employee_id=staff.employee_id
        )

    def perform_update(self, serializer):
        staff = serializer.save()
        staff_updated.send(
            sender=StaffViewSet,
            staff_id=staff.id,
            employee_id=staff.employee_id
        )
