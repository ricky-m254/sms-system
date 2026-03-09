from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, Q, Sum
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from school.permissions import HasModuleAccess, IsSchoolAdmin
from .events import staff_created, staff_updated, staff_deactivated
from .models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    EmergencyContact,
    Position,
    Staff,
    WorkSchedule,
    LeaveType,
    LeavePolicy,
    LeaveBalance,
    LeaveRequest,
    SalaryStructure,
    SalaryComponent,
    PayrollBatch,
    PayrollItem,
    JobPosting,
    JobApplication,
    Interview,
    OnboardingTask,
    PerformanceGoal,
    PerformanceReview,
    TrainingProgram,
    TrainingEnrollment,
)
from .serializers import (
    AttendanceRecordSerializer,
    DepartmentSerializer,
    EmployeeDocumentSerializer,
    EmployeeSerializer,
    EmergencyContactSerializer,
    PositionSerializer,
    StaffSerializer,
    WorkScheduleSerializer,
    LeaveTypeSerializer,
    LeavePolicySerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    SalaryStructureSerializer,
    SalaryComponentSerializer,
    PayrollBatchSerializer,
    PayrollItemSerializer,
    JobPostingSerializer,
    JobApplicationSerializer,
    InterviewSerializer,
    OnboardingTaskSerializer,
    PerformanceGoalSerializer,
    PerformanceReviewSerializer,
    TrainingProgramSerializer,
    TrainingEnrollmentSerializer,
)


class HrModuleAccessMixin:
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "HR"


class StaffRefView(HrModuleAccessMixin, APIView):
    def get(self, request):
        data = Staff.objects.values(
            "id", "employee_id", "first_name", "last_name", "role", "phone", "is_active"
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
        staff_deactivated.send(sender=StaffViewSet, staff_id=instance.id, employee_id=instance.employee_id)

    def perform_create(self, serializer):
        staff = serializer.save()
        staff_created.send(sender=StaffViewSet, staff_id=staff.id, employee_id=staff.employee_id)

    def perform_update(self, serializer):
        staff = serializer.save()
        staff_updated.send(sender=StaffViewSet, staff_id=staff.id, employee_id=staff.employee_id)


def _generate_employee_id() -> str:
    year = timezone.now().year
    prefix = f"EMP-{year}-"
    last = (
        Employee.objects.filter(employee_id__startswith=prefix)
        .order_by("-employee_id")
        .values_list("employee_id", flat=True)
        .first()
    )
    if not last:
        seq = 1
    else:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = Employee.objects.count() + 1
    return f"{prefix}{seq:03d}"


class EmployeeViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.filter(is_active=True).order_by("employee_id", "first_name", "last_name")
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get("department")
        status_value = self.request.query_params.get("status")
        employment_type = self.request.query_params.get("employment_type")
        if department:
            queryset = queryset.filter(department_id=department)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        return queryset

    def perform_create(self, serializer):
        employee_id = _generate_employee_id()
        serializer.save(employee_id=employee_id)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], url_path="employment")
    def employment(self, request, pk=None):
        employee = self.get_object()
        data = {
            "employee_id": employee.employee_id,
            "employment_type": employee.employment_type,
            "status": employee.status,
            "department": employee.department.name if employee.department else "",
            "position": employee.position.title if employee.position else "",
            "join_date": employee.join_date,
            "probation_end": employee.probation_end,
            "confirmation_date": employee.confirmation_date,
            "contract_start": employee.contract_start,
            "contract_end": employee.contract_end,
            "reporting_to": f"{employee.reporting_to.first_name} {employee.reporting_to.last_name}".strip()
            if employee.reporting_to
            else "",
            "work_location": employee.work_location,
            "notice_period_days": employee.notice_period_days,
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        employee = self.get_object()
        employee.confirmation_date = request.data.get("confirmation_date") or timezone.now().date()
        employee.status = "Active"
        employee.save(update_fields=["confirmation_date", "status"])
        return Response({"message": "Employee probation confirmed."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="exit")
    def exit(self, request, pk=None):
        employee = self.get_object()
        employee.status = "Terminated"
        employee.exit_date = request.data.get("exit_date") or timezone.now().date()
        employee.exit_reason = request.data.get("exit_reason", "Resignation")
        employee.exit_notes = request.data.get("exit_notes", "")
        employee.save(update_fields=["status", "exit_date", "exit_reason", "exit_notes"])
        return Response({"message": "Employee exit processed."}, status=status.HTTP_200_OK)


class EmergencyContactViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.filter(is_active=True).order_by("-is_primary", "name")
    serializer_class = EmergencyContactSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        return queryset

    def perform_create(self, serializer):
        contact = serializer.save()
        if contact.is_primary:
            EmergencyContact.objects.filter(employee=contact.employee, is_active=True).exclude(pk=contact.pk).update(
                is_primary=False
            )

    def perform_update(self, serializer):
        contact = serializer.save()
        if contact.is_primary:
            EmergencyContact.objects.filter(employee=contact.employee, is_active=True).exclude(pk=contact.pk).update(
                is_primary=False
            )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class EmployeeDocumentViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = EmployeeDocument.objects.filter(is_active=True).order_by("-uploaded_at")
    serializer_class = EmployeeDocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        document_type = self.request.query_params.get("document_type")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        return queryset

    def perform_create(self, serializer):
        file_obj = serializer.validated_data.get("file")
        file_name = file_obj.name if file_obj else ""
        serializer.save(uploaded_by=self.request.user, file_name=file_name)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        document = self.get_object()
        if not document.file:
            return Response({"error": "No file attached."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.file_name or document.file.name)

    @action(detail=False, methods=["get"], url_path="expiring")
    def expiring(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            return Response({"error": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
        threshold = timezone.now().date() + timedelta(days=days)
        queryset = self.get_queryset().filter(expiry_date__isnull=False, expiry_date__lte=threshold)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class DepartmentViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True).order_by("name")
    serializer_class = DepartmentSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], url_path="employees")
    def employees(self, request, pk=None):
        queryset = Employee.objects.filter(department_id=pk, is_active=True).order_by("employee_id", "first_name")
        serializer = EmployeeSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="org-chart")
    def org_chart(self, request):
        departments = Department.objects.filter(is_active=True).order_by("name")
        data = []
        for department in departments:
            data.append(
                {
                    "id": department.id,
                    "name": department.name,
                    "code": department.code,
                    "parent_id": department.parent_id,
                    "head": (
                        f"{department.head.first_name} {department.head.last_name}".strip()
                        if department.head
                        else ""
                    ),
                    "employee_count": Employee.objects.filter(department=department, is_active=True).count(),
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class PositionViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = Position.objects.filter(is_active=True).order_by("title")
    serializer_class = PositionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department_id=department)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], url_path="vacancies")
    def vacancies(self, request, pk=None):
        position = self.get_object()
        filled = Employee.objects.filter(position=position, is_active=True, status__in=["Active", "On Leave"]).count()
        vacancies = max(position.headcount - filled, 0)
        return Response(
            {"position_id": position.id, "headcount": position.headcount, "filled": filled, "vacancies": vacancies},
            status=status.HTTP_200_OK,
        )


def _compute_hours(clock_in, clock_out) -> Decimal:
    if not clock_in or not clock_out:
        return Decimal("0.00")
    start_dt = datetime.combine(timezone.now().date(), clock_in)
    end_dt = datetime.combine(timezone.now().date(), clock_out)
    if end_dt <= start_dt:
        return Decimal("0.00")
    minutes = int((end_dt - start_dt).total_seconds() // 60)
    return round(Decimal(minutes) / Decimal("60.00"), 2)


def _coerce_date(value):
    if hasattr(value, "year"):
        return value
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return timezone.now().date()


def _coerce_time(value):
    if hasattr(value, "hour"):
        return value
    if isinstance(value, str):
        return datetime.strptime(value, "%H:%M:%S").time()
    return timezone.now().time().replace(microsecond=0)


def _calculate_leave_days(start_date, end_date) -> Decimal:
    if end_date < start_date:
        return Decimal("0.00")
    total = 0
    cursor = start_date
    while cursor <= end_date:
        if cursor.weekday() < 5:
            total += 1
        cursor += timedelta(days=1)
    return Decimal(total)


def _resolve_request_employee(request):
    if not request.user.is_authenticated:
        return None
    return Employee.objects.filter(user=request.user, is_active=True).first()


def _resolve_policy_entitlement(leave_type, employment_type, today):
    specific = (
        LeavePolicy.objects.filter(
            leave_type=leave_type,
            is_active=True,
            effective_from__lte=today,
            employment_type=employment_type,
        )
        .order_by("-effective_from")
        .first()
    )
    if specific:
        return specific.entitlement_days

    fallback = (
        LeavePolicy.objects.filter(
            leave_type=leave_type,
            is_active=True,
            effective_from__lte=today,
            employment_type="",
        )
        .order_by("-effective_from")
        .first()
    )
    if fallback:
        return fallback.entitlement_days

    return Decimal("0.00")


def _get_or_create_leave_balance(employee, leave_type, year):
    balance, created = LeaveBalance.objects.get_or_create(
        employee=employee,
        leave_type=leave_type,
        year=year,
        defaults={
            "opening_balance": Decimal("0.00"),
            "accrued": Decimal("0.00"),
            "used": Decimal("0.00"),
            "pending": Decimal("0.00"),
            "available": Decimal("0.00"),
            "is_active": True,
        },
    )
    if created:
        balance.accrued = _resolve_policy_entitlement(leave_type, employee.employment_type, timezone.now().date())
    return balance


def _recompute_leave_available(balance):
    balance.available = (balance.opening_balance + balance.accrued) - (balance.used + balance.pending)


def _round_money(value):
    return Decimal(value).quantize(Decimal("0.01"))


def _component_amount(component, basic_salary):
    if component.amount_type == "Percentage":
        return _round_money((basic_salary * component.amount) / Decimal("100.00"))
    return _round_money(component.amount)


def _days_in_month(year, month):
    if month == 12:
        next_month = datetime(year + 1, 1, 1).date()
    else:
        next_month = datetime(year, month + 1, 1).date()
    return (next_month - datetime(year, month, 1).date()).days


class AttendanceViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.filter(is_active=True).order_by("-date", "-id")
    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        department = self.request.query_params.get("department")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if department:
            queryset = queryset.filter(employee__department_id=department)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="clock-in")
    def clock_in(self, request):
        employee_id = request.data.get("employee")
        if not employee_id:
            return Response({"error": "employee is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            today = _coerce_date(request.data.get("date") or timezone.now().date())
            now_time = _coerce_time(request.data.get("clock_in") or timezone.now().time().replace(microsecond=0))
        except ValueError:
            return Response(
                {"error": "Invalid date/time format. Use YYYY-MM-DD and HH:MM:SS."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj, _ = AttendanceRecord.objects.get_or_create(
            employee_id=employee_id,
            date=today,
            defaults={"clock_in": now_time, "status": "Present", "recorded_by": request.user, "is_active": True},
        )
        if not obj.clock_in:
            obj.clock_in = now_time
            obj.status = "Present"
            obj.recorded_by = request.user
            obj.save(update_fields=["clock_in", "status", "recorded_by"])
        serializer = self.get_serializer(obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="clock-out")
    def clock_out(self, request):
        employee_id = request.data.get("employee")
        if not employee_id:
            return Response({"error": "employee is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            today = _coerce_date(request.data.get("date") or timezone.now().date())
            now_time = _coerce_time(request.data.get("clock_out") or timezone.now().time().replace(microsecond=0))
        except ValueError:
            return Response(
                {"error": "Invalid date/time format. Use YYYY-MM-DD and HH:MM:SS."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            record = AttendanceRecord.objects.get(employee_id=employee_id, date=today, is_active=True)
        except AttendanceRecord.DoesNotExist:
            return Response({"error": "No clock-in record found for employee/date."}, status=status.HTTP_404_NOT_FOUND)
        record.clock_out = now_time
        hours = _compute_hours(record.clock_in, record.clock_out)
        record.hours_worked = hours
        record.overtime_hours = round(max(hours - Decimal("8.00"), Decimal("0.00")), 2)
        record.save(update_fields=["clock_out", "hours_worked", "overtime_hours"])
        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        rows = request.data.get("records", [])
        if not isinstance(rows, list) or not rows:
            return Response({"error": "records[] is required."}, status=status.HTTP_400_BAD_REQUEST)
        created = 0
        updated = 0
        for row in rows:
            employee_id = row.get("employee")
            date_value = row.get("date")
            if not employee_id or not date_value:
                continue
            defaults = {
                "clock_in": row.get("clock_in"),
                "clock_out": row.get("clock_out"),
                "status": row.get("status", "Present"),
                "notes": row.get("notes", ""),
                "recorded_by": request.user,
                "is_active": True,
            }
            obj, is_created = AttendanceRecord.objects.update_or_create(
                employee_id=employee_id,
                date=date_value,
                defaults=defaults,
            )
            obj.hours_worked = _compute_hours(obj.clock_in, obj.clock_out)
            obj.overtime_hours = round(max(obj.hours_worked - Decimal("8.00"), Decimal("0.00")), 2)
            obj.save(update_fields=["hours_worked", "overtime_hours"])
            if is_created:
                created += 1
            else:
                updated += 1
        return Response({"message": "Bulk attendance saved.", "created": created, "updated": updated}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        queryset = self.get_queryset().filter(date__year=year, date__month=month)
        total = queryset.count()
        present = queryset.filter(status="Present").count()
        late = queryset.filter(status="Late").count()
        absent = queryset.filter(status="Absent").count()
        overtime = queryset.aggregate(v=Avg("overtime_hours"))["v"] or Decimal("0.00")
        return Response(
            {
                "month": month,
                "year": year,
                "total_records": total,
                "present_count": present,
                "late_count": late,
                "absent_count": absent,
                "average_overtime_hours": round(Decimal(overtime), 2),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="report")
    def report(self, request):
        queryset = self.get_queryset()
        grouped = (
            queryset.values("employee_id", "employee__employee_id", "employee__first_name", "employee__last_name")
            .annotate(
                days=Count("id"),
                present=Count("id", filter=Q(status="Present")),
                absent=Count("id", filter=Q(status="Absent")),
                late=Count("id", filter=Q(status="Late")),
                avg_hours=Avg("hours_worked"),
            )
            .order_by("employee__employee_id")
        )
        data = []
        for row in grouped:
            data.append(
                {
                    "employee_id": row["employee__employee_id"],
                    "employee_name": f'{row["employee__first_name"]} {row["employee__last_name"]}'.strip(),
                    "days": row["days"],
                    "present": row["present"],
                    "absent": row["absent"],
                    "late": row["late"],
                    "average_hours": round(Decimal(row["avg_hours"] or 0), 2),
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class WorkScheduleViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = WorkSchedule.objects.filter(is_active=True).order_by("-effective_from", "-id")
    serializer_class = WorkScheduleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        department = self.request.query_params.get("department")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if department:
            queryset = queryset.filter(department_id=department)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class LeaveTypeViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = LeaveType.objects.filter(is_active=True).order_by("name")
    serializer_class = LeaveTypeSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class LeavePolicyViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = LeavePolicy.objects.filter(is_active=True).order_by("leave_type__name", "employment_type", "-effective_from")
    serializer_class = LeavePolicySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        leave_type = self.request.query_params.get("leave_type")
        if leave_type:
            queryset = queryset.filter(leave_type_id=leave_type)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class LeaveBalanceView(HrModuleAccessMixin, APIView):
    def get(self, request, employee_id):
        year = request.query_params.get("year")
        queryset = LeaveBalance.objects.filter(employee_id=employee_id, is_active=True)
        if year:
            queryset = queryset.filter(year=year)
        serializer = LeaveBalanceSerializer(queryset.order_by("-year", "leave_type__name"), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LeaveRequestViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.filter(is_active=True).order_by("-submitted_at", "-id")
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        employee = self.request.query_params.get("employee")
        leave_type = self.request.query_params.get("leave_type")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if leave_type:
            queryset = queryset.filter(leave_type_id=leave_type)
        return queryset

    def perform_create(self, serializer):
        start_date = _coerce_date(serializer.validated_data["start_date"])
        end_date = _coerce_date(serializer.validated_data["end_date"])
        days_requested = _calculate_leave_days(start_date, end_date)
        leave_type = serializer.validated_data["leave_type"]
        employee = serializer.validated_data["employee"]

        leave_request = serializer.save(days_requested=days_requested, status="Pending")
        balance = _get_or_create_leave_balance(employee, leave_type, start_date.year)
        balance.pending += days_requested
        _recompute_leave_available(balance)
        balance.save(update_fields=["accrued", "pending", "available", "updated_at"])

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != "Pending":
            return Response({"error": "Only pending requests can be approved."}, status=status.HTTP_400_BAD_REQUEST)

        approver_employee = _resolve_request_employee(request)
        days = leave_request.days_requested or Decimal("0.00")
        balance = _get_or_create_leave_balance(leave_request.employee, leave_request.leave_type, leave_request.start_date.year)
        balance.pending = max(balance.pending - days, Decimal("0.00"))
        balance.used += days
        _recompute_leave_available(balance)
        balance.save(update_fields=["accrued", "pending", "used", "available", "updated_at"])

        leave_request.status = "Approved"
        leave_request.current_approver = None
        leave_request.approved_by = approver_employee
        leave_request.approved_at = timezone.now()
        leave_request.rejection_reason = ""
        leave_request.save(
            update_fields=["status", "current_approver", "approved_by", "approved_at", "rejection_reason"]
        )
        return Response({"message": "Leave request approved."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != "Pending":
            return Response({"error": "Only pending requests can be rejected."}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get("rejection_reason", "").strip()
        if not reason:
            return Response({"error": "rejection_reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        days = leave_request.days_requested or Decimal("0.00")
        balance = _get_or_create_leave_balance(leave_request.employee, leave_request.leave_type, leave_request.start_date.year)
        balance.pending = max(balance.pending - days, Decimal("0.00"))
        _recompute_leave_available(balance)
        balance.save(update_fields=["accrued", "pending", "available", "updated_at"])

        leave_request.status = "Rejected"
        leave_request.current_approver = None
        leave_request.rejection_reason = reason
        leave_request.save(update_fields=["status", "current_approver", "rejection_reason"])
        return Response({"message": "Leave request rejected."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != "Pending":
            return Response({"error": "Only pending requests can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        days = leave_request.days_requested or Decimal("0.00")
        balance = _get_or_create_leave_balance(leave_request.employee, leave_request.leave_type, leave_request.start_date.year)
        balance.pending = max(balance.pending - days, Decimal("0.00"))
        _recompute_leave_available(balance)
        balance.save(update_fields=["accrued", "pending", "available", "updated_at"])

        leave_request.status = "Cancelled"
        leave_request.current_approver = None
        leave_request.save(update_fields=["status", "current_approver"])
        return Response({"message": "Leave request cancelled."}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        if instance.status == "Pending":
            days = instance.days_requested or Decimal("0.00")
            balance = _get_or_create_leave_balance(instance.employee, instance.leave_type, instance.start_date.year)
            balance.pending = max(balance.pending - days, Decimal("0.00"))
            _recompute_leave_available(balance)
            balance.save(update_fields=["accrued", "pending", "available", "updated_at"])
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class LeaveCalendarView(HrModuleAccessMixin, APIView):
    def get(self, request):
        queryset = LeaveRequest.objects.filter(is_active=True).exclude(status="Cancelled")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        department = request.query_params.get("department")

        if start_date:
            queryset = queryset.filter(end_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_date__lte=end_date)
        if department:
            queryset = queryset.filter(employee__department_id=department)

        data = [
            {
                "id": row.id,
                "employee_id": row.employee_id,
                "employee_name": f"{row.employee.first_name} {row.employee.last_name}".strip(),
                "department": row.employee.department.name if row.employee.department else "",
                "leave_type": row.leave_type.name,
                "start_date": row.start_date,
                "end_date": row.end_date,
                "days_requested": row.days_requested,
                "status": row.status,
            }
            for row in queryset.order_by("-start_date", "-id")
        ]
        return Response(data, status=status.HTTP_200_OK)


class SalaryStructureViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.filter(is_active=True).order_by("-effective_from", "-id")
    serializer_class = SalaryStructureSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class SalaryComponentViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = SalaryComponent.objects.filter(is_active=True).order_by("name", "id")
    serializer_class = SalaryComponentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        structure = self.request.query_params.get("structure")
        if structure:
            queryset = queryset.filter(structure_id=structure)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class PayrollBatchViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = PayrollBatch.objects.filter(is_active=True).order_by("-year", "-month", "-id")
    serializer_class = PayrollBatchSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        return queryset

    @action(detail=False, methods=["post"], url_path="process")
    def process(self, request):
        month = int(request.data.get("month", timezone.now().month))
        year = int(request.data.get("year", timezone.now().year))
        payment_date_value = request.data.get("payment_date")

        payroll, _ = PayrollBatch.objects.get_or_create(
            month=month,
            year=year,
            defaults={"status": "Draft", "is_active": True},
        )
        if payroll.status in ["Approved", "Paid", "Closed"]:
            return Response(
                {"error": "Approved/paid payroll cannot be reprocessed via process. Use reprocess before approval."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payroll.status = "Processing"
        payroll.processed_by = request.user
        if payment_date_value:
            payroll.payment_date = _coerce_date(payment_date_value)
        payroll.save(update_fields=["status", "processed_by", "payment_date"])

        PayrollItem.objects.filter(payroll=payroll).delete()
        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_net = Decimal("0.00")

        month_start = datetime(year, month, 1).date()
        month_end = datetime(year, month, _days_in_month(year, month)).date()
        days_in_month = Decimal(str(_days_in_month(year, month)))

        active_structures = SalaryStructure.objects.filter(
            is_active=True,
            employee__is_active=True,
            effective_from__lte=month_end,
        ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=month_start))

        for structure in active_structures.select_related("employee"):
            employee = structure.employee
            basic_salary = _round_money(structure.basic_salary)
            components = SalaryComponent.objects.filter(structure=structure, is_active=True)

            allowances = Decimal("0.00")
            deductions = Decimal("0.00")
            for component in components:
                value = _component_amount(component, basic_salary)
                if component.component_type == "Allowance":
                    allowances += value
                else:
                    deductions += value

            attendance = AttendanceRecord.objects.filter(
                employee=employee,
                is_active=True,
                date__gte=month_start,
                date__lte=month_end,
            )
            days_worked = Decimal(str(attendance.filter(status__in=["Present", "Late", "Half-Day"]).count()))
            overtime_hours = Decimal(str(attendance.aggregate(v=Sum("overtime_hours"))["v"] or 0))

            unpaid_days = max(days_in_month - days_worked, Decimal("0.00"))
            absent_deduction = _round_money((basic_salary / days_in_month) * unpaid_days) if days_in_month > 0 else Decimal("0.00")
            deductions += absent_deduction

            overtime_rate = basic_salary / Decimal("173.33") if basic_salary > 0 else Decimal("0.00")
            overtime_amount = _round_money(overtime_rate * overtime_hours)
            allowances += overtime_amount

            gross = _round_money(basic_salary + allowances)
            net = _round_money(gross - deductions)

            PayrollItem.objects.create(
                payroll=payroll,
                employee=employee,
                basic_salary=basic_salary,
                total_allowances=_round_money(allowances),
                total_deductions=_round_money(deductions),
                gross_salary=gross,
                net_salary=net,
                days_worked=_round_money(days_worked),
                overtime_hours=_round_money(overtime_hours),
                is_active=True,
            )

            total_gross += gross
            total_deductions += _round_money(deductions)
            total_net += net

        payroll.total_gross = _round_money(total_gross)
        payroll.total_deductions = _round_money(total_deductions)
        payroll.total_net = _round_money(total_net)
        payroll.status = "Draft"
        payroll.save(update_fields=["total_gross", "total_deductions", "total_net", "status"])
        serializer = self.get_serializer(payroll)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        payroll = self.get_object()
        if payroll.status in ["Paid", "Closed"]:
            return Response({"error": "Payroll already finalized."}, status=status.HTTP_400_BAD_REQUEST)
        payroll.status = "Approved"
        payroll.approved_by = request.user
        payroll.approved_at = timezone.now()
        payroll.save(update_fields=["status", "approved_by", "approved_at"])
        return Response({"message": "Payroll approved."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reprocess")
    def reprocess(self, request, pk=None):
        payroll = self.get_object()
        if payroll.status in ["Approved", "Paid", "Closed"]:
            return Response({"error": "Finalized payroll cannot be reprocessed."}, status=status.HTTP_400_BAD_REQUEST)
        month = payroll.month
        year = payroll.year
        payment_date_value = request.data.get("payment_date")

        payroll.status = "Processing"
        payroll.processed_by = request.user
        if payment_date_value:
            payroll.payment_date = _coerce_date(payment_date_value)
        payroll.save(update_fields=["status", "processed_by", "payment_date"])

        PayrollItem.objects.filter(payroll=payroll).delete()
        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_net = Decimal("0.00")

        month_start = datetime(year, month, 1).date()
        month_end = datetime(year, month, _days_in_month(year, month)).date()
        days_in_month = Decimal(str(_days_in_month(year, month)))

        active_structures = SalaryStructure.objects.filter(
            is_active=True,
            employee__is_active=True,
            effective_from__lte=month_end,
        ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=month_start))

        for structure in active_structures.select_related("employee"):
            employee = structure.employee
            basic_salary = _round_money(structure.basic_salary)
            components = SalaryComponent.objects.filter(structure=structure, is_active=True)

            allowances = Decimal("0.00")
            deductions = Decimal("0.00")
            for component in components:
                value = _component_amount(component, basic_salary)
                if component.component_type == "Allowance":
                    allowances += value
                else:
                    deductions += value

            attendance = AttendanceRecord.objects.filter(
                employee=employee,
                is_active=True,
                date__gte=month_start,
                date__lte=month_end,
            )
            days_worked = Decimal(str(attendance.filter(status__in=["Present", "Late", "Half-Day"]).count()))
            overtime_hours = Decimal(str(attendance.aggregate(v=Sum("overtime_hours"))["v"] or 0))

            unpaid_days = max(days_in_month - days_worked, Decimal("0.00"))
            absent_deduction = _round_money((basic_salary / days_in_month) * unpaid_days) if days_in_month > 0 else Decimal("0.00")
            deductions += absent_deduction

            overtime_rate = basic_salary / Decimal("173.33") if basic_salary > 0 else Decimal("0.00")
            overtime_amount = _round_money(overtime_rate * overtime_hours)
            allowances += overtime_amount

            gross = _round_money(basic_salary + allowances)
            net = _round_money(gross - deductions)

            PayrollItem.objects.create(
                payroll=payroll,
                employee=employee,
                basic_salary=basic_salary,
                total_allowances=_round_money(allowances),
                total_deductions=_round_money(deductions),
                gross_salary=gross,
                net_salary=net,
                days_worked=_round_money(days_worked),
                overtime_hours=_round_money(overtime_hours),
                is_active=True,
            )

            total_gross += gross
            total_deductions += _round_money(deductions)
            total_net += net

        payroll.total_gross = _round_money(total_gross)
        payroll.total_deductions = _round_money(total_deductions)
        payroll.total_net = _round_money(total_net)
        payroll.status = "Draft"
        payroll.save(update_fields=["total_gross", "total_deductions", "total_net", "status"])
        serializer = self.get_serializer(payroll)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="bank-file")
    def bank_file(self, request, pk=None):
        payroll = self.get_object()
        lines = ["employee_id,employee_name,net_salary"]
        for item in payroll.items.select_related("employee").all():
            employee_name = f"{item.employee.first_name} {item.employee.last_name}".strip()
            lines.append(f"{item.employee.employee_id},{employee_name},{item.net_salary}")
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="payroll_bank_file_{payroll.year}_{payroll.month:02d}.csv"'
        return response

    @action(detail=False, methods=["get"], url_path="tax-report")
    def tax_report(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        payroll = PayrollBatch.objects.filter(month=month, year=year, is_active=True).first()
        if not payroll:
            return Response({"error": "Payroll batch not found for period."}, status=status.HTTP_404_NOT_FOUND)

        lines = ["employee_id,employee_name,gross_salary,total_deductions,net_salary,estimated_tax"]
        for item in payroll.items.select_related("employee").all():
            employee_name = f"{item.employee.first_name} {item.employee.last_name}".strip()
            estimated_tax = _round_money(item.gross_salary * Decimal("0.10"))
            lines.append(
                f"{item.employee.employee_id},{employee_name},{item.gross_salary},{item.total_deductions},{item.net_salary},{estimated_tax}"
            )
        response = HttpResponse("\n".join(lines), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="payroll_tax_report_{year}_{month:02d}.csv"'
        return response


class PayrollItemViewSet(HrModuleAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PayrollItem.objects.filter(is_active=True).order_by("employee__employee_id", "id")
    serializer_class = PayrollItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        payroll = self.request.query_params.get("payroll")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if payroll:
            queryset = queryset.filter(payroll_id=payroll)
        return queryset

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        item = self.get_object()
        if item.pdf_file:
            return FileResponse(item.pdf_file.open("rb"), as_attachment=True, filename=item.pdf_file.name.split("/")[-1])
        emp = item.employee
        emp_name = f"{emp.first_name} {emp.last_name}"
        dept = emp.department.name if emp.department else "—"
        pos = emp.position.title if emp.position else "—"
        currency = "KES"
        try:
            struct = emp.salary_structures.filter(is_active=True).order_by("-effective_from").first()
            if struct:
                currency = struct.currency
        except Exception:
            pass
        content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip — {emp_name}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:800px;margin:0 auto}}
h1{{color:#047857;font-size:18px;margin-bottom:4px}}
.subtitle{{color:#555;font-size:11px;margin-bottom:16px}}
table{{width:100%;border-collapse:collapse;margin-bottom:16px}}
th{{background:#f0fdf4;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#047857;border-bottom:2px solid #bbf7d0}}
td{{padding:6px 8px;border-bottom:1px solid #e5e7eb}}
td:last-child,th:last-child{{text-align:right}}
.net{{border:2px solid #047857;border-radius:6px;padding:12px;display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#047857;margin-bottom:20px}}
@media print{{@page{{size:A4;margin:2cm}}}}
</style></head><body>
<h1>Payslip — {emp.employee_id}</h1>
<div class="subtitle">Period: {item.payroll.month:02d}/{item.payroll.year} | Payment: {item.payroll.payment_date or "—"}</div>
<table><tr><th>Employee</th><th>Department</th><th>Position</th></tr>
<tr><td>{emp_name}</td><td>{dept}</td><td>{pos}</td></tr></table>
<table><tr><th>Earnings</th><th>Amount ({currency})</th></tr>
<tr><td>Basic Salary</td><td>{item.basic_salary}</td></tr>
<tr><td>Total Allowances</td><td>{item.total_allowances}</td></tr>
<tr style="font-weight:600"><td>Gross Salary</td><td>{item.gross_salary}</td></tr></table>
<table><tr><th>Deductions</th><th>Amount ({currency})</th></tr>
<tr><td>Total Deductions</td><td>{item.total_deductions}</td></tr></table>
<div class="net"><span>NET PAY</span><span>{currency} {item.net_salary}</span></div>
<p style="font-size:10px;color:#888">Generated by Rynaty School Management System — Rynatyspace Technologies</p>
<script>window.onload=function(){{window.print()}}</script>
</body></html>"""
        response = HttpResponse(content, content_type="text/html; charset=utf-8")
        response["Content-Disposition"] = f'inline; filename="payslip_{item.payroll.year}_{item.payroll.month:02d}_{emp.employee_id}.html"'
        return response

    @action(detail=False, methods=["post"], url_path="email")
    def email(self, request):
        ids = request.data.get("payslip_ids", [])
        if not isinstance(ids, list) or not ids:
            return Response({"error": "payslip_ids[] is required."}, status=status.HTTP_400_BAD_REQUEST)
        updated = PayrollItem.objects.filter(id__in=ids, is_active=True).update(sent_at=timezone.now())
        return Response({"message": "Payslips marked as sent.", "count": updated}, status=status.HTTP_200_OK)


class JobPostingViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = JobPosting.objects.filter(is_active=True).order_by("-created_at", "-id")
    serializer_class = JobPostingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        department = self.request.query_params.get("department")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if department:
            queryset = queryset.filter(department_id=department)
        return queryset

    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        posting = self.get_object()
        posting.status = "Open"
        posting.posted_by = request.user
        posting.posted_at = timezone.now()
        posting.save(update_fields=["status", "posted_by", "posted_at"])
        return Response({"message": "Job posting published."}, status=status.HTTP_200_OK)


class JobApplicationViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = JobApplication.objects.filter(is_active=True).order_by("-applied_at", "-id")
    serializer_class = JobApplicationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        posting = self.request.query_params.get("job_posting")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if posting:
            queryset = queryset.filter(job_posting_id=posting)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="shortlist")
    def shortlist(self, request, pk=None):
        application = self.get_object()
        application.status = "Shortlisted"
        application.save(update_fields=["status"])
        return Response({"message": "Applicant shortlisted."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        application = self.get_object()
        notes = request.data.get("notes", "")
        application.status = "Rejected"
        if notes:
            application.notes = notes
            application.save(update_fields=["status", "notes"])
        else:
            application.save(update_fields=["status"])
        return Response({"message": "Applicant rejected."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="hire")
    def hire(self, request, pk=None):
        application = self.get_object()
        if application.status == "Hired":
            return Response({"error": "Application already hired."}, status=status.HTTP_400_BAD_REQUEST)

        posting = application.job_posting
        join_date = _coerce_date(request.data.get("join_date") or timezone.now().date())
        position = posting.position
        department = posting.department or (position.department if position else None)

        employee = Employee.objects.create(
            employee_id=_generate_employee_id(),
            first_name=application.first_name,
            last_name=application.last_name,
            date_of_birth=_coerce_date(request.data.get("date_of_birth") or "1990-01-01"),
            gender=request.data.get("gender", "Other"),
            nationality=request.data.get("nationality", ""),
            national_id=request.data.get("national_id", ""),
            marital_status=request.data.get("marital_status", "Single"),
            department=department,
            position=position,
            employment_type=posting.employment_type,
            status="Active",
            join_date=join_date,
            notice_period_days=int(request.data.get("notice_period_days", 30)),
            is_active=True,
        )

        application.status = "Hired"
        application.save(update_fields=["status"])

        default_tasks = [
            "Collect signed contract",
            "Create work email and system account",
            "Assign workstation/equipment",
            "Schedule orientation session",
        ]
        for task in default_tasks:
            OnboardingTask.objects.create(
                employee=employee,
                task=task,
                assigned_to=request.user,
                due_date=join_date,
                status="Pending",
                is_active=True,
            )

        return Response(
            {"message": "Applicant hired and onboarding initialized.", "employee_id": employee.id},
            status=status.HTTP_200_OK,
        )


class InterviewViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = Interview.objects.filter(is_active=True).order_by("-interview_date", "-id")
    serializer_class = InterviewSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        application = self.request.query_params.get("application")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if application:
            queryset = queryset.filter(application_id=application)
        return queryset

    def perform_create(self, serializer):
        interview = serializer.save(created_by=self.request.user)
        application = interview.application
        if application.status in ["New", "Screening", "Shortlisted"]:
            application.status = "Interview"
            application.save(update_fields=["status"])

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="feedback")
    def feedback(self, request, pk=None):
        interview = self.get_object()
        feedback_value = request.data.get("feedback", "").strip()
        if not feedback_value:
            return Response({"error": "feedback is required."}, status=status.HTTP_400_BAD_REQUEST)
        score = request.data.get("score")
        interview.feedback = feedback_value
        if score is not None:
            interview.score = score
        interview.status = request.data.get("status", "Completed")
        interview.save(update_fields=["feedback", "score", "status"])
        return Response({"message": "Interview feedback recorded."}, status=status.HTTP_200_OK)


class OnboardingTaskViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = OnboardingTask.objects.filter(is_active=True).order_by("status", "due_date", "id")
    serializer_class = OnboardingTaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        status_value = self.request.query_params.get("status")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["patch"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = "Completed"
        task.completed_at = timezone.now()
        if "notes" in request.data:
            task.notes = request.data.get("notes", "")
            task.save(update_fields=["status", "completed_at", "notes"])
        else:
            task.save(update_fields=["status", "completed_at"])
        return Response({"message": "Onboarding task completed."}, status=status.HTTP_200_OK)


class OnboardingChecklistView(HrModuleAccessMixin, APIView):
    def get(self, request, employee_id):
        queryset = OnboardingTask.objects.filter(employee_id=employee_id, is_active=True).order_by("status", "due_date", "id")
        serializer = OnboardingTaskSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PerformanceGoalViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = PerformanceGoal.objects.filter(is_active=True).order_by("-created_at", "-id")
    serializer_class = PerformanceGoalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        status_value = self.request.query_params.get("status")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class PerformanceReviewViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = PerformanceReview.objects.filter(is_active=True).order_by("-created_at", "-id")
    serializer_class = PerformanceReviewSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee = self.request.query_params.get("employee")
        reviewer = self.request.query_params.get("reviewer")
        status_value = self.request.query_params.get("status")
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if reviewer:
            queryset = queryset.filter(reviewer_id=reviewer)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        review = self.get_object()
        review.status = "Submitted"
        review.reviewed_at = timezone.now()
        review.save(update_fields=["status", "reviewed_at"])
        return Response({"message": "Performance review submitted."}, status=status.HTTP_200_OK)


class TrainingProgramViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = TrainingProgram.objects.filter(is_active=True).order_by("-start_date", "-id")
    serializer_class = TrainingProgramSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class TrainingEnrollmentViewSet(HrModuleAccessMixin, viewsets.ModelViewSet):
    queryset = TrainingEnrollment.objects.filter(is_active=True).order_by("-created_at", "-id")
    serializer_class = TrainingEnrollmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        program = self.request.query_params.get("program")
        employee = self.request.query_params.get("employee")
        status_value = self.request.query_params.get("status")
        if program:
            queryset = queryset.filter(program_id=program)
        if employee:
            queryset = queryset.filter(employee_id=employee)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class HrAnalyticsSummaryView(HrModuleAccessMixin, APIView):
    def get(self, request):
        employees = Employee.objects.filter(is_active=True)
        by_status = (
            employees.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        by_department = (
            employees.values("department__name")
            .annotate(count=Count("id"))
            .order_by("department__name")
        )
        by_type = (
            employees.values("employment_type")
            .annotate(count=Count("id"))
            .order_by("employment_type")
        )
        attendance_qs = AttendanceRecord.objects.filter(is_active=True)
        attendance_rate = 0.0
        if attendance_qs.exists():
            total = attendance_qs.count()
            present = attendance_qs.filter(status__in=["Present", "Late", "Half-Day"]).count()
            attendance_rate = round((present / total) * 100, 2) if total else 0.0
        return Response(
            {
                "headcount": employees.count(),
                "attendance_rate_percent": attendance_rate,
                "departments": Department.objects.filter(is_active=True).count(),
                "positions": Position.objects.filter(is_active=True).count(),
                "headcount_by_status": [
                    {"status": row["status"], "count": row["count"]} for row in by_status
                ],
                "headcount_by_department": [
                    {"department": row["department__name"] or "Unassigned", "count": row["count"]}
                    for row in by_department
                ],
                "headcount_by_employment_type": [
                    {"employment_type": row["employment_type"], "count": row["count"]}
                    for row in by_type
                ],
            },
            status=status.HTTP_200_OK,
        )


class HrAnalyticsHeadcountView(HrModuleAccessMixin, APIView):
    def get(self, request):
        employees = Employee.objects.filter(is_active=True)
        by_department = employees.values("department__name").annotate(count=Count("id")).order_by("department__name")
        by_position = employees.values("position__title").annotate(count=Count("id")).order_by("position__title")
        by_type = employees.values("employment_type").annotate(count=Count("id")).order_by("employment_type")
        return Response(
            {
                "total": employees.count(),
                "by_department": [{"department": row["department__name"] or "Unassigned", "count": row["count"]} for row in by_department],
                "by_position": [{"position": row["position__title"] or "Unassigned", "count": row["count"]} for row in by_position],
                "by_employment_type": [{"employment_type": row["employment_type"], "count": row["count"]} for row in by_type],
            },
            status=status.HTTP_200_OK,
        )


class HrAnalyticsTurnoverView(HrModuleAccessMixin, APIView):
    def get(self, request):
        year = int(request.query_params.get("year", timezone.now().year))
        employees_total = Employee.objects.filter(is_active=True).count()
        exits = Employee.objects.filter(is_active=True, exit_date__year=year).exclude(exit_reason="").count()
        turnover_rate = round((exits / employees_total) * 100, 2) if employees_total else 0.0
        by_reason = (
            Employee.objects.filter(is_active=True, exit_date__year=year)
            .exclude(exit_reason="")
            .values("exit_reason")
            .annotate(count=Count("id"))
            .order_by("exit_reason")
        )
        return Response(
            {
                "year": year,
                "headcount_base": employees_total,
                "exits": exits,
                "turnover_rate_percent": turnover_rate,
                "by_reason": [{"reason": row["exit_reason"], "count": row["count"]} for row in by_reason],
            },
            status=status.HTTP_200_OK,
        )


class HrAnalyticsAttendanceView(HrModuleAccessMixin, APIView):
    def get(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        qs = AttendanceRecord.objects.filter(is_active=True, date__month=month, date__year=year)
        total = qs.count()
        present = qs.filter(status__in=["Present", "Late", "Half-Day"]).count()
        absent = qs.filter(status="Absent").count()
        late = qs.filter(status="Late").count()
        overtime = qs.aggregate(total=Sum("overtime_hours"))["total"] or Decimal("0.00")
        return Response(
            {
                "month": month,
                "year": year,
                "total_records": total,
                "present_records": present,
                "absent_records": absent,
                "late_records": late,
                "attendance_rate_percent": round((present / total) * 100, 2) if total else 0.0,
                "overtime_hours_total": _round_money(overtime),
            },
            status=status.HTTP_200_OK,
        )


class HrAnalyticsLeaveView(HrModuleAccessMixin, APIView):
    def get(self, request):
        year = int(request.query_params.get("year", timezone.now().year))
        qs = LeaveBalance.objects.filter(is_active=True, year=year)
        totals = qs.aggregate(
            opening=Sum("opening_balance"),
            accrued=Sum("accrued"),
            used=Sum("used"),
            pending=Sum("pending"),
            available=Sum("available"),
        )
        return Response(
            {
                "year": year,
                "opening_balance_total": _round_money(totals["opening"] or 0),
                "accrued_total": _round_money(totals["accrued"] or 0),
                "used_total": _round_money(totals["used"] or 0),
                "pending_total": _round_money(totals["pending"] or 0),
                "available_total": _round_money(totals["available"] or 0),
            },
            status=status.HTTP_200_OK,
        )


class HrAnalyticsDiversityView(HrModuleAccessMixin, APIView):
    def get(self, request):
        employees = Employee.objects.filter(is_active=True)
        total = employees.count()
        by_gender = employees.values("gender").annotate(count=Count("id")).order_by("gender")
        data = []
        for row in by_gender:
            pct = round((row["count"] / total) * 100, 2) if total else 0.0
            data.append({"gender": row["gender"], "count": row["count"], "percent": pct})
        return Response({"total": total, "by_gender": data}, status=status.HTTP_200_OK)


class HrAnalyticsPayrollCostsView(HrModuleAccessMixin, APIView):
    def get(self, request):
        year = int(request.query_params.get("year", timezone.now().year))
        batches = PayrollBatch.objects.filter(is_active=True, year=year)
        totals = batches.aggregate(gross=Sum("total_gross"), deductions=Sum("total_deductions"), net=Sum("total_net"))
        by_month = (
            batches.values("month")
            .annotate(gross=Sum("total_gross"), deductions=Sum("total_deductions"), net=Sum("total_net"))
            .order_by("month")
        )
        return Response(
            {
                "year": year,
                "total_gross": _round_money(totals["gross"] or 0),
                "total_deductions": _round_money(totals["deductions"] or 0),
                "total_net": _round_money(totals["net"] or 0),
                "by_month": [
                    {
                        "month": row["month"],
                        "gross": _round_money(row["gross"] or 0),
                        "deductions": _round_money(row["deductions"] or 0),
                        "net": _round_money(row["net"] or 0),
                    }
                    for row in by_month
                ],
            },
            status=status.HTTP_200_OK,
        )
