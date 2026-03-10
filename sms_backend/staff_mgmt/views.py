from datetime import timedelta
from django.db.models import Avg, Count, Q
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from school.permissions import HasModuleAccess
from school.models import Department as SchoolDepartment
from .models import (
    StaffMember,
    StaffQualification,
    StaffEmergencyContact,
    StaffDepartment,
    StaffRole,
    StaffAssignment,
    StaffAttendance,
    StaffObservation,
    StaffAppraisal,
    StaffDocument,
)
from .serializers import (
    StaffMemberSerializer,
    StaffQualificationSerializer,
    StaffEmergencyContactSerializer,
    StaffDepartmentSerializer,
    StaffRoleSerializer,
    StaffAssignmentSerializer,
    StaffAttendanceSerializer,
    StaffObservationSerializer,
    StaffAppraisalSerializer,
    StaffDocumentSerializer,
)


class StaffModuleAccessMixin:
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STAFF"


def _generate_staff_id() -> str:
    year = timezone.now().year
    prefix = f"STF-{year}-"
    last = (
        StaffMember.objects.filter(staff_id__startswith=prefix)
        .order_by("-staff_id")
        .values_list("staff_id", flat=True)
        .first()
    )
    if not last:
        seq = 1
    else:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (TypeError, ValueError, IndexError):
            seq = StaffMember.objects.count() + 1
    return f"{prefix}{seq:03d}"


class StaffMemberViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffMember.objects.filter(is_active=True).order_by("staff_id", "first_name", "last_name")
    serializer_class = StaffMemberSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get("department")
        role = self.request.query_params.get("role")
        employment_type = self.request.query_params.get("employment_type")
        status_value = self.request.query_params.get("status")
        staff_type = self.request.query_params.get("staff_type")
        if department:
            qs = qs.filter(assignments__department_id=department, assignments__is_active=True)
        if role:
            qs = qs.filter(assignments__role_id=role, assignments__is_active=True)
        if employment_type:
            qs = qs.filter(employment_type=employment_type)
        if status_value:
            qs = qs.filter(status=status_value)
        if staff_type:
            qs = qs.filter(staff_type=staff_type)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(staff_id=_generate_staff_id())

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([], status=status.HTTP_200_OK)
        qs = self.get_queryset().filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(middle_name__icontains=query)
            | Q(staff_id__icontains=query)
            | Q(email_work__icontains=query)
            | Q(email_personal__icontains=query)
            | Q(phone_primary__icontains=query)
            | Q(phone_alternate__icontains=query)
        )[:100]
        return Response(self.get_serializer(qs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        rows = self.get_queryset()
        lines = ["staff_id,full_name,staff_type,employment_type,status,email_work,phone_primary"]
        for row in rows:
            full_name = " ".join(part for part in [row.first_name, row.middle_name, row.last_name] if part).strip()
            lines.append(f"{row.staff_id},{full_name},{row.staff_type},{row.employment_type},{row.status},{row.email_work},{row.phone_primary}")
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="staff_directory.csv"'
        return response

    @action(detail=True, methods=["get"], url_path="badge")
    def badge(self, request, pk=None):
        staff = self.get_object()
        payload = f"STAFF BADGE\nID: {staff.staff_id}\nName: {staff.first_name} {staff.last_name}\nType: {staff.staff_type}\n"
        response = HttpResponse(payload, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="staff_badge_{staff.staff_id}.pdf"'
        return response

    @action(detail=True, methods=["get"], url_path="profile")
    def profile(self, request, pk=None):
        staff = self.get_object()
        data = {
            "staff": self.get_serializer(staff).data,
            "qualifications": StaffQualificationSerializer(staff.qualifications.filter(is_active=True), many=True).data,
            "emergency_contacts": StaffEmergencyContactSerializer(staff.emergency_contacts.filter(is_active=True), many=True).data,
            "assignments": StaffAssignmentSerializer(staff.assignments.filter(is_active=True), many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="qualifications")
    def qualifications(self, request, pk=None):
        if request.method.lower() == "get":
            rows = StaffQualification.objects.filter(staff_id=pk, is_active=True).order_by("-year_obtained", "-id")
            return Response(StaffQualificationSerializer(rows, many=True).data, status=status.HTTP_200_OK)
        serializer = StaffQualificationSerializer(data={**request.data, "staff": pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="emergency-contacts")
    def emergency_contacts(self, request, pk=None):
        if request.method.lower() == "get":
            rows = StaffEmergencyContact.objects.filter(staff_id=pk, is_active=True).order_by("-is_primary", "name")
            return Response(StaffEmergencyContactSerializer(rows, many=True).data, status=status.HTTP_200_OK)
        serializer = StaffEmergencyContactSerializer(data={**request.data, "staff": pk})
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()
        if contact.is_primary:
            StaffEmergencyContact.objects.filter(staff=contact.staff, is_active=True).exclude(pk=contact.pk).update(is_primary=False)
        return Response(StaffEmergencyContactSerializer(contact).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="documents")
    def documents(self, request, pk=None):
        rows = StaffDocument.objects.filter(staff_id=pk, is_active=True).order_by("-uploaded_at", "-id")
        return Response(StaffDocumentSerializer(rows, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="documents/upload")
    def documents_upload(self, request, pk=None):
        serializer = StaffDocumentSerializer(data={**request.data, "staff": pk})
        serializer.is_valid(raise_exception=True)
        file_obj = serializer.validated_data.get("file")
        size = getattr(file_obj, "size", 0)
        mime = getattr(file_obj, "content_type", "")
        serializer.save(uploaded_by=request.user, file_size=size, mime_type=mime)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StaffQualificationViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffQualification.objects.filter(is_active=True).order_by("-year_obtained", "-id")
    serializer_class = StaffQualificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class StaffEmergencyContactViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffEmergencyContact.objects.filter(is_active=True).order_by("-is_primary", "name")
    serializer_class = StaffEmergencyContactSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs

    def perform_create(self, serializer):
        contact = serializer.save()
        if contact.is_primary:
            StaffEmergencyContact.objects.filter(staff=contact.staff, is_active=True).exclude(pk=contact.pk).update(is_primary=False)

    def perform_update(self, serializer):
        contact = serializer.save()
        if contact.is_primary:
            StaffEmergencyContact.objects.filter(staff=contact.staff, is_active=True).exclude(pk=contact.pk).update(is_primary=False)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class StaffDepartmentViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffDepartment.objects.filter(is_active=True).order_by("name")
    serializer_class = StaffDepartmentSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        SchoolDepartment.objects.get_or_create(name=instance.name, defaults={"description": instance.description or ""})

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], url_path="staff")
    def staff(self, request, pk=None):
        assignments = StaffAssignment.objects.filter(department_id=pk, is_active=True).select_related("staff")
        staff_ids = [row.staff_id for row in assignments]
        rows = StaffMember.objects.filter(id__in=staff_ids, is_active=True).order_by("staff_id", "first_name")
        return Response(StaffMemberSerializer(rows, many=True).data, status=status.HTTP_200_OK)


class StaffRoleViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffRole.objects.filter(is_active=True).order_by("level", "name")
    serializer_class = StaffRoleSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class StaffAssignmentViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffAssignment.objects.filter(is_active=True).order_by("-effective_from", "-id")
    serializer_class = StaffAssignmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        department = self.request.query_params.get("department")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if department:
            qs = qs.filter(department_id=department)
        return qs

    def perform_create(self, serializer):
        assignment = serializer.save()
        if assignment.is_primary:
            StaffAssignment.objects.filter(staff=assignment.staff, is_active=True).exclude(pk=assignment.pk).update(is_primary=False)

    def perform_update(self, serializer):
        assignment = serializer.save()
        if assignment.is_primary:
            StaffAssignment.objects.filter(staff=assignment.staff, is_active=True).exclude(pk=assignment.pk).update(is_primary=False)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class StaffAttendanceViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.filter(is_active=True).order_by("-date", "-id")
    serializer_class = StaffAttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        department = self.request.query_params.get("department")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if department:
            qs = qs.filter(staff__assignments__department_id=department, staff__assignments__is_active=True)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.distinct()

    @action(detail=False, methods=["post"], url_path="mark")
    def mark(self, request):
        rows = request.data.get("records")
        if rows is None:
            rows = [request.data]
        if not isinstance(rows, list) or not rows:
            return Response({"error": "records[] or single payload is required."}, status=status.HTTP_400_BAD_REQUEST)
        created = 0
        updated = 0
        for row in rows:
            staff_id = row.get("staff")
            date = row.get("date")
            if not staff_id or not date:
                continue
            defaults = {
                "status": row.get("status", "Present"),
                "clock_in": row.get("clock_in"),
                "clock_out": row.get("clock_out"),
                "notes": row.get("notes", ""),
                "marked_by": request.user,
                "is_active": True,
            }
            _, was_created = StaffAttendance.objects.update_or_create(staff_id=staff_id, date=date, defaults=defaults)
            if was_created:
                created += 1
            else:
                updated += 1
        return Response({"message": "Attendance marked.", "created": created, "updated": updated}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        rows = self.get_queryset().filter(date__month=month, date__year=year)
        grouped = (
            rows.values("staff_id", "staff__staff_id", "staff__first_name", "staff__last_name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status__in=["Present", "Late", "Half-Day"])),
                absent=Count("id", filter=Q(status="Absent")),
                late=Count("id", filter=Q(status="Late")),
            )
            .order_by("staff__staff_id")
        )
        payload = []
        for row in grouped:
            total = row["total"] or 0
            present = row["present"] or 0
            payload.append(
                {
                    "staff": row["staff_id"],
                    "staff_id": row["staff__staff_id"],
                    "staff_name": f'{row["staff__first_name"]} {row["staff__last_name"]}'.strip(),
                    "attendance_rate": round((present / total) * 100, 2) if total else 0,
                    "present": present,
                    "absent": row["absent"] or 0,
                    "late": row["late"] or 0,
                }
            )
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="report")
    def report(self, request):
        return self.summary(request)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        summary = self.summary(request).data
        lines = ["staff_id,staff_name,attendance_rate,present,absent,late"]
        for row in summary:
            lines.append(f'{row["staff_id"]},{row["staff_name"]},{row["attendance_rate"]},{row["present"]},{row["absent"]},{row["late"]}')
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="staff_attendance.csv"'
        return response


class StaffObservationViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffObservation.objects.filter(is_active=True).order_by("-observation_date", "-id")
    serializer_class = StaffObservationSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        row = self.get_object()
        row.status = "Submitted"
        row.save(update_fields=["status"])
        return Response({"message": "Observation submitted."}, status=status.HTTP_200_OK)


class StaffAppraisalViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffAppraisal.objects.filter(is_active=True).order_by("-created_at", "-id")
    serializer_class = StaffAppraisalSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        row = self.get_object()
        row.status = "Approved"
        if not row.appraisal_date:
            row.appraisal_date = timezone.now().date()
        row.save(update_fields=["status", "appraisal_date"])
        return Response({"message": "Appraisal approved."}, status=status.HTTP_200_OK)


class StaffDocumentViewSet(StaffModuleAccessMixin, viewsets.ModelViewSet):
    queryset = StaffDocument.objects.filter(is_active=True).order_by("-uploaded_at", "-id")
    serializer_class = StaffDocumentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs

    def perform_create(self, serializer):
        file_obj = serializer.validated_data.get("file")
        size = getattr(file_obj, "size", 0)
        mime = getattr(file_obj, "content_type", "")
        serializer.save(uploaded_by=self.request.user, file_size=size, mime_type=mime)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        row = self.get_object()
        return FileResponse(row.file.open("rb"), as_attachment=True, filename=row.file.name.split("/")[-1])

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        row = self.get_object()
        row.verification_status = "Verified"
        row.verified_by = request.user
        row.save(update_fields=["verification_status", "verified_by"])
        return Response({"message": "Document verified."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="expiring")
    def expiring(self, request):
        days = int(request.query_params.get("days", 90))
        threshold = timezone.now().date() + timedelta(days=days)
        rows = self.get_queryset().filter(expiry_date__isnull=False, expiry_date__lte=threshold)
        return Response(self.get_serializer(rows, many=True).data, status=status.HTTP_200_OK)


class StaffReviewHistoryView(StaffModuleAccessMixin, APIView):
    def get(self, request, staff_id):
        observations = StaffObservation.objects.filter(staff_id=staff_id, is_active=True).order_by("-observation_date")
        appraisals = StaffAppraisal.objects.filter(staff_id=staff_id, is_active=True).order_by("-created_at")
        return Response(
            {
                "observations": StaffObservationSerializer(observations, many=True).data,
                "appraisals": StaffAppraisalSerializer(appraisals, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class StaffAnalyticsSummaryView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        staff = StaffMember.objects.filter(is_active=True)
        attendance = StaffAttendance.objects.filter(is_active=True)
        attendance_rate = 0.0
        if attendance.exists():
            total = attendance.count()
            present = attendance.filter(status__in=["Present", "Late", "Half-Day"]).count()
            attendance_rate = round((present / total) * 100, 2) if total else 0.0
        today = timezone.now().date()
        staff_with_join = staff.exclude(join_date__isnull=True)
        avg_years_service = round(
            sum((today - row.join_date).days for row in staff_with_join if row.join_date) / (365 * staff_with_join.count()),
            2,
        ) if staff_with_join.exists() else 0.0
        return Response(
            {
                "total_staff": staff.count(),
                "by_staff_type": list(staff.values("staff_type").annotate(count=Count("id")).order_by("staff_type")),
                "by_employment_type": list(staff.values("employment_type").annotate(count=Count("id")).order_by("employment_type")),
                "by_status": list(staff.values("status").annotate(count=Count("id")).order_by("status")),
                "attendance_rate_percent": attendance_rate,
                "average_years_service": avg_years_service,
            },
            status=status.HTTP_200_OK,
        )


class StaffAnalyticsByDepartmentView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        rows = (
            StaffAssignment.objects.filter(is_active=True, department__is_active=True, staff__is_active=True)
            .values("department_id", "department__name")
            .annotate(count=Count("staff_id", distinct=True))
            .order_by("department__name")
        )
        return Response([{"department_id": row["department_id"], "department": row["department__name"], "count": row["count"]} for row in rows], status=status.HTTP_200_OK)


class StaffAnalyticsAttendanceView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        qs = StaffAttendance.objects.filter(is_active=True, date__month=month, date__year=year)
        total = qs.count()
        present = qs.filter(status__in=["Present", "Late", "Half-Day"]).count()
        absent = qs.filter(status="Absent").count()
        late = qs.filter(status="Late").count()
        return Response(
            {
                "month": month,
                "year": year,
                "total_records": total,
                "present_records": present,
                "absent_records": absent,
                "late_records": late,
                "attendance_rate_percent": round((present / total) * 100, 2) if total else 0.0,
            },
            status=status.HTTP_200_OK,
        )


class StaffAnalyticsPerformanceView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        appraisals = StaffAppraisal.objects.filter(is_active=True).exclude(overall_rating__isnull=True)
        distribution = (
            appraisals.values("status")
            .annotate(count=Count("id"), avg_rating=Avg("overall_rating"))
            .order_by("status")
        )
        return Response(
            {
                "total_appraisals": appraisals.count(),
                "distribution": [
                    {
                        "status": row["status"],
                        "count": row["count"],
                        "avg_rating": round(float(row["avg_rating"] or 0), 2),
                    }
                    for row in distribution
                ],
            },
            status=status.HTTP_200_OK,
        )


class StaffAnalyticsComplianceView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        total_staff = StaffMember.objects.filter(is_active=True).count()
        verified_staff = (
            StaffDocument.objects.filter(is_active=True, verification_status="Verified")
            .values("staff_id")
            .distinct()
            .count()
        )
        compliance_rate = round((verified_staff / total_staff) * 100, 2) if total_staff else 0.0
        return Response(
            {
                "total_staff": total_staff,
                "staff_with_verified_documents": verified_staff,
                "compliance_rate_percent": compliance_rate,
            },
            status=status.HTTP_200_OK,
        )


class StaffDirectoryReportView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        rows = StaffMember.objects.filter(is_active=True).order_by("staff_id", "first_name")
        lines = ["staff_id,full_name,staff_type,employment_type,status,email_work,phone_primary"]
        for row in rows:
            full_name = " ".join(part for part in [row.first_name, row.middle_name, row.last_name] if part).strip()
            lines.append(f"{row.staff_id},{full_name},{row.staff_type},{row.employment_type},{row.status},{row.email_work},{row.phone_primary}")
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="staff_directory_report.csv"'
        return response


class StaffAttendanceReportView(StaffModuleAccessMixin, APIView):
    def get(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        rows = StaffAttendance.objects.filter(is_active=True, date__month=month, date__year=year)
        grouped = (
            rows.values("staff__staff_id", "staff__first_name", "staff__last_name")
            .annotate(total=Count("id"), present=Count("id", filter=Q(status__in=["Present", "Late", "Half-Day"])))
            .order_by("staff__staff_id")
        )
        lines = ["staff_id,staff_name,total_days,present_days,attendance_rate"]
        for row in grouped:
            total = row["total"] or 0
            present = row["present"] or 0
            rate = round((present / total) * 100, 2) if total else 0.0
            lines.append(f'{row["staff__staff_id"]},{row["staff__first_name"]} {row["staff__last_name"]},{total},{present},{rate}')
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="staff_attendance_report.csv"'
        return response
