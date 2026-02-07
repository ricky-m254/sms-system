from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from school.permissions import HasModuleAccess
from .models import AcademicYear, Term, SchoolClass


class AcademicYearsRefView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ACADEMICS"

    def get(self, request):
        data = AcademicYear.objects.values(
            "id", "name", "start_date", "end_date", "is_active"
        ).order_by("start_date")
        return Response(list(data), status=status.HTTP_200_OK)


class TermsRefView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ACADEMICS"

    def get(self, request):
        data = Term.objects.values(
            "id", "name", "start_date", "end_date", "academic_year_id", "is_active"
        ).order_by("start_date")
        return Response(list(data), status=status.HTTP_200_OK)


class ClassesRefView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ACADEMICS"

    def get(self, request):
        data = SchoolClass.objects.values(
            "id", "name", "stream", "academic_year_id", "is_active"
        ).order_by("name")
        return Response(list(data), status=status.HTTP_200_OK)
