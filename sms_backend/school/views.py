from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.db import models
from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from psycopg2 import sql as pgsql
from datetime import datetime, timedelta
import hashlib
import hmac
import json
import csv
import os
import re

from .models import (
    Student, Guardian, Invoice, Payment, Enrollment, AdmissionApplication,
    FeeStructure, Expense, Budget, InvoiceLineItem, AttendanceRecord, BehaviorIncident,
    FeeAssignment, InvoiceAdjustment, Module, UserModuleAssignment,
    Role, UserProfile, AdmissionDocument, StudentDocument,
    Department,
    MedicalRecord, ImmunizationRecord, ClinicVisit, SchoolProfile,
    PaymentReversalRequest, InvoiceInstallmentPlan, InvoiceInstallment, LateFeeRule, FeeReminderLog,
    InvoiceWriteOffRequest,
    ScholarshipAward, OptionalCharge, StudentOptionalCharge,
    AccountingPeriod, ChartOfAccount, JournalEntry, JournalLine,
    PaymentGatewayTransaction, PaymentGatewayWebhookEvent, BankStatementLine,
    VoteHead, VoteHeadPaymentAllocation, CashbookEntry, BalanceCarryForward,
    StoreCategory, StoreItem, StoreTransaction, StoreOrderRequest, StoreOrderItem,
    DispensaryVisit, DispensaryPrescription, DispensaryStock
)
from hr.models import Staff
from academics.models import AcademicYear, Term, SchoolClass
from communication.models import Message
from reporting.models import AuditLog
from .serializers import (
    ExpenseSerializer, StaffSerializer,
    StudentSerializer, InvoiceSerializer, PaymentSerializer,
    EnrollmentSerializer, TermSerializer, FeeStructureSerializer,
    BudgetSerializer,
    FeeAssignmentSerializer, InvoiceAdjustmentSerializer,
    ScholarshipAwardSerializer,
    OptionalChargeSerializer, StudentOptionalChargeSerializer,
    PaymentReversalRequestSerializer, InvoiceInstallmentPlanSerializer,
    InvoiceInstallmentSerializer, LateFeeRuleSerializer, FeeReminderLogSerializer,
    InvoiceWriteOffRequestSerializer,
    AccountingPeriodSerializer, ChartOfAccountSerializer, JournalEntrySerializer,
    PaymentGatewayTransactionSerializer, PaymentGatewayWebhookEventSerializer, BankStatementLineSerializer,
    ModuleSerializer, UserModuleAssignmentSerializer, TenantModuleSerializer, ModuleSettingSerializer,
    AdmissionApplicationSerializer, StudentDocumentSerializer,
    FinanceStudentRefSerializer, FinanceEnrollmentRefSerializer,
    AttendanceRecordSerializer, BehaviorIncidentSerializer,
    MedicalRecordSerializer, ImmunizationRecordSerializer, ClinicVisitSerializer,
    SchoolProfileSerializer,
    VoteHeadSerializer, VoteHeadPaymentAllocationSerializer,
    CashbookEntrySerializer, BalanceCarryForwardSerializer,
    StoreCategorySerializer, StoreItemSerializer, StoreTransactionSerializer,
    StoreOrderRequestSerializer,
    DispensaryVisitSerializer, DispensaryPrescriptionSerializer, DispensaryStockSerializer,
    DepartmentSerializer,
    HrDepartmentSerializer,
)


_STORAGE_SUFFIX_PATTERN = re.compile(r"^(?P<base>.+)_[A-Za-z0-9]{7}(?P<ext>\.[^./\\]+)$")


def _display_document_name(file_field) -> str:
    if not file_field:
        return ""
    raw_name = os.path.basename(getattr(file_field, "name", "") or "")
    match = _STORAGE_SUFFIX_PATTERN.match(raw_name)
    if match:
        return f"{match.group('base')}{match.group('ext')}"
    return raw_name
from communication.serializers import MessageSerializer
from reporting.serializers import AuditLogSerializer
from .services import (
    FinanceService, StudentsService, AcademicsService, HrService,
    CommunicationService, CoreService, ReportingService, TenantModuleSettingsService
)
from .pagination import FinanceResultsPagination
from .permissions import IsSchoolAdmin, IsAccountant, IsTeacher, HasModuleAccess
from .module_focus import is_module_allowed, module_focus_lock_enabled, module_focus_keys


def _role_name(user):
    profile = getattr(user, 'userprofile', None)
    role = getattr(profile, 'role', None)
    return getattr(role, 'name', '')


def _is_admin_like(user):
    return _role_name(user) in {'ADMIN', 'TENANT_SUPER_ADMIN'}


def _approval_threshold():
    return 10000


def _active_school_profile():
    return SchoolProfile.objects.filter(is_active=True).first()


def _resolve_admission_number_mode(profile: SchoolProfile | None) -> tuple[str, str, int]:
    mode = "AUTO"
    prefix = "ADM-"
    padding = 4
    if profile:
        mode = (profile.admission_number_mode or "AUTO").upper()
        prefix = (profile.admission_number_prefix or "ADM-").strip() or "ADM-"
        padding = profile.admission_number_padding or 4
    if mode not in {"AUTO", "MANUAL"}:
        mode = "AUTO"
    if padding < 1:
        padding = 1
    return mode, prefix, padding


def _generate_next_admission_number(prefix: str, padding: int) -> str:
    max_number = 0
    for value in Student.objects.filter(admission_number__startswith=prefix).values_list("admission_number", flat=True):
        suffix = str(value or "")[len(prefix):]
        if suffix.isdigit():
            max_number = max(max_number, int(suffix))
    next_number = max_number + 1
    return f"{prefix}{str(next_number).zfill(padding)}"


def _resolve_student_admission_number(requested: str | None) -> str:
    profile = _active_school_profile()
    mode, prefix, padding = _resolve_admission_number_mode(profile)
    candidate = (requested or "").strip()

    if mode == "MANUAL":
        if not candidate:
            raise ValidationError(
                {
                    "admission_number": "admission_number is required when admission number mode is MANUAL."
                }
            )
        return candidate

    if candidate:
        return candidate

    auto_candidate = _generate_next_admission_number(prefix, padding)
    while Student.objects.filter(admission_number=auto_candidate).exists():
        auto_candidate = _generate_next_admission_number(prefix, padding)
    return auto_candidate


def _sync_library_member_for_student(student: Student) -> None:
    try:
        from library.models import LibraryMember
    except Exception:
        return

    member_code = f"LIB-STU-{student.id}"
    member = (
        LibraryMember.objects.filter(student=student).first()
        or LibraryMember.objects.filter(member_id=member_code).first()
    )
    if member:
        changed_fields = []
        if member.student_id != student.id:
            member.student = student
            changed_fields.append("student")
        if member.member_type != "Student":
            member.member_type = "Student"
            changed_fields.append("member_type")
        if not member.is_active:
            member.is_active = True
            changed_fields.append("is_active")
        if member.status != "Active":
            member.status = "Active"
            changed_fields.append("status")
        if changed_fields:
            member.save(update_fields=changed_fields)
        return

    LibraryMember.objects.create(
        member_id=member_code,
        member_type="Student",
        status="Active",
        student=student,
        is_active=True,
    )

# ... existing ViewSets

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.filter(is_active=True)
    serializer_class = TermSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "ACADEMICS"

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('academic_year', 'term', 'grade_level')
        search = self.request.query_params.get('search')
        category = self.request.query_params.get('category')
        is_active = self.request.query_params.get('is_active')

        if search:
            queryset = queryset.filter(name__icontains=search)
        if category:
            queryset = queryset.filter(category__iexact=category)
        if is_active is not None:
            normalized = str(is_active).lower()
            if normalized in ('true', '1'):
                queryset = queryset.filter(is_active=True)
            elif normalized in ('false', '0'):
                queryset = queryset.filter(is_active=False)

        return queryset.order_by('-id')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = Student.objects.all().order_by('-id')
        search = (self.request.query_params.get('search') or '').strip()
        gender = (self.request.query_params.get('gender') or '').strip()
        is_active = self.request.query_params.get('is_active')

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(admission_number__icontains=search)
            )
        if gender:
            queryset = queryset.filter(gender=gender)
        if is_active is not None and str(is_active).strip() != '':
            normalized = str(is_active).lower()
            if normalized in ('true', '1'):
                queryset = queryset.filter(is_active=True)
            elif normalized in ('false', '0'):
                queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        requested_admission_number = serializer.validated_data.get("admission_number")
        admission_number = _resolve_student_admission_number(requested_admission_number)
        if Student.objects.filter(admission_number=admission_number).exists():
            raise ValidationError({"admission_number": "Admission number already exists."})
        student = serializer.save(admission_number=admission_number)
        _sync_library_member_for_student(student)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        if not instance.is_active:
            raise ValidationError("Inactive/graduated student records are read-only.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='graduate')
    def graduate(self, request, pk=None):
        student = self.get_object()
        student.is_active = False
        student.save(update_fields=['is_active'])
        Enrollment.objects.filter(student=student, is_active=True).update(
            is_active=False,
            status='Completed',
            left_date=timezone.now().date(),
        )
        AuditLog.objects.create(
            user_id=request.user.id if getattr(request.user, "is_authenticated", False) else None,
            action="GRADUATE",
            model_name="Student",
            object_id=str(student.id),
            details=f"Student {student.admission_number} marked as graduated/inactive.",
        )
        return Response({"message": "Student graduated successfully.", "student_id": student.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='photo')
    def upload_photo(self, request, pk=None):
        student = self.get_object()
        photo = request.data.get('photo')
        if not photo:
            return Response({"error": "photo is required"}, status=status.HTTP_400_BAD_REQUEST)
        student.photo = photo
        student.save(update_fields=['photo'])
        return Response({"id": student.id, "photo": student.photo.url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='documents')
    def upload_documents(self, request, pk=None):
        student = self.get_object()
        files = request.FILES.getlist('documents')
        if not files:
            return Response({"error": "documents are required"}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        for upload in files:
            doc = StudentDocument.objects.create(student=student, file=upload)
            created.append({"id": doc.id, "name": doc.file.name, "url": doc.file.url})
        return Response({"documents": created}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='documents/(?P<doc_id>[^/.]+)')
    def delete_document(self, request, pk=None, doc_id=None):
        student = self.get_object()
        try:
            doc = StudentDocument.objects.get(id=doc_id, student=student)
        except StudentDocument.DoesNotExist:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='documents')
    def documents(self, request):
        queryset = _student_documents_queryset(request)
        page = self.paginate_queryset(queryset)
        target = page if page is not None else queryset

        rows = []
        for doc in target:
            file_url = doc.file.url if doc.file else ''
            rows.append(
                {
                    "id": doc.id,
                    "student_id": doc.student_id,
                    "student_name": f"{doc.student.first_name} {doc.student.last_name}".strip(),
                    "admission_number": doc.student.admission_number,
                    "file_name": _display_document_name(doc.file),
                    "url": request.build_absolute_uri(file_url) if file_url else '',
                    "uploaded_at": doc.uploaded_at,
                }
            )
        if page is not None:
            return self.get_paginated_response(rows)
        return Response({"count": len(rows), "results": rows}, status=status.HTTP_200_OK)

def _journal_get_or_create_account(code, name, account_type):
    """Find or create a Chart of Account entry for auto-journaling."""
    try:
        account, _ = ChartOfAccount.objects.get_or_create(
            code=code,
            defaults={'name': name, 'account_type': account_type, 'is_active': True},
        )
        return account
    except Exception:
        return None


def _auto_post_journal(entry_key, entry_date, memo, source_type, source_id, lines):
    """
    Create a balanced double-entry journal entry.
    `lines` is a list of (account, debit, credit, description) tuples.
    Skips silently if already posted or if any account is None.
    """
    try:
        if JournalEntry.objects.filter(entry_key=entry_key).exists():
            return
        if any(acct is None for acct, _, _, _ in lines):
            return
        entry = JournalEntry.objects.create(
            entry_date=entry_date,
            memo=memo,
            source_type=source_type,
            source_id=source_id,
            entry_key=entry_key,
        )
        for account, debit, credit, desc in lines:
            JournalLine.objects.create(
                entry=entry,
                account=account,
                debit=debit,
                credit=credit,
                description=desc,
            )
    except Exception:
        pass


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_active=True)
    serializer_class = InvoiceSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'delete', 'head', 'options'] # Disable PUT/PATCH (Immutability)
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('student', 'term')
        search = self.request.query_params.get('search')
        status_param = self.request.query_params.get('status')
        student = self.request.query_params.get('student')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_param:
            queryset = queryset.filter(status=status_param)
        if student:
            queryset = queryset.filter(student_id=student)
        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
        if search:
            query = (
                models.Q(student__admission_number__icontains=search)
                | models.Q(student__first_name__icontains=search)
                | models.Q(student__last_name__icontains=search)
            )
            digits = ''.join(ch for ch in str(search) if ch.isdigit())
            if digits:
                query |= models.Q(id=int(digits))
            queryset = queryset.filter(query)

        return queryset.order_by('-invoice_date', '-id')

    def perform_destroy(self, instance):
        # "Void" the invoice efficiently by hiding it
        instance.is_active = False
        instance.save()

    def create(self, request, *args, **kwargs):
        """ 
        Override create to use FinanceService.
        Expected Payload:
        {
            "student": 1,
            "term": 1,
            "due_date": "2023-12-31",
            "line_items": [
                {"fee_structure": 1, "amount": 500.00, "description": "Tuition"},
                {"fee_structure": 2, "amount": 100.00, "description": "Lab"}
            ]
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract data safely
        student = serializer.validated_data.get('student')
        term = serializer.validated_data.get('term')
        line_items = serializer.validated_data.get('line_items')
        due_date = serializer.validated_data.get('due_date')

        missing_fields = [
            field
            for field, value in {
                "student": student,
                "term": term,
                "due_date": due_date,
                "line_items": line_items,
            }.items()
            if not value
        ]

        if missing_fields:
            return Response(
                {
                    "error": "Required fields are missing.",
                    "missing": missing_fields,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call Service
        try:
            invoice = FinanceService.create_invoice(
                student=student,
                term=term,
                line_items_data=line_items,
                due_date=due_date,
                status=serializer.validated_data.get('status'),
                is_active=serializer.validated_data.get('is_active'),
            )
            # IPSAS: Auto double-entry journal — DR Accounts Receivable / CR Revenue
            total = sum(float(li.get('amount', 0)) for li in line_items) if line_items else 0
            if total > 0:
                ar = _journal_get_or_create_account('1100', 'Accounts Receivable', 'ASSET')
                rev = _journal_get_or_create_account('4000', 'Tuition & Fees Revenue', 'REVENUE')
                _auto_post_journal(
                    entry_key=f"INV-{invoice.id}",
                    entry_date=invoice.issue_date or invoice.created_at.date(),
                    memo=f"Invoice INV-{invoice.id} – Student {invoice.student_id}",
                    source_type='Invoice',
                    source_id=invoice.id,
                    lines=[
                        (ar, total, 0, 'Accounts Receivable'),
                        (rev, 0, total, 'Tuition & Fees Revenue'),
                    ],
                )
            # Return the created invoice
            response_serializer = self.get_serializer(invoice)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='status')
    def update_status(self, request, pk=None):
        invoice = self.get_object()
        target = request.data.get('status')
        if not target:
            return Response({"error": "status is required"}, status=status.HTTP_400_BAD_REQUEST)
        target = str(target).upper()

        allowed = {
            'DRAFT': {'ISSUED', 'VOID', 'CONFIRMED'},
            'CONFIRMED': {'ISSUED', 'VOID'},
            'ISSUED': {'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'},
            'PARTIALLY_PAID': {'PAID', 'OVERDUE', 'VOID'},
            'OVERDUE': {'PARTIALLY_PAID', 'PAID', 'VOID'},
            'PAID': {'VOID'},
            'VOID': set(),
        }

        if invoice.status == 'PAID' and target == 'VOID' and not _is_admin_like(request.user):
            return Response({"error": "Only admin can void paid invoices."}, status=status.HTTP_403_FORBIDDEN)
        if target not in allowed.get(invoice.status, set()):
            return Response(
                {"error": f"Invalid transition from {invoice.status} to {target}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = target
        invoice.save(update_fields=['status'])
        return Response(self.get_serializer(invoice).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='issue')
    def issue(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in {'DRAFT', 'CONFIRMED'}:
            return Response({"error": "Only draft/confirmed invoices can be issued."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = 'ISSUED'
        invoice.save(update_fields=['status'])
        return Response(self.get_serializer(invoice).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='generate-batch')
    def generate_batch(self, request):
        term_id = request.data.get('term')
        due_date = request.data.get('due_date')
        class_id = request.data.get('class_id')
        grade_level_id = request.data.get('grade_level_id')
        issue_immediately = bool(request.data.get('issue_immediately', True))

        if not term_id or not due_date:
            return Response({"error": "term and due_date are required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            term = Term.objects.get(id=term_id)
            result = FinanceService.generate_invoices_from_assignments(
                term=term,
                due_date=due_date,
                class_id=class_id,
                grade_level_id=grade_level_id,
                issue_immediately=issue_immediately,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Term.DoesNotExist:
            return Response({"error": "Invalid term"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'], url_path='installments')
    def create_installment_plan(self, request, pk=None):
        invoice = self.get_object()
        if request.method.lower() == 'get':
            plan = getattr(invoice, 'installment_plan', None)
            if not plan:
                return Response({"invoice": invoice.id, "installment_count": 0, "installments": []}, status=status.HTTP_200_OK)
            serializer = InvoiceInstallmentPlanSerializer(plan)
            return Response(serializer.data, status=status.HTTP_200_OK)
        installment_count = int(request.data.get('installment_count', 0))
        due_dates = request.data.get('due_dates') or []
        if not installment_count or not isinstance(due_dates, list):
            return Response(
                {"error": "installment_count and due_dates[] are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            plan = FinanceService.create_installment_plan(
                invoice=invoice,
                installment_count=installment_count,
                due_dates=due_dates,
                created_by=request.user,
            )
            serializer = InvoiceInstallmentPlanSerializer(plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='send-reminder')
    def send_reminder(self, request, pk=None):
        invoice = self.get_object()
        channel = str(request.data.get('channel') or 'EMAIL').upper()
        recipient = request.data.get('recipient')
        if channel not in {'EMAIL', 'SMS', 'INAPP'}:
            return Response({"error": "Unsupported channel"}, status=status.HTTP_400_BAD_REQUEST)
        result = FinanceService.send_invoice_reminder(
            invoice=invoice,
            channel=channel,
            recipient_override=recipient,
        )
        if result.get('error'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_active=True)
    serializer_class = PaymentSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'delete', 'head', 'options'] # Disable PUT/PATCH
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('student')
        search = self.request.query_params.get('search')
        student = self.request.query_params.get('student')
        payment_method = self.request.query_params.get('payment_method')
        allocation_status = self.request.query_params.get('allocation_status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if student:
            queryset = queryset.filter(student_id=student)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if date_from:
            queryset = queryset.filter(payment_date__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(payment_date__date__lte=date_to)
        if search:
            queryset = queryset.filter(
                models.Q(reference_number__icontains=search)
                | models.Q(receipt_number__icontains=search)
                | models.Q(invoice_number__icontains=search)
                | models.Q(payment_method__icontains=search)
                | models.Q(student__first_name__icontains=search)
                | models.Q(student__last_name__icontains=search)
                | models.Q(student__admission_number__icontains=search)
                | models.Q(allocations__invoice__invoice_number__icontains=search)
            ).distinct()
        if allocation_status in {'allocated', 'partial', 'unallocated'}:
            queryset = queryset.annotate(allocated_total=Sum('allocations__amount_allocated'))
            if allocation_status == 'allocated':
                queryset = queryset.filter(allocated_total__gte=models.F('amount'))
            elif allocation_status == 'partial':
                queryset = queryset.filter(allocated_total__gt=0, allocated_total__lt=models.F('amount'))
            elif allocation_status == 'unallocated':
                queryset = queryset.filter(models.Q(allocated_total__isnull=True) | models.Q(allocated_total=0))

        return queryset.order_by('-payment_date', '-id')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    def create(self, request, *args, **kwargs):
        """
        Records a payment.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment = FinanceService.record_payment(
                student=serializer.validated_data['student'],
                amount=serializer.validated_data['amount'],
                payment_method=serializer.validated_data['payment_method'],
                reference_number=serializer.validated_data['reference_number'],
                notes=serializer.validated_data.get('notes', '')
            )
            # IPSAS: Auto double-entry journal — DR Cash & Bank / CR Accounts Receivable
            amount = float(payment.amount or 0)
            if amount > 0:
                cash = _journal_get_or_create_account('1000', 'Cash and Bank', 'ASSET')
                ar = _journal_get_or_create_account('1100', 'Accounts Receivable', 'ASSET')
                _auto_post_journal(
                    entry_key=f"PAY-{payment.id}",
                    entry_date=payment.payment_date or payment.created_at.date(),
                    memo=f"Payment {payment.receipt_number or payment.id} – {payment.payment_method}",
                    source_type='Payment',
                    source_id=payment.id,
                    lines=[
                        (cash, amount, 0, 'Cash received'),
                        (ar, 0, amount, 'Accounts Receivable cleared'),
                    ],
                )
            response_serializer = self.get_serializer(payment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def allocate(self, request, pk=None):
        """
        Custom Action: /api/payments/{id}/allocate/
        Payload: { "invoice_id": 5, "amount": 200.00 }
        """
        payment = self.get_object()
        invoice_id = request.data.get('invoice_id')
        installment_id = request.data.get('installment_id')
        amount = request.data.get('amount')
        if not invoice_id or amount is None:
            return Response({"error": "invoice_id and amount are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import Invoice
            invoice = Invoice.objects.get(id=invoice_id, is_active=True)
            if installment_id:
                installment = InvoiceInstallment.objects.select_related('plan__invoice').get(
                    id=installment_id,
                    plan__invoice_id=invoice.id,
                )
                FinanceService.allocate_payment_to_installment(payment, installment, amount)
            else:
                FinanceService.allocate_payment(payment, invoice, amount)
            
            return Response({"message": "Allocation successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='auto-allocate')
    def auto_allocate(self, request, pk=None):
        payment = self.get_object()
        try:
            result = FinanceService.auto_allocate_payment(payment)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        payment = self.get_object()
        lines = [
            f"Receipt: {payment.receipt_number or 'N/A'}",
            f"Reference: {payment.reference_number}",
            f"Student: {payment.student}",
            f"Amount: {payment.amount}",
            f"Method: {payment.payment_method}",
            f"Date: {payment.payment_date}",
            f"Status: {'Reversed' if not payment.is_active else 'Active'}",
        ]
        content = "\n".join(lines)
        response = HttpResponse(content, content_type="text/plain")
        response["Content-Disposition"] = f'attachment; filename="receipt_{payment.id}.txt"'
        return response

    @action(detail=True, methods=['post'], url_path='reversal-request')
    def reversal_request(self, request, pk=None):
        payment = self.get_object()
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "reason is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            reversal = FinanceService.request_payment_reversal(
                payment=payment,
                reason=reason,
                requested_by=request.user,
            )
            return Response(PaymentReversalRequestSerializer(reversal).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reverse-approve')
    def reverse_approve(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can approve reversals."}, status=status.HTTP_403_FORBIDDEN)
        payment = self.get_object()
        reversal = payment.reversal_requests.filter(status='PENDING').order_by('-requested_at').first()
        if not reversal:
            return Response({"error": "No pending reversal request found."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            FinanceService.approve_payment_reversal(
                reversal_request=reversal,
                reviewed_by=request.user,
                review_notes=request.data.get('review_notes', ''),
            )
            return Response({"message": "Payment reversed successfully."}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reverse-reject')
    def reverse_reject(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can reject reversals."}, status=status.HTTP_403_FORBIDDEN)
        payment = self.get_object()
        reversal = payment.reversal_requests.filter(status='PENDING').order_by('-requested_at').first()
        if not reversal:
            return Response({"error": "No pending reversal request found."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            FinanceService.reject_payment_reversal(
                reversal_request=reversal,
                reviewed_by=request.user,
                review_notes=request.data.get('review_notes', ''),
            )
            return Response({"message": "Reversal request rejected."}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        # ==========================================
class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.filter(is_active=True)
    serializer_class = EnrollmentSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "STUDENTS"

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        
class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.filter(is_active=True)
    serializer_class = StaffSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "HR"

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response["Warning"] = "299 - Deprecated; use /api/hr/staff/"
        return response

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response["Warning"] = "299 - Deprecated; use /api/hr/staff/"
        return response

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().order_by('-date', '-created_at')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        status_param = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

class AttendanceSummaryView(APIView):
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        student_id = request.query_params.get('student_id')
        queryset = AttendanceRecord.objects.all()
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        total = queryset.count()
        present = queryset.filter(status='Present').count()
        absent = queryset.filter(status='Absent').count()
        late = queryset.filter(status='Late').count()

        attendance_rate = round((present / total) * 100, 2) if total else 0

        return Response({
            "attendance_rate": attendance_rate,
            "present": present,
            "absent": absent,
            "late": late,
            "period_label": "All time"
        }, status=status.HTTP_200_OK)

class BehaviorIncidentViewSet(viewsets.ModelViewSet):
    queryset = BehaviorIncident.objects.all().order_by('-incident_date', '-created_at')
    serializer_class = BehaviorIncidentSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        incident_type = self.request.query_params.get('incident_type')
        severity = self.request.query_params.get('severity')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if incident_type:
            queryset = queryset.filter(incident_type=incident_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if date_from:
            queryset = queryset.filter(incident_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(incident_date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.all().order_by('-updated_at')
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        search = (self.request.query_params.get('search') or '').strip()
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if search:
            queryset = queryset.filter(
                Q(student__admission_number__icontains=search)
                | Q(student__first_name__icontains=search)
                | Q(student__last_name__icontains=search)
                | Q(allergies__icontains=search)
                | Q(chronic_conditions__icontains=search)
                | Q(current_medications__icontains=search)
                | Q(doctor_name__icontains=search)
            )
        return queryset


class ImmunizationRecordViewSet(viewsets.ModelViewSet):
    queryset = ImmunizationRecord.objects.all().order_by('-date_administered', '-created_at')
    serializer_class = ImmunizationRecordSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        search = (self.request.query_params.get('search') or '').strip()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if search:
            queryset = queryset.filter(
                Q(student__admission_number__icontains=search)
                | Q(student__first_name__icontains=search)
                | Q(student__last_name__icontains=search)
                | Q(vaccine_name__icontains=search)
            )
        if date_from:
            queryset = queryset.filter(date_administered__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_administered__lte=date_to)
        return queryset


class ClinicVisitViewSet(viewsets.ModelViewSet):
    queryset = ClinicVisit.objects.all().order_by('-visit_date', '-created_at')
    serializer_class = ClinicVisitSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        severity = self.request.query_params.get('severity')
        search = (self.request.query_params.get('search') or '').strip()
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date_from:
            queryset = queryset.filter(visit_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(visit_date__lte=date_to)
        if severity:
            queryset = queryset.filter(severity=severity)
        if search:
            queryset = queryset.filter(
                Q(student__admission_number__icontains=search)
                | Q(student__first_name__icontains=search)
                | Q(student__last_name__icontains=search)
                | Q(complaint__icontains=search)
                | Q(treatment__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(attended_by=self.request.user)

class AdmissionApplicationViewSet(viewsets.ModelViewSet):
    queryset = AdmissionApplication.objects.all().order_by('-created_at')
    serializer_class = AdmissionApplicationSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        grade = self.request.query_params.get('grade')

        if status_param:
            queryset = queryset.filter(status=status_param)
        if grade:
            queryset = queryset.filter(applying_for_grade_id=grade)
        if search:
            queryset = queryset.filter(
                models.Q(application_number__icontains=search) |
                models.Q(student_first_name__icontains=search) |
                models.Q(student_last_name__icontains=search)
            )
        return queryset

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """
        Converts an application into a Student + Enrollment.
        Payload: {
          "assign_admission_number": true,
          "admission_number": "ADM-1001" (optional),
          "school_class": 1,
          "term": 2,
          "enrollment_date": "2026-02-20"
        }
        """
        application = self.get_object()
        if application.student_id:
            return Response({"error": "Application already enrolled."}, status=status.HTTP_400_BAD_REQUEST)

        school_class = request.data.get('school_class')
        term = request.data.get('term')
        if not school_class or not term:
            return Response({"error": "school_class and term are required."}, status=status.HTTP_400_BAD_REQUEST)

        gender_map = {'Male': 'M', 'Female': 'F', 'M': 'M', 'F': 'F'}
        gender = gender_map.get(application.student_gender)
        if not gender:
            return Response({"error": "Invalid student gender in application."}, status=status.HTTP_400_BAD_REQUEST)

        requested_admission_number = request.data.get('admission_number')
        try:
            admission_number = _resolve_student_admission_number(requested_admission_number)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        if Student.objects.filter(admission_number=admission_number).exists():
            return Response({"error": "admission_number already exists."}, status=status.HTTP_400_BAD_REQUEST)

        student = Student.objects.create(
            first_name=application.student_first_name,
            last_name=application.student_last_name,
            date_of_birth=application.student_dob,
            admission_number=admission_number,
            gender=gender,
            is_active=True,
        )
        enrollment_date = request.data.get('enrollment_date')
        Enrollment.objects.create(
            student=student,
            school_class_id=school_class,
            term_id=term,
            enrollment_date=enrollment_date or application.application_date,
            is_active=True,
        )

        application.student = student
        application.status = 'Enrolled'
        application.decision = 'Admitted'
        application.save(update_fields=['student', 'status', 'decision'])
        _sync_library_member_for_student(student)

        return Response({
            "message": "Enrollment complete",
            "student_id": student.id,
            "admission_number": student.admission_number
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='documents')
    def upload_documents(self, request, pk=None):
        application = self.get_object()
        files = request.FILES.getlist('documents_upload')
        if not files:
            return Response({"error": "documents_upload is required"}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        for upload in files:
            doc = AdmissionDocument.objects.create(application=application, file=upload)
            created.append({"id": doc.id, "name": doc.file.name, "url": doc.file.url})
        if created:
            if not application.documents:
                application.documents = []
            application.documents.extend([{"type": d["name"], "received": True} for d in created])
            application.save(update_fields=['documents'])
        return Response({"documents": created}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='documents/(?P<doc_id>[^/.]+)')
    def delete_document(self, request, pk=None, doc_id=None):
        application = self.get_object()
        try:
            doc = AdmissionDocument.objects.get(id=doc_id, application=application)
        except AdmissionDocument.DoesNotExist:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AdmissionsPipelineSummaryView(APIView):
    """
    Summary counts for admissions pipeline stages.
    """
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = AdmissionApplication.objects.all()
        status_param = request.query_params.get('status')
        grade = request.query_params.get('grade')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if status_param:
            queryset = queryset.filter(status=status_param)
        if grade:
            queryset = queryset.filter(applying_for_grade_id=grade)
        if date_from:
            queryset = queryset.filter(application_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(application_date__lte=date_to)

        counts = dict(
            queryset.values('status').annotate(total=Count('id')).values_list('status', 'total')
        )

        stages = [choice[0] for choice in AdmissionApplication.STATUS_CHOICES]
        ordered = {stage: counts.get(stage, 0) for stage in stages}

        return Response({
            "total": queryset.count(),
            "stages": stages,
            "counts": ordered,
        }, status=status.HTTP_200_OK)

class TenantSequenceResetView(APIView):
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "CORE"

    def post(self, request):
        schema = getattr(request.tenant, "schema_name", None)
        if not schema:
            return Response({"error": "Tenant schema not resolved."}, status=status.HTTP_400_BAD_REQUEST)

        reset = []
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO %s", [schema])
            cursor.execute(
                """
                SELECT tc.table_schema, tc.table_name, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = %s
                """,
                [schema],
            )
            rows = cursor.fetchall()
            for table_schema, table_name, column_name in rows:
                cursor.execute(
                    "SELECT pg_get_serial_sequence(%s, %s)",
                    [f"{table_schema}.{table_name}", column_name],
                )
                seq_name = cursor.fetchone()[0]
                if not seq_name:
                    continue
                query = pgsql.SQL(
                    """
                    SELECT setval(
                        {seq},
                        COALESCE((SELECT MAX({col}) FROM {schema}.{table}), 1),
                        (SELECT MAX({col}) IS NOT NULL FROM {schema}.{table})
                    )
                    """
                ).format(
                    seq=pgsql.Literal(seq_name),
                    col=pgsql.Identifier(column_name),
                    schema=pgsql.Identifier(table_schema),
                    table=pgsql.Identifier(table_name),
                )
                cursor.execute(query)
                reset.append({"table": f"{table_schema}.{table_name}", "sequence": seq_name})

        return Response({"schema": schema, "reset": reset}, status=status.HTTP_200_OK)

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "COMMUNICATION"

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response["Warning"] = "299 - Deprecated; use /api/communication/messages/"
        return response

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response["Warning"] = "299 - Deprecated; use /api/communication/messages/"
        return response

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.filter(is_active=True)
    serializer_class = ModuleSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "CORE"

    def get_queryset(self):
        queryset = Module.objects.filter(is_active=True)
        if module_focus_lock_enabled():
            queryset = queryset.filter(key__in=module_focus_keys())
        return queryset.order_by("key")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """
        Returns active modules assigned to the current user.
        """
        assignments = UserModuleAssignment.objects.filter(
            is_active=True,
            user=request.user,
            module__is_active=True
        ).select_related('module')
        if module_focus_lock_enabled():
            assignments = assignments.filter(module__key__in=module_focus_keys())
        modules = [a.module for a in assignments]
        serializer = self.get_serializer(modules, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserModuleAssignmentViewSet(viewsets.ModelViewSet):
    queryset = UserModuleAssignment.objects.filter(is_active=True)
    serializer_class = UserModuleAssignmentSerializer
    permission_classes = [IsSchoolAdmin, HasModuleAccess]
    module_key = "CORE"

    def get_queryset(self):
        queryset = super().get_queryset()
        if module_focus_lock_enabled():
            queryset = queryset.filter(module__key__in=module_focus_keys())
        user_id = self.request.query_params.get('user_id')
        module_key = self.request.query_params.get('module_key')

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if module_key:
            queryset = queryset.filter(module__key=module_key)

        return queryset

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        """
        Returns active module assignments (with metadata) for the current user.
        """
        assignments = UserModuleAssignment.objects.filter(
            is_active=True,
            user=request.user,
            module__is_active=True
        ).select_related('module', 'assigned_by')
        if module_focus_lock_enabled():
            assignments = assignments.filter(module__key__in=module_focus_keys())
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """
        Assign multiple modules to a user in one request.
        Payload: { "user_id": 1, "module_keys": ["FINANCE", "STUDENTS"] }
        """
        user_id = request.data.get('user_id')
        module_keys = request.data.get('module_keys', [])

        if not user_id or not isinstance(module_keys, list) or len(module_keys) == 0:
            return Response(
                {"error": "user_id and module_keys[] are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_keys = [str(key).strip().upper() for key in module_keys if str(key).strip()]
        if module_focus_lock_enabled():
            blocked = [key for key in normalized_keys if not is_module_allowed(key)]
            if blocked:
                return Response(
                    {
                        "error": "Requested modules are locked in focus mode.",
                        "blocked": blocked,
                        "allowed": sorted(list(module_focus_keys())),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        modules = list(Module.objects.filter(key__in=normalized_keys, is_active=True))
        found_keys = {m.key for m in modules}
        missing = [k for k in normalized_keys if k not in found_keys]
        if missing:
            return Response(
                {"error": "Invalid module_keys", "missing": missing},
                status=status.HTTP_400_BAD_REQUEST
            )

        created = 0
        reactivated = 0
        for module in modules:
            assignment, was_created = UserModuleAssignment.objects.get_or_create(
                user_id=user_id,
                module=module,
                defaults={'assigned_by': request.user, 'is_active': True}
            )
            if was_created:
                created += 1
            elif not assignment.is_active:
                assignment.is_active = True
                assignment.assigned_by = request.user
                assignment.save(update_fields=['is_active', 'assigned_by'])
                reactivated += 1

        return Response(
            {
                "message": "Bulk assignment complete",
                "created": created,
                "reactivated": reactivated,
                "modules": sorted(list(found_keys))
            },
            status=status.HTTP_200_OK
        )


class TenantModuleListView(APIView):
    """
    GET /api/tenant/modules
    Lists tenant-assigned modules with current module theme settings.
    """
    permission_classes = [IsSchoolAdmin]

    def get(self, request):
        tenant_modules = TenantModuleSettingsService.list_modules_for_tenant(user=request.user)
        serializer = TenantModuleSerializer(tenant_modules, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data}, status=status.HTTP_200_OK)


class TenantModuleSettingsView(APIView):
    """
    GET /api/tenant/modules/{id}/settings
    PUT /api/tenant/modules/{id}/settings
    """
    permission_classes = [IsSchoolAdmin]

    def get(self, request, module_id: int):
        tenant_module, settings_obj = TenantModuleSettingsService.get_module_settings(module_id, user=request.user)
        if not tenant_module or not settings_obj:
            return Response({"detail": "Module not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ModuleSettingSerializer(settings_obj).data, status=status.HTTP_200_OK)

    def put(self, request, module_id: int):
        tenant_module, settings_obj = TenantModuleSettingsService.get_module_settings(module_id, user=request.user)
        if not tenant_module or not settings_obj:
            return Response({"detail": "Module not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ModuleSettingSerializer(settings_obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(updated_by=request.user)
        return Response(ModuleSettingSerializer(updated).data, status=status.HTTP_200_OK)

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        category = self.request.query_params.get('category')
        approval_status = self.request.query_params.get('approval_status')
        vendor = self.request.query_params.get('vendor')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if search:
            queryset = queryset.filter(
                models.Q(category__icontains=search)
                | models.Q(description__icontains=search)
                | models.Q(vendor__icontains=search)
            )
        if category:
            queryset = queryset.filter(category=category)
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
        if vendor:
            queryset = queryset.filter(vendor__icontains=vendor)
        if date_from:
            queryset = queryset.filter(expense_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(expense_date__lte=date_to)

        return queryset.order_by('-expense_date', '-id')

    def perform_create(self, serializer):
        expense = serializer.save()
        # IPSAS: Auto double-entry journal — DR Operating Expense / CR Cash & Bank
        amount = float(expense.amount or 0)
        if amount > 0:
            exp_acct = _journal_get_or_create_account('6000', 'Operating Expenses', 'EXPENSE')
            cash = _journal_get_or_create_account('1000', 'Cash and Bank', 'ASSET')
            _auto_post_journal(
                entry_key=f"EXP-{expense.id}",
                entry_date=expense.expense_date,
                memo=f"Expense: {expense.category} – {expense.vendor or ''}".strip(' –'),
                source_type='Expense',
                source_id=expense.id,
                lines=[
                    (exp_acct, amount, 0, expense.category),
                    (cash, 0, amount, 'Cash disbursed'),
                ],
            )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class DepartmentViewSet(viewsets.ModelViewSet):
    """Shared department registry backed by hr.Department — all modules read from here."""
    serializer_class = HrDepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from hr.models import Department as HrDepartment
        return HrDepartment.objects.filter(is_active=True).order_by('name')

    def perform_create(self, serializer):
        import secrets
        name = serializer.validated_data['name']
        code = ''.join(c for c in name.upper().replace(' ', '_') if c.isalnum() or c == '_')[:20] or 'DEPT'
        if serializer.Meta.model.objects.filter(code=code).exists():
            code = (code[:16] + secrets.token_hex(2).upper())[:20]
        serializer.save(code=code)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.filter(is_active=True).select_related('academic_year', 'term')
    serializer_class = BudgetSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        term = self.request.query_params.get('term')

        if academic_year:
            if str(academic_year).isdigit():
                queryset = queryset.filter(academic_year_id=academic_year)
            else:
                queryset = queryset.filter(academic_year__name=academic_year)
        if term:
            queryset = queryset.filter(term_id=term)
        return queryset.order_by('-updated_at', '-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        out = self.get_serializer(instance)
        return Response(out.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class FeeAssignmentViewSet(viewsets.ModelViewSet):
    queryset = FeeAssignment.objects.all()
    serializer_class = FeeAssignmentSerializer
    permission_classes = [IsSchoolAdmin | IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('student', 'fee_structure')
        search = self.request.query_params.get('search')
        student = self.request.query_params.get('student')
        fee_structure = self.request.query_params.get('fee_structure')
        is_active = self.request.query_params.get('is_active')

        if search:
            queryset = queryset.filter(
                models.Q(student__first_name__icontains=search)
                | models.Q(student__last_name__icontains=search)
                | models.Q(student__admission_number__icontains=search)
                | models.Q(fee_structure__name__icontains=search)
            )
        if student:
            queryset = queryset.filter(student_id=student)
        if fee_structure:
            queryset = queryset.filter(fee_structure_id=fee_structure)
        if is_active is not None:
            normalized = str(is_active).lower()
            if normalized in ('true', '1'):
                queryset = queryset.filter(is_active=True)
            elif normalized in ('false', '0'):
                queryset = queryset.filter(is_active=False)
        return queryset.order_by('-id')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    def perform_create(self, serializer):
        try:
            assignment = FinanceService.assign_fee(
                student=serializer.validated_data['student'],
                fee_structure=serializer.validated_data['fee_structure'],
                discount_amount=serializer.validated_data.get('discount_amount', 0),
                user=self.request.user
            )
            assignment.start_date = serializer.validated_data.get('start_date')
            assignment.end_date = serializer.validated_data.get('end_date')
            assignment.is_active = serializer.validated_data.get('is_active', True)
            assignment.save(update_fields=['start_date', 'end_date', 'is_active'])
            serializer.instance = assignment
        except Exception as exc:
            raise ValidationError(str(exc))


class OptionalChargeViewSet(viewsets.ModelViewSet):
    queryset = OptionalCharge.objects.all()
    serializer_class = OptionalChargeSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('academic_year', 'term')
        category = self.request.query_params.get('category')
        is_active = self.request.query_params.get('is_active')
        if category:
            queryset = queryset.filter(category=category)
        if is_active is not None:
            normalized = str(is_active).lower()
            queryset = queryset.filter(is_active=(normalized in ('true', '1')))
        return queryset

class StudentOptionalChargeViewSet(viewsets.ModelViewSet):
    queryset = StudentOptionalCharge.objects.all()
    serializer_class = StudentOptionalChargeSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('student', 'optional_charge')
        student = self.request.query_params.get('student')
        optional_charge = self.request.query_params.get('optional_charge')
        is_paid = self.request.query_params.get('is_paid')
        if student:
            queryset = queryset.filter(student_id=student)
        if optional_charge:
            queryset = queryset.filter(optional_charge_id=optional_charge)
        if is_paid is not None:
            normalized = str(is_paid).lower()
            queryset = queryset.filter(is_paid=(normalized in ('true', '1')))
        return queryset


class ScholarshipAwardViewSet(viewsets.ModelViewSet):
    queryset = ScholarshipAward.objects.all().select_related('student', 'created_by', 'approved_by')
    serializer_class = ScholarshipAwardSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        student = self.request.query_params.get('student')
        status_param = self.request.query_params.get('status')
        is_active = self.request.query_params.get('is_active')

        if search:
            queryset = queryset.filter(
                models.Q(program_name__icontains=search)
                | models.Q(student__first_name__icontains=search)
                | models.Q(student__last_name__icontains=search)
                | models.Q(student__admission_number__icontains=search)
            )
        if student:
            queryset = queryset.filter(student_id=student)
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if is_active is not None:
            normalized = str(is_active).lower()
            if normalized in {'true', '1'}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {'false', '0'}:
                queryset = queryset.filter(is_active=False)
        return queryset.order_by('-created_at', '-id')

    def perform_create(self, serializer):
        approved_by = self.request.user if _is_admin_like(self.request.user) else None
        serializer.save(created_by=self.request.user, approved_by=approved_by)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.status = 'ENDED'
        instance.save(update_fields=['is_active', 'status', 'updated_at'])


class InvoiceAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = InvoiceAdjustment.objects.all()
    serializer_class = InvoiceAdjustmentSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset().select_related('adjusted_by', 'reviewed_by')
        search = self.request.query_params.get('search')
        invoice = self.request.query_params.get('invoice')
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        status_filter = self.request.query_params.get('status')

        if search:
            query = models.Q(reason__icontains=search)
            if str(search).isdigit():
                query |= models.Q(invoice_id=int(search))
            queryset = queryset.filter(query)
        if invoice:
            queryset = queryset.filter(invoice_id=invoice)
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset.order_by('-created_at', '-id')

    def perform_create(self, serializer):
        try:
            amount = serializer.validated_data['amount']
            auto_approve = _is_admin_like(self.request.user) and amount < _approval_threshold()
            adjustment = FinanceService.create_adjustment(
                invoice=serializer.validated_data['invoice'],
                amount=amount,
                reason=serializer.validated_data['reason'],
                user=self.request.user,
                adjustment_type=serializer.validated_data.get('adjustment_type', 'CREDIT'),
                auto_approve=auto_approve,
            )
            serializer.instance = adjustment
        except Exception as exc:
            raise ValidationError(str(exc))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can approve adjustments."}, status=status.HTTP_403_FORBIDDEN)
        adjustment = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            adjustment = FinanceService.approve_adjustment(adjustment, reviewer=request.user, review_notes=review_notes)
            return Response(self.get_serializer(adjustment).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can reject adjustments."}, status=status.HTTP_403_FORBIDDEN)
        adjustment = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            adjustment = FinanceService.reject_adjustment(adjustment, reviewer=request.user, review_notes=review_notes)
            return Response(self.get_serializer(adjustment).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentReversalRequestViewSet(viewsets.ModelViewSet):
    queryset = PaymentReversalRequest.objects.all().select_related('payment', 'requested_by', 'reviewed_by')
    serializer_class = PaymentReversalRequestSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        payment_id = self.request.query_params.get('payment')
        search = self.request.query_params.get('search')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)
        if search:
            queryset = queryset.filter(
                models.Q(reason__icontains=search)
                | models.Q(payment__reference_number__icontains=search)
                | models.Q(payment__receipt_number__icontains=search)
                | models.Q(payment__student__admission_number__icontains=search)
                | models.Q(payment__student__first_name__icontains=search)
                | models.Q(payment__student__last_name__icontains=search)
            )
        return queryset.order_by('-requested_at')

    def perform_create(self, serializer):
        try:
            reversal = FinanceService.request_payment_reversal(
                payment=serializer.validated_data['payment'],
                reason=serializer.validated_data['reason'],
                requested_by=self.request.user,
            )
            serializer.instance = reversal
        except Exception as exc:
            raise ValidationError(str(exc))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can approve reversals."}, status=status.HTTP_403_FORBIDDEN)
        reversal = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            reversal = FinanceService.approve_payment_reversal(
                reversal_request=reversal,
                reviewed_by=request.user,
                review_notes=review_notes,
            )
            return Response(self.get_serializer(reversal).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can reject reversals."}, status=status.HTTP_403_FORBIDDEN)
        reversal = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            reversal = FinanceService.reject_payment_reversal(
                reversal_request=reversal,
                reviewed_by=request.user,
                review_notes=review_notes,
            )
            return Response(self.get_serializer(reversal).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class InvoiceWriteOffRequestViewSet(viewsets.ModelViewSet):
    queryset = InvoiceWriteOffRequest.objects.all().select_related('invoice__student', 'requested_by', 'reviewed_by', 'applied_adjustment')
    serializer_class = InvoiceWriteOffRequestSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        invoice = self.request.query_params.get('invoice')
        search = self.request.query_params.get('search')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if invoice:
            queryset = queryset.filter(invoice_id=invoice)
        if search:
            queryset = queryset.filter(
                models.Q(reason__icontains=search)
                | models.Q(invoice__invoice_number__icontains=search)
                | models.Q(invoice__student__admission_number__icontains=search)
                | models.Q(invoice__student__first_name__icontains=search)
                | models.Q(invoice__student__last_name__icontains=search)
            )
        return queryset.order_by('-requested_at', '-id')

    def perform_create(self, serializer):
        try:
            writeoff = FinanceService.create_writeoff_request(
                invoice=serializer.validated_data['invoice'],
                amount=serializer.validated_data['amount'],
                reason=serializer.validated_data['reason'],
                requested_by=self.request.user,
            )
            serializer.instance = writeoff
        except Exception as exc:
            raise ValidationError(str(exc))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can approve write-offs."}, status=status.HTTP_403_FORBIDDEN)
        writeoff = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            writeoff = FinanceService.approve_writeoff_request(writeoff=writeoff, reviewer=request.user, review_notes=review_notes)
            return Response(self.get_serializer(writeoff).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can reject write-offs."}, status=status.HTTP_403_FORBIDDEN)
        writeoff = self.get_object()
        try:
            review_notes = request.data.get('review_notes') or ''
            writeoff = FinanceService.reject_writeoff_request(writeoff=writeoff, reviewer=request.user, review_notes=review_notes)
            return Response(self.get_serializer(writeoff).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class LateFeeRuleViewSet(viewsets.ModelViewSet):
    queryset = LateFeeRule.objects.all()
    serializer_class = LateFeeRuleSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = None

    @action(detail=False, methods=['post'], url_path='apply')
    def apply_rules(self, request):
        dry_run = str(request.data.get('dry_run', '')).lower() in {'true', '1', 'yes'}
        if dry_run:
            result = FinanceService.preview_late_fees()
            return Response(result, status=status.HTTP_200_OK)
        result = FinanceService.apply_late_fees(run_by=request.user)
        return Response(result, status=status.HTTP_200_OK)


class FeeReminderLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FeeReminderLog.objects.all().select_related('invoice')
    serializer_class = FeeReminderLogSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    @action(detail=False, methods=['post'], url_path='send-overdue')
    def send_overdue(self, request):
        channel = (request.data.get('channel') or 'EMAIL').upper()
        if channel not in {'EMAIL', 'SMS', 'INAPP'}:
            return Response({"error": "Unsupported channel"}, status=status.HTTP_400_BAD_REQUEST)
        result = FinanceService.send_overdue_reminders(channel=channel)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='send-scheduled')
    def send_scheduled(self, request):
        channel = (request.data.get('channel') or 'EMAIL').upper()
        mode = (request.data.get('mode') or 'OVERDUE').upper()
        days_before = request.data.get('days_before', 3)
        if channel not in {'EMAIL', 'SMS', 'INAPP'}:
            return Response({"error": "Unsupported channel"}, status=status.HTTP_400_BAD_REQUEST)
        if mode not in {'PRE_DUE', 'DUE', 'OVERDUE'}:
            return Response({"error": "Unsupported mode"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = FinanceService.send_scheduled_reminders(mode=mode, channel=channel, days_before=int(days_before))
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='send-installment-scheduled')
    def send_installment_scheduled(self, request):
        channel = (request.data.get('channel') or 'EMAIL').upper()
        mode = (request.data.get('mode') or 'OVERDUE').upper()
        days_before = request.data.get('days_before', 3)
        if channel not in {'EMAIL', 'SMS', 'INAPP'}:
            return Response({"error": "Unsupported channel"}, status=status.HTTP_400_BAD_REQUEST)
        if mode not in {'PRE_DUE', 'DUE', 'OVERDUE'}:
            return Response({"error": "Unsupported mode"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = FinanceService.send_installment_scheduled_reminders(
                mode=mode,
                channel=channel,
                days_before=int(days_before),
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AccountingPeriodViewSet(viewsets.ModelViewSet):
    queryset = AccountingPeriod.objects.all()
    serializer_class = AccountingPeriodSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        return super().get_queryset().order_by('-start_date', '-id')

    @action(detail=True, methods=['post'], url_path='close')
    def close_period(self, request, pk=None):
        period = self.get_object()
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can close periods."}, status=status.HTTP_403_FORBIDDEN)
        if period.is_closed:
            return Response({"error": "Period already closed."}, status=status.HTTP_400_BAD_REQUEST)
        period.is_closed = True
        period.closed_by = request.user
        period.closed_at = timezone.now()
        period.save(update_fields=['is_closed', 'closed_by', 'closed_at'])
        return Response(self.get_serializer(period).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reopen')
    def reopen_period(self, request, pk=None):
        period = self.get_object()
        if not _is_admin_like(request.user):
            return Response({"error": "Only admin can reopen periods."}, status=status.HTTP_403_FORBIDDEN)
        if not period.is_closed:
            return Response({"error": "Period is not closed."}, status=status.HTTP_400_BAD_REQUEST)
        period.is_closed = False
        period.closed_by = None
        period.closed_at = None
        period.save(update_fields=['is_closed', 'closed_by', 'closed_at'])
        return Response(self.get_serializer(period).data, status=status.HTTP_200_OK)


class ChartOfAccountViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        account_type = self.request.query_params.get('account_type')
        if search:
            queryset = queryset.filter(models.Q(code__icontains=search) | models.Q(name__icontains=search))
        if account_type:
            queryset = queryset.filter(account_type=account_type)
        return queryset.order_by('code')


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalEntry.objects.all().prefetch_related('lines__account')
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        account_id = self.request.query_params.get('account_id')
        if date_from:
            queryset = queryset.filter(entry_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(entry_date__lte=date_to)
        if account_id:
            queryset = queryset.filter(lines__account_id=account_id).distinct()
        return queryset.order_by('-entry_date', '-id')


class AccountingTrialBalanceView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        lines = JournalLine.objects.select_related('account', 'entry')
        if date_from:
            lines = lines.filter(entry__entry_date__gte=date_from)
        if date_to:
            lines = lines.filter(entry__entry_date__lte=date_to)

        by_account = {}
        for line in lines:
            key = line.account_id
            if key not in by_account:
                by_account[key] = {
                    "account_id": line.account_id,
                    "code": line.account.code,
                    "name": line.account.name,
                    "type": line.account.account_type,
                    "debit": 0,
                    "credit": 0,
                }
            by_account[key]["debit"] += float(line.debit)
            by_account[key]["credit"] += float(line.credit)

        rows = sorted(by_account.values(), key=lambda x: x["code"])
        total_debit = round(sum(row["debit"] for row in rows), 2)
        total_credit = round(sum(row["credit"] for row in rows), 2)
        return Response(
            {
                "rows": rows,
                "total_debit": total_debit,
                "total_credit": total_credit,
                "is_balanced": round(total_debit - total_credit, 2) == 0,
            },
            status=status.HTTP_200_OK,
        )


class AccountingLedgerView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        account_id = request.query_params.get('account_id')
        if not account_id:
            return Response({"error": "account_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        lines = JournalLine.objects.select_related('entry', 'account').filter(account_id=account_id)
        if date_from:
            lines = lines.filter(entry__entry_date__gte=date_from)
        if date_to:
            lines = lines.filter(entry__entry_date__lte=date_to)
        lines = lines.order_by('entry__entry_date', 'id')

        running = 0.0
        rows = []
        for line in lines:
            running += float(line.debit) - float(line.credit)
            rows.append(
                {
                    "entry_id": line.entry_id,
                    "entry_date": line.entry.entry_date,
                    "memo": line.entry.memo,
                    "source_type": line.entry.source_type,
                    "source_id": line.entry.source_id,
                    "debit": float(line.debit),
                    "credit": float(line.credit),
                    "running_balance": round(running, 2),
                }
            )

        return Response({"account_id": int(account_id), "rows": rows, "closing_balance": round(running, 2)})


class PaymentGatewayTransactionViewSet(viewsets.ModelViewSet):
    queryset = PaymentGatewayTransaction.objects.all().select_related('student', 'invoice')
    serializer_class = PaymentGatewayTransactionSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        queryset = super().get_queryset()
        provider = self.request.query_params.get('provider')
        status_param = self.request.query_params.get('status')
        is_reconciled = self.request.query_params.get('is_reconciled')
        student_id = self.request.query_params.get('student')
        invoice_id = self.request.query_params.get('invoice')
        search = self.request.query_params.get('search')

        if provider:
            queryset = queryset.filter(provider__iexact=provider)
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if is_reconciled is not None:
            normalized = str(is_reconciled).lower()
            if normalized in {'true', '1'}:
                queryset = queryset.filter(is_reconciled=True)
            elif normalized in {'false', '0'}:
                queryset = queryset.filter(is_reconciled=False)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        if search:
            queryset = queryset.filter(
                models.Q(external_id__icontains=search)
                | models.Q(provider__icontains=search)
            )
        return queryset.order_by('-created_at', '-id')

    @action(detail=True, methods=['post'], url_path='mark-reconciled')
    def mark_reconciled(self, request, pk=None):
        tx = self.get_object()
        tx.is_reconciled = True
        tx.save(update_fields=['is_reconciled', 'updated_at'])
        return Response(self.get_serializer(tx).data, status=status.HTTP_200_OK)


class PaymentGatewayWebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentGatewayWebhookEvent.objects.all()
    serializer_class = PaymentGatewayWebhookEventSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        provider = self.request.query_params.get('provider')
        processed = self.request.query_params.get('processed')
        if provider:
            queryset = queryset.filter(provider__iexact=provider)
        if processed is not None:
            normalized = str(processed).lower()
            if normalized in {'true', '1'}:
                queryset = queryset.filter(processed=True)
            elif normalized in {'false', '0'}:
                queryset = queryset.filter(processed=False)
        return queryset.order_by('-received_at', '-id')


class FinanceGatewayWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    @staticmethod
    def _extract_token(request):
        header_token = request.headers.get('X-Webhook-Token', '')
        if header_token:
            return header_token.strip()
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            return auth.split(' ', 1)[1].strip()
        return ''

    @staticmethod
    def _extract_signature(request):
        signature = request.headers.get('X-Webhook-Signature', '') or request.headers.get('X-Signature', '')
        return signature.strip()

    @staticmethod
    def _verify_request(request, raw_body):
        expected_token = getattr(settings, "FINANCE_WEBHOOK_TOKEN", "")
        expected_secret = getattr(settings, "FINANCE_WEBHOOK_SHARED_SECRET", "")
        strict_mode = bool(getattr(settings, "FINANCE_WEBHOOK_STRICT_MODE", True))

        if not expected_token and not expected_secret:
            if strict_mode:
                return False, "Finance webhook verification is not configured."
            return True, ""

        token = FinanceGatewayWebhookView._extract_token(request)
        if expected_token and token != expected_token:
            return False, "Invalid webhook token"

        signature = FinanceGatewayWebhookView._extract_signature(request)
        if expected_secret:
            digest = hmac.new(
                expected_secret.encode('utf-8'),
                raw_body,
                hashlib.sha256,
            ).hexdigest()
            provided = signature
            if provided.lower().startswith('sha256='):
                provided = provided.split('=', 1)[1].strip()
            if not provided or not hmac.compare_digest(provided, digest):
                return False, "Invalid webhook signature"

        return True, ""

    def post(self, request, provider):
        raw_body = request.body or b""
        ok, error = self._verify_request(request, raw_body)
        if not ok:
            return Response({"error": error}, status=status.HTTP_401_UNAUTHORIZED)

        payload = request.data if isinstance(request.data, dict) else {}
        event_id = (
            payload.get("event_id")
            or payload.get("id")
            or payload.get("webhook_id")
        )
        if not event_id:
            body_hash = hashlib.sha256(raw_body or json.dumps(payload, sort_keys=True).encode('utf-8')).hexdigest()
            event_id = f"{provider}-{body_hash}"
        event_type = payload.get("event_type") or payload.get("type") or "unknown"
        signature = self._extract_signature(request)

        event, created = FinanceService.ingest_gateway_webhook(
            provider=provider,
            event_id=str(event_id),
            event_type=str(event_type),
            signature=signature,
            payload=payload,
        )
        return Response(
            {
                "id": event.id,
                "event_id": event.event_id,
                "processed": event.processed,
                "duplicate": not created,
                "error": event.error,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class BankStatementLineViewSet(viewsets.ModelViewSet):
    queryset = BankStatementLine.objects.all().select_related('matched_payment', 'matched_gateway_transaction')
    serializer_class = BankStatementLineSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        source = self.request.query_params.get('source')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if source:
            queryset = queryset.filter(source__iexact=source)
        if date_from:
            queryset = queryset.filter(statement_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(statement_date__lte=date_to)
        if search:
            queryset = queryset.filter(
                models.Q(reference__icontains=search) | models.Q(narration__icontains=search)
            )
        return queryset.order_by('-statement_date', '-id')

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response({"error": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = upload.read().decode('utf-8-sig')
        except Exception:
            return Response({"error": "Unable to read CSV file."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(decoded.splitlines())
        if not reader.fieldnames:
            return Response({"error": "CSV header is missing."}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        errors = []
        for idx, row in enumerate(reader, start=2):
            try:
                statement_date_raw = (row.get('statement_date') or '').strip()
                amount_raw = (row.get('amount') or '').strip()
                if not statement_date_raw or not amount_raw:
                    raise ValueError("statement_date and amount are required")
                statement_date = datetime.strptime(statement_date_raw, '%Y-%m-%d').date()
                value_date_raw = (row.get('value_date') or '').strip()
                value_date = datetime.strptime(value_date_raw, '%Y-%m-%d').date() if value_date_raw else None

                BankStatementLine.objects.create(
                    statement_date=statement_date,
                    value_date=value_date,
                    amount=amount_raw,
                    reference=(row.get('reference') or '').strip(),
                    narration=(row.get('narration') or '').strip(),
                    source=(row.get('source') or 'csv').strip() or 'csv',
                    status='UNMATCHED',
                )
                created += 1
            except Exception as exc:
                errors.append({"row": idx, "error": str(exc)})

        return Response(
            {
                "created": created,
                "failed": len(errors),
                "errors": errors[:25],
            },
            status=status.HTTP_201_CREATED if created > 0 else status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        lines = self.get_queryset()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="finance_bank_statement_lines.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'id', 'statement_date', 'value_date', 'amount', 'reference',
            'narration', 'source', 'status', 'matched_payment_reference', 'matched_gateway_external_id'
        ])
        for line in lines:
            writer.writerow([
                line.id,
                line.statement_date,
                line.value_date or '',
                line.amount,
                line.reference,
                line.narration,
                line.source,
                line.status,
                getattr(line.matched_payment, 'reference_number', ''),
                getattr(line.matched_gateway_transaction, 'external_id', ''),
            ])
        return response

    @action(detail=True, methods=['post'], url_path='auto-match')
    def auto_match(self, request, pk=None):
        line = self.get_object()
        line = FinanceService.reconcile_bank_line(line)
        return Response(self.get_serializer(line).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='clear')
    def clear(self, request, pk=None):
        line = self.get_object()
        if not line.matched_payment and not line.matched_gateway_transaction:
            return Response(
                {"error": "Line must be matched before clearing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        line.status = 'CLEARED'
        line.save(update_fields=['status'])
        return Response(self.get_serializer(line).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='ignore')
    def ignore(self, request, pk=None):
        line = self.get_object()
        line.status = 'IGNORED'
        line.save(update_fields=['status'])
        return Response(self.get_serializer(line).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unmatch')
    def unmatch(self, request, pk=None):
        line = self.get_object()
        line.matched_payment = None
        line.matched_gateway_transaction = None
        line.status = 'UNMATCHED'
        line.save(update_fields=['matched_payment', 'matched_gateway_transaction', 'status'])
        return Response(self.get_serializer(line).data, status=status.HTTP_200_OK)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsSchoolAdmin | IsAccountant, HasModuleAccess]
    module_key = "REPORTING"

class FinancialSummaryView(APIView):
    """
    Reporting Endpoint: Aggregates financial data.
    Read-only. No state changes.
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        return Response(FinanceService.get_summary())


class FinanceReceivablesAgingView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        today = timezone.now().date()
        buckets = {
            "0_30": {"count": 0, "amount": 0.0},
            "31_60": {"count": 0, "amount": 0.0},
            "61_90": {"count": 0, "amount": 0.0},
            "90_plus": {"count": 0, "amount": 0.0},
        }
        invoices = Invoice.objects.filter(is_active=True).exclude(status='VOID').select_related('student')
        for invoice in invoices:
            FinanceService.sync_invoice_status(invoice)
            balance = float(invoice.balance_due)
            if balance <= 0:
                continue
            overdue_days = max(0, (today - invoice.due_date).days)
            if overdue_days <= 30:
                key = "0_30"
            elif overdue_days <= 60:
                key = "31_60"
            elif overdue_days <= 90:
                key = "61_90"
            else:
                key = "90_plus"
            buckets[key]["count"] += 1
            buckets[key]["amount"] += balance

        for key in buckets:
            buckets[key]["amount"] = round(buckets[key]["amount"], 2)
        return Response({"as_of": str(today), "buckets": buckets}, status=status.HTTP_200_OK)


class FinanceOverdueAccountsView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        today = timezone.now().date()
        search = (request.query_params.get('search') or '').strip().lower()
        rows = []
        invoices = Invoice.objects.filter(is_active=True).exclude(status='VOID').select_related('student').order_by('due_date', 'id')
        for invoice in invoices:
            FinanceService.sync_invoice_status(invoice)
            balance = float(invoice.balance_due)
            if balance <= 0:
                continue
            overdue_days = max(0, (today - invoice.due_date).days)
            if overdue_days <= 0 and invoice.status not in {'OVERDUE', 'PARTIALLY_PAID', 'ISSUED', 'CONFIRMED'}:
                continue
            student_name = f"{invoice.student.first_name} {invoice.student.last_name}".strip()
            row = {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number or f"INV-{invoice.id}",
                "student_id": invoice.student_id,
                "student_name": student_name,
                "admission_number": invoice.student.admission_number,
                "due_date": str(invoice.due_date),
                "status": invoice.status,
                "balance_due": round(balance, 2),
                "overdue_days": overdue_days,
            }
            searchable = f"{row['invoice_number']} {row['student_name']} {row['admission_number']}".lower()
            if search and search not in searchable:
                continue
            rows.append(row)
        return Response({"count": len(rows), "results": rows}, status=status.HTTP_200_OK)


class FinanceInstallmentAgingView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        today = timezone.now().date()
        buckets = {
            "0_30": {"count": 0, "amount": 0.0},
            "31_60": {"count": 0, "amount": 0.0},
            "61_90": {"count": 0, "amount": 0.0},
            "90_plus": {"count": 0, "amount": 0.0},
        }
        installments = InvoiceInstallment.objects.select_related('plan__invoice').exclude(status='WAIVED')
        for installment in installments:
            if installment.status == 'PAID':
                continue
            overdue_days = max(0, (today - installment.due_date).days)
            if overdue_days <= 30:
                key = "0_30"
            elif overdue_days <= 60:
                key = "31_60"
            elif overdue_days <= 90:
                key = "61_90"
            else:
                key = "90_plus"
            buckets[key]["count"] += 1
            buckets[key]["amount"] += float(installment.amount)

        for key in buckets:
            buckets[key]["amount"] = round(buckets[key]["amount"], 2)
        return Response({"as_of": str(today), "buckets": buckets}, status=status.HTTP_200_OK)


class FinanceReceivablesAgingCsvExportView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        today = timezone.now().date()
        buckets = {
            "0_30": {"count": 0, "amount": 0.0},
            "31_60": {"count": 0, "amount": 0.0},
            "61_90": {"count": 0, "amount": 0.0},
            "90_plus": {"count": 0, "amount": 0.0},
        }
        invoices = Invoice.objects.filter(is_active=True).exclude(status='VOID').select_related('student')
        for invoice in invoices:
            FinanceService.sync_invoice_status(invoice)
            balance = float(invoice.balance_due)
            if balance <= 0:
                continue
            overdue_days = max(0, (today - invoice.due_date).days)
            if overdue_days <= 30:
                key = "0_30"
            elif overdue_days <= 60:
                key = "31_60"
            elif overdue_days <= 90:
                key = "61_90"
            else:
                key = "90_plus"
            buckets[key]["count"] += 1
            buckets[key]["amount"] += balance

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="finance_receivables_aging.csv"'
        writer = csv.writer(response)
        writer.writerow(['as_of', str(today)])
        writer.writerow(['bucket', 'invoice_count', 'amount'])
        for key, label in [('0_30', '0-30'), ('31_60', '31-60'), ('61_90', '61-90'), ('90_plus', '90+')]:
            writer.writerow([label, buckets[key]['count'], round(buckets[key]['amount'], 2)])
        return response


class FinanceOverdueAccountsCsvExportView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        today = timezone.now().date()
        search = (request.query_params.get('search') or '').strip().lower()
        rows = []
        invoices = Invoice.objects.filter(is_active=True).exclude(status='VOID').select_related('student').order_by('due_date', 'id')
        for invoice in invoices:
            FinanceService.sync_invoice_status(invoice)
            balance = float(invoice.balance_due)
            if balance <= 0:
                continue
            overdue_days = max(0, (today - invoice.due_date).days)
            if overdue_days <= 0 and invoice.status not in {'OVERDUE', 'PARTIALLY_PAID', 'ISSUED', 'CONFIRMED'}:
                continue
            student_name = f"{invoice.student.first_name} {invoice.student.last_name}".strip()
            invoice_number = invoice.invoice_number or f"INV-{invoice.id}"
            searchable = f"{invoice_number} {student_name} {invoice.student.admission_number}".lower()
            if search and search not in searchable:
                continue
            rows.append({
                "invoice_id": invoice.id,
                "invoice_number": invoice_number,
                "student_name": student_name,
                "admission_number": invoice.student.admission_number,
                "due_date": str(invoice.due_date),
                "status": invoice.status,
                "balance_due": round(balance, 2),
                "overdue_days": overdue_days,
            })

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="finance_overdue_accounts.csv"'
        writer = csv.writer(response)
        writer.writerow(['invoice_id', 'invoice_number', 'student_name', 'admission_number', 'due_date', 'status', 'balance_due', 'overdue_days'])
        for row in rows:
            writer.writerow([
                row['invoice_id'],
                row['invoice_number'],
                row['student_name'],
                row['admission_number'],
                row['due_date'],
                row['status'],
                row['balance_due'],
                row['overdue_days'],
            ])
        return response

class StudentsSummaryView(APIView):
    """
    Summary endpoint for Students module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        return Response(StudentsService.get_summary())


class StudentsDashboardView(APIView):
    """
    Operational dashboard payload for Students module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        summary = StudentsService.get_summary()
        attendance_qs = AttendanceRecord.objects.all()
        total_attendance = attendance_qs.count()
        present = attendance_qs.filter(status='Present').count()
        attendance_rate = round((present / total_attendance) * 100, 2) if total_attendance else 0

        pending_statuses = ['Submitted', 'Documents Received', 'Interview Scheduled', 'Assessed']
        pending_admissions = AdmissionApplication.objects.filter(status__in=pending_statuses).count()

        low_attendance_students = (
            attendance_qs.values('student_id')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(status='Present')),
            )
        )
        low_attendance_count = 0
        for row in low_attendance_students:
            total = row.get('total', 0) or 0
            if total < 3:
                continue
            rate = ((row.get('present', 0) or 0) / total) * 100
            if rate < 85:
                low_attendance_count += 1

        # Track critical incidents over a full month so operational alerts don't miss
        # serious issues that happened outside a strict 2-week window.
        recent_cutoff = timezone.now().date() - timedelta(days=30)
        critical_behavior_count = BehaviorIncident.objects.filter(
            incident_date__gte=recent_cutoff,
            severity__in=['High', 'Critical'],
        ).count()

        activity = []
        for record in AttendanceRecord.objects.select_related('student').order_by('-date', '-id')[:4]:
            activity.append(
                {
                    "type": "Attendance",
                    "date": record.date.isoformat(),
                    "label": f"{record.student.first_name} {record.student.last_name}: {record.status}",
                    "student_id": record.student_id,
                }
            )
        for incident in BehaviorIncident.objects.select_related('student').order_by('-incident_date', '-id')[:4]:
            activity.append(
                {
                    "type": "Behavior",
                    "date": incident.incident_date.isoformat(),
                    "label": (
                        f"{incident.student.first_name} {incident.student.last_name}: "
                        f"{incident.incident_type} ({incident.severity or 'Unspecified'})"
                    ),
                    "student_id": incident.student_id,
                }
            )
        for app in AdmissionApplication.objects.order_by('-application_date', '-id')[:4]:
            activity.append(
                {
                    "type": "Admission",
                    "date": app.application_date.isoformat(),
                    "label": f"{app.student_first_name} {app.student_last_name}: {app.status}",
                    "student_id": app.student_id,
                }
            )
        activity.sort(key=lambda row: row['date'], reverse=True)

        return Response(
            {
                "kpis": {
                    "students_active": summary.get('students_active', 0),
                    "enrollments_active": summary.get('enrollments_active', 0),
                    "attendance_rate": attendance_rate,
                    "pending_admissions": pending_admissions,
                },
                "alerts": {
                    "low_attendance_students": low_attendance_count,
                    "critical_behavior_incidents": critical_behavior_count,
                },
                "recent_activity": activity[:8],
            },
            status=status.HTTP_200_OK,
        )

class SchoolProfileView(APIView):
    """
    Tenant school profile for branding/print headers.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        profile = SchoolProfile.objects.filter(is_active=True).first()
        serializer = SchoolProfileSerializer(profile) if profile else None
        profile_data = serializer.data if serializer else None
        if profile_data and profile_data.get("logo_url"):
            profile_data["logo_url"] = request.build_absolute_uri(profile_data["logo_url"])
        tenant = getattr(request, "tenant", None)
        return Response({
            "tenant": {
                "name": getattr(tenant, "name", None),
                "schema": getattr(tenant, "schema_name", None),
            },
            "profile": profile_data,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        if not _is_admin_like(request.user):
            return Response(
                {"error": "Only tenant admins can update school profile settings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = SchoolProfile.objects.filter(is_active=True).first()
        if not profile:
            tenant = getattr(request, "tenant", None)
            profile = SchoolProfile.objects.create(
                school_name=getattr(tenant, "name", None) or "School",
                is_active=True,
            )

        serializer = SchoolProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        payload = serializer.data
        if payload.get("logo_url"):
            payload["logo_url"] = request.build_absolute_uri(payload["logo_url"])
        return Response(payload, status=status.HTTP_200_OK)

class StudentsModuleReportView(APIView):
    """
    Module-wide report summary for Students.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    @staticmethod
    def build_report_data():
        students_qs = Student.objects.filter(is_active=True)
        enrollments_qs = Enrollment.objects.filter(is_active=True)

        gender_counts = dict(
            students_qs.values('gender').annotate(total=Count('id')).values_list('gender', 'total')
        )

        attendance_qs = AttendanceRecord.objects.all()
        total_attendance = attendance_qs.count()
        present = attendance_qs.filter(status='Present').count()
        absent = attendance_qs.filter(status='Absent').count()
        late = attendance_qs.filter(status='Late').count()
        attendance_rate = round((present / total_attendance) * 100, 2) if total_attendance else 0

        behavior_qs = BehaviorIncident.objects.all()
        behavior_counts = dict(
            behavior_qs.values('incident_type').annotate(total=Count('id')).values_list('incident_type', 'total')
        )

        return {
            "students_active": students_qs.count(),
            "enrollments_active": enrollments_qs.count(),
            "demographics": gender_counts,
            "attendance": {
                "attendance_rate": attendance_rate,
                "present": present,
                "absent": absent,
                "late": late,
            },
            "behavior": behavior_counts,
        }

    def get(self, request):
        return Response(self.build_report_data(), status=status.HTTP_200_OK)


class StudentReportView(APIView):
    """
    Individual student report summary for printing.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    @staticmethod
    def build_report_data(student_id):
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return None

        guardians = list(student.guardians.values('id', 'name', 'relationship', 'phone', 'email'))
        enrollment = Enrollment.objects.filter(student=student, is_active=True).order_by('-id').first()

        attendance_qs = AttendanceRecord.objects.filter(student=student)
        total_attendance = attendance_qs.count()
        present = attendance_qs.filter(status='Present').count()
        absent = attendance_qs.filter(status='Absent').count()
        late = attendance_qs.filter(status='Late').count()
        attendance_rate = round((present / total_attendance) * 100, 2) if total_attendance else 0

        behavior_qs = BehaviorIncident.objects.filter(student=student).order_by('-incident_date')[:10]
        behavior_items = list(behavior_qs.values('incident_type', 'category', 'incident_date', 'severity', 'description'))

        medical_record = MedicalRecord.objects.filter(student=student).first()
        clinic_visits = list(
            ClinicVisit.objects.filter(student=student).order_by('-visit_date')[:5].values(
                'visit_date', 'complaint', 'treatment', 'severity', 'parent_notified'
            )
        )

        documents = [
            {"id": doc.id, "name": doc.file.name, "url": doc.file.url, "uploaded_at": doc.uploaded_at}
            for doc in student.uploaded_documents.all()
        ]

        return {
            "student": {
                "id": student.id,
                "admission_number": student.admission_number,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "gender": student.gender,
                "date_of_birth": student.date_of_birth,
                "photo": student.photo.url if student.photo else None,
            },
            "guardians": guardians,
            "enrollment": {
                "class_id": enrollment.school_class_id if enrollment else None,
                "term_id": enrollment.term_id if enrollment else None,
                "enrollment_date": enrollment.enrollment_date if enrollment else None,
            },
            "attendance": {
                "attendance_rate": attendance_rate,
                "present": present,
                "absent": absent,
                "late": late,
            },
            "behavior": behavior_items,
            "medical": {
                "record": MedicalRecordSerializer(medical_record).data if medical_record else None,
                "visits": clinic_visits,
            },
            "documents": documents,
        }

    def get(self, request, student_id):
        report = self.build_report_data(student_id)
        if report is None:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(report, status=status.HTTP_200_OK)


class StudentOperationalSummaryView(APIView):
    """
    Consolidated operational data endpoint for Student Profile drilldown tabs.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request, student_id):
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        attendance_qs = AttendanceRecord.objects.filter(student=student)
        total_attendance = attendance_qs.count()
        present = attendance_qs.filter(status='Present').count()
        absent = attendance_qs.filter(status='Absent').count()
        late = attendance_qs.filter(status='Late').count()
        attendance_rate = round((present / total_attendance) * 100, 2) if total_attendance else 0

        attendance_records = list(
            attendance_qs.order_by('-date', '-created_at').values(
                'id', 'date', 'status', 'notes'
            )[:10]
        )

        behavior_records = list(
            BehaviorIncident.objects.filter(student=student)
            .order_by('-incident_date', '-created_at')
            .values('id', 'incident_type', 'category', 'incident_date', 'severity', 'description')[:10]
        )

        medical_record = MedicalRecord.objects.filter(student=student).first()
        clinic_visits = list(
            ClinicVisit.objects.filter(student=student)
            .order_by('-visit_date', '-created_at')
            .values('id', 'visit_date', 'complaint', 'treatment', 'severity', 'parent_notified')[:5]
        )

        return Response(
            {
                "attendance": {
                    "summary": {
                        "attendance_rate": attendance_rate,
                        "present": present,
                        "absent": absent,
                        "late": late,
                        "period_label": "All time",
                    },
                    "records": attendance_records,
                },
                "behavior": behavior_records,
                "academics": [],
                "medical": {
                    "record": MedicalRecordSerializer(medical_record).data if medical_record else None,
                    "visits": clinic_visits,
                },
            },
            status=status.HTTP_200_OK,
        )


class StudentsModuleReportCsvExportView(APIView):
    """
    CSV export for module-wide students report.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        report = StudentsModuleReportView.build_report_data()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students_module_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['section', 'metric', 'value'])
        writer.writerow(['summary', 'students_active', report.get('students_active', 0)])
        writer.writerow(['summary', 'enrollments_active', report.get('enrollments_active', 0)])

        attendance = report.get('attendance', {})
        writer.writerow(['attendance', 'attendance_rate', attendance.get('attendance_rate', 0)])
        writer.writerow(['attendance', 'present', attendance.get('present', 0)])
        writer.writerow(['attendance', 'absent', attendance.get('absent', 0)])
        writer.writerow(['attendance', 'late', attendance.get('late', 0)])

        for gender, total in (report.get('demographics') or {}).items():
            writer.writerow(['demographics', gender, total])

        for incident_type, total in (report.get('behavior') or {}).items():
            writer.writerow(['behavior', incident_type, total])

        return response


class StudentReportCsvExportView(APIView):
    """
    CSV export for individual student report.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request, student_id):
        report = StudentReportView.build_report_data(student_id)
        if report is None:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="student_report_{student_id}.csv"'
        writer = csv.writer(response)
        writer.writerow(['section', 'field', 'value'])

        student = report.get('student', {})
        writer.writerow(['student', 'id', student.get('id')])
        writer.writerow(['student', 'admission_number', student.get('admission_number')])
        writer.writerow(['student', 'first_name', student.get('first_name')])
        writer.writerow(['student', 'last_name', student.get('last_name')])
        writer.writerow(['student', 'gender', student.get('gender')])
        writer.writerow(['student', 'date_of_birth', student.get('date_of_birth')])

        enrollment = report.get('enrollment', {})
        writer.writerow(['enrollment', 'class_id', enrollment.get('class_id')])
        writer.writerow(['enrollment', 'term_id', enrollment.get('term_id')])
        writer.writerow(['enrollment', 'enrollment_date', enrollment.get('enrollment_date')])

        attendance = report.get('attendance', {})
        writer.writerow(['attendance', 'attendance_rate', attendance.get('attendance_rate')])
        writer.writerow(['attendance', 'present', attendance.get('present')])
        writer.writerow(['attendance', 'absent', attendance.get('absent')])
        writer.writerow(['attendance', 'late', attendance.get('late')])

        for guardian in report.get('guardians', []):
            writer.writerow(['guardian', 'name', guardian.get('name')])
            writer.writerow(['guardian', 'relationship', guardian.get('relationship')])
            writer.writerow(['guardian', 'phone', guardian.get('phone')])
            writer.writerow(['guardian', 'email', guardian.get('email')])

        for incident in report.get('behavior', []):
            writer.writerow(['behavior', 'incident_type', incident.get('incident_type')])
            writer.writerow(['behavior', 'category', incident.get('category')])
            writer.writerow(['behavior', 'incident_date', incident.get('incident_date')])
            writer.writerow(['behavior', 'severity', incident.get('severity')])
            writer.writerow(['behavior', 'description', incident.get('description')])

        medical_record = (report.get('medical') or {}).get('record') or {}
        writer.writerow(['medical', 'blood_type', medical_record.get('blood_type')])
        writer.writerow(['medical', 'allergies', medical_record.get('allergies')])
        writer.writerow(['medical', 'chronic_conditions', medical_record.get('chronic_conditions')])
        writer.writerow(['medical', 'current_medications', medical_record.get('current_medications')])
        writer.writerow(['medical', 'doctor_name', medical_record.get('doctor_name')])
        writer.writerow(['medical', 'doctor_phone', medical_record.get('doctor_phone')])

        for visit in (report.get('medical') or {}).get('visits', []):
            writer.writerow(['clinic_visit', 'visit_date', visit.get('visit_date')])
            writer.writerow(['clinic_visit', 'complaint', visit.get('complaint')])
            writer.writerow(['clinic_visit', 'treatment', visit.get('treatment')])
            writer.writerow(['clinic_visit', 'severity', visit.get('severity')])
            writer.writerow(['clinic_visit', 'parent_notified', visit.get('parent_notified')])

        for doc in report.get('documents', []):
            writer.writerow(['document', 'name', doc.get('name')])
            writer.writerow(['document', 'url', doc.get('url')])
            writer.writerow(['document', 'uploaded_at', doc.get('uploaded_at')])

        return response


def _resolve_tenant_pdf_meta(request):
    profile = SchoolProfile.objects.filter(is_active=True).first()
    tenant = getattr(request, "tenant", None)
    return {
        "school_name": (profile.school_name if profile else None) or getattr(tenant, "name", None) or getattr(tenant, "schema_name", "Tenant"),
        "address": profile.address if profile else "",
        "phone": profile.phone if profile else "",
        "logo_path": profile.logo.path if profile and profile.logo else None,
        "schema": getattr(tenant, "schema_name", None),
    }


def _safe_cell(value):
    if value is None:
        return ""
    return str(value)


def _students_directory_queryset(request):
    queryset = Student.objects.all().order_by('-id')
    search = (request.query_params.get('search') or '').strip()
    gender = (request.query_params.get('gender') or '').strip()
    is_active = request.query_params.get('is_active')

    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(admission_number__icontains=search)
        )
    if gender:
        queryset = queryset.filter(gender=gender)
    if is_active is not None and str(is_active).strip() != '':
        normalized = str(is_active).lower()
        if normalized in ('true', '1'):
            queryset = queryset.filter(is_active=True)
        elif normalized in ('false', '0'):
            queryset = queryset.filter(is_active=False)
    return queryset


def _student_documents_queryset(request):
    queryset = StudentDocument.objects.select_related('student').all().order_by('-uploaded_at')
    student_id = request.query_params.get('student_id') or request.query_params.get('student')
    search = (request.query_params.get('search') or '').strip()
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if student_id:
        queryset = queryset.filter(student_id=student_id)
    if search:
        queryset = queryset.filter(
            Q(file__icontains=search)
            | Q(student__admission_number__icontains=search)
            | Q(student__first_name__icontains=search)
            | Q(student__last_name__icontains=search)
        )
    if date_from:
        queryset = queryset.filter(uploaded_at__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(uploaded_at__date__lte=date_to)
    return queryset


class StudentsModuleReportPdfExportView(APIView):
    """
    PDF export for module-wide students report.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        report = StudentsModuleReportView.build_report_data()
        tenant_meta = _resolve_tenant_pdf_meta(request)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Students Module Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))

        story.append(Paragraph("<b>Students Module Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        summary_data = [
            ["Metric", "Value"],
            ["Active Students", _safe_cell(report.get("students_active"))],
            ["Active Enrollments", _safe_cell(report.get("enrollments_active"))],
            ["Attendance Rate", f"{_safe_cell((report.get('attendance') or {}).get('attendance_rate'))}%"],
            ["Present", _safe_cell((report.get("attendance") or {}).get("present"))],
            ["Absent", _safe_cell((report.get("attendance") or {}).get("absent"))],
            ["Late", _safe_cell((report.get("attendance") or {}).get("late"))],
        ]
        summary_table = Table(summary_data, colWidths=[220, 220])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 12))

        demographics = report.get("demographics") or {}
        if demographics:
            story.append(Paragraph("<b>Demographics</b>", styles["Heading3"]))
            demo_rows = [["Gender", "Count"]] + [[_safe_cell(k), _safe_cell(v)] for k, v in demographics.items()]
            demo_table = Table(demo_rows, colWidths=[220, 220])
            demo_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ]))
            story.append(demo_table)
            story.append(Spacer(1, 12))

        behavior = report.get("behavior") or {}
        if behavior:
            story.append(Paragraph("<b>Behavior Summary</b>", styles["Heading3"]))
            behavior_rows = [["Incident Type", "Count"]] + [[_safe_cell(k), _safe_cell(v)] for k, v in behavior.items()]
            behavior_table = Table(behavior_rows, colWidths=[220, 220])
            behavior_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ]))
            story.append(behavior_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="students_module_report.pdf"'
        return response


class StudentReportPdfExportView(APIView):
    """
    PDF export for individual student report.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request, student_id):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        report = StudentReportView.build_report_data(student_id)
        if report is None:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        student = report.get("student", {})
        attendance = report.get("attendance") or {}
        enrollment = report.get("enrollment") or {}

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Student Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))

        story.append(
            Paragraph(
                f"<b>Student Report: {_safe_cell(student.get('first_name'))} {_safe_cell(student.get('last_name'))}</b>",
                styles["Heading2"],
            )
        )

        student_data = [
            ["Field", "Value"],
            ["Admission Number", _safe_cell(student.get("admission_number"))],
            ["Gender", _safe_cell(student.get("gender"))],
            ["Date of Birth", _safe_cell(student.get("date_of_birth"))],
            ["Class ID", _safe_cell(enrollment.get("class_id"))],
            ["Term ID", _safe_cell(enrollment.get("term_id"))],
            ["Enrollment Date", _safe_cell(enrollment.get("enrollment_date"))],
            ["Attendance Rate", f"{_safe_cell(attendance.get('attendance_rate'))}%"],
            ["Present", _safe_cell(attendance.get("present"))],
            ["Absent", _safe_cell(attendance.get("absent"))],
            ["Late", _safe_cell(attendance.get("late"))],
        ]
        student_table = Table(student_data, colWidths=[200, 240])
        student_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]))
        story.append(student_table)
        story.append(Spacer(1, 12))

        guardians = report.get("guardians") or []
        if guardians:
            story.append(Paragraph("<b>Guardians</b>", styles["Heading3"]))
            guardian_rows = [["Name", "Relationship", "Phone", "Email"]]
            for guardian in guardians:
                guardian_rows.append([
                    _safe_cell(guardian.get("name")),
                    _safe_cell(guardian.get("relationship")),
                    _safe_cell(guardian.get("phone")),
                    _safe_cell(guardian.get("email")),
                ])
            guardian_table = Table(guardian_rows, colWidths=[120, 110, 100, 110])
            guardian_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]))
            story.append(guardian_table)
            story.append(Spacer(1, 12))

        behavior_items = report.get("behavior") or []
        if behavior_items:
            story.append(Paragraph("<b>Behavior (Latest)</b>", styles["Heading3"]))
            behavior_rows = [["Type", "Category", "Date", "Severity"]]
            for incident in behavior_items:
                behavior_rows.append([
                    _safe_cell(incident.get("incident_type")),
                    _safe_cell(incident.get("category")),
                    _safe_cell(incident.get("incident_date")),
                    _safe_cell(incident.get("severity")),
                ])
            behavior_table = Table(behavior_rows, colWidths=[100, 160, 100, 80])
            behavior_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]))
            story.append(behavior_table)
            story.append(Spacer(1, 12))

        documents = report.get("documents") or []
        if documents:
            story.append(Paragraph("<b>Documents</b>", styles["Heading3"]))
            doc_rows = [["Name", "Uploaded At"]]
            for doc_item in documents:
                doc_rows.append([
                    _safe_cell(doc_item.get("name")),
                    _safe_cell(doc_item.get("uploaded_at")),
                ])
            doc_table = Table(doc_rows, colWidths=[300, 140])
            doc_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]))
            story.append(doc_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="student_report_{student_id}.pdf"'
        return response


class StudentsDirectoryCsvExportView(APIView):
    """CSV export for student directory."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = _students_directory_queryset(request)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students_directory.csv"'
        writer = csv.writer(response)
        writer.writerow(['admission_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'status'])
        for student in queryset:
            writer.writerow([
                student.admission_number,
                student.first_name,
                student.last_name,
                student.gender,
                student.date_of_birth,
                'Active' if student.is_active else 'Inactive',
            ])
        return response


class StudentsDirectoryPdfExportView(APIView):
    """PDF export for student directory."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = _students_directory_queryset(request)
        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Students Directory")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Students Directory</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        rows = [['Admission #', 'Name', 'Gender', 'DOB', 'Status']]
        for student in queryset[:300]:
            rows.append([
                _safe_cell(student.admission_number),
                _safe_cell(f"{student.first_name} {student.last_name}"),
                _safe_cell(student.gender),
                _safe_cell(student.date_of_birth),
                'Active' if student.is_active else 'Inactive',
            ])

        table = Table(rows, colWidths=[90, 150, 70, 90, 70])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)

        if queryset.count() > 300:
            story.append(Spacer(1, 8))
            story.append(Paragraph("Note: Export truncated to first 300 rows for PDF readability.", styles["Italic"]))

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="students_directory.pdf"'
        return response


class MedicalProfilesCsvExportView(APIView):
    """CSV export for student medical profiles."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = MedicalRecord.objects.select_related('student').all().order_by('-updated_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medical_profiles_report.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'student_name', 'student_id', 'blood_type', 'allergies', 'chronic_conditions',
            'current_medications', 'doctor_name', 'doctor_phone', 'updated_at'
        ])
        for row in queryset:
            writer.writerow([
                f"{row.student.first_name} {row.student.last_name}".strip(),
                row.student_id,
                row.blood_type or '',
                row.allergies or '',
                row.chronic_conditions or '',
                row.current_medications or '',
                row.doctor_name or '',
                row.doctor_phone or '',
                row.updated_at,
            ])
        return response


class MedicalProfilesPdfExportView(APIView):
    """PDF export for student medical profiles."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = MedicalRecord.objects.select_related('student').all().order_by('-updated_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Medical Profiles Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass
        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph("<b>Medical Profiles Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 8))

        rows = [["Student", "Blood Type", "Allergies", "Updated"]]
        for row in queryset[:300]:
            rows.append([
                _safe_cell(f"{row.student.first_name} {row.student.last_name}"),
                _safe_cell(row.blood_type),
                _safe_cell((row.allergies or '')[:40]),
                _safe_cell(row.updated_at.date()),
            ])
        table = Table(rows, colWidths=[160, 70, 170, 70])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)
        doc.build(story)

        pdf_data = buffer.getvalue()
        buffer.close()
        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="medical_profiles_report.pdf"'
        return response


class MedicalImmunizationsCsvExportView(APIView):
    """CSV export for student immunizations."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = ImmunizationRecord.objects.select_related('student').all().order_by('-date_administered', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medical_immunizations_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['student_name', 'student_id', 'vaccine_name', 'date_administered', 'booster_due_date'])
        for row in queryset:
            writer.writerow([
                f"{row.student.first_name} {row.student.last_name}".strip(),
                row.student_id,
                row.vaccine_name,
                row.date_administered,
                row.booster_due_date or '',
            ])
        return response


class MedicalImmunizationsPdfExportView(APIView):
    """PDF export for student immunizations."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = ImmunizationRecord.objects.select_related('student').all().order_by('-date_administered', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Medical Immunizations Report")
        styles = getSampleStyleSheet()
        story = []
        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass
        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph("<b>Medical Immunizations Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 8))

        rows = [["Student", "Vaccine", "Date", "Booster Due"]]
        for row in queryset[:300]:
            rows.append([
                _safe_cell(f"{row.student.first_name} {row.student.last_name}"),
                _safe_cell(row.vaccine_name),
                _safe_cell(row.date_administered),
                _safe_cell(row.booster_due_date),
            ])
        table = Table(rows, colWidths=[140, 150, 80, 100])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)
        doc.build(story)

        pdf_data = buffer.getvalue()
        buffer.close()
        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="medical_immunizations_report.pdf"'
        return response


class MedicalClinicVisitsCsvExportView(APIView):
    """CSV export for clinic visits."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = ClinicVisit.objects.select_related('student').all().order_by('-visit_date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date_from:
            queryset = queryset.filter(visit_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(visit_date__lte=date_to)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medical_clinic_visits_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['student_name', 'student_id', 'visit_date', 'complaint', 'treatment', 'severity', 'parent_notified'])
        for row in queryset:
            writer.writerow([
                f"{row.student.first_name} {row.student.last_name}".strip(),
                row.student_id,
                row.visit_date,
                row.complaint or '',
                row.treatment or '',
                row.severity or '',
                'Yes' if row.parent_notified else 'No',
            ])
        return response


class MedicalClinicVisitsPdfExportView(APIView):
    """PDF export for clinic visits."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = ClinicVisit.objects.select_related('student').all().order_by('-visit_date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date_from:
            queryset = queryset.filter(visit_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(visit_date__lte=date_to)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Clinic Visits Report")
        styles = getSampleStyleSheet()
        story = []
        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass
        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph("<b>Clinic Visits Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 8))

        rows = [["Student", "Visit Date", "Complaint", "Severity", "Parent Notified"]]
        for row in queryset[:300]:
            rows.append([
                _safe_cell(f"{row.student.first_name} {row.student.last_name}"),
                _safe_cell(row.visit_date),
                _safe_cell((row.complaint or '')[:35]),
                _safe_cell(row.severity),
                'Yes' if row.parent_notified else 'No',
            ])
        table = Table(rows, colWidths=[120, 80, 160, 60, 80])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)
        doc.build(story)

        pdf_data = buffer.getvalue()
        buffer.close()
        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="medical_clinic_visits_report.pdf"'
        return response


class StudentsDocumentsCsvExportView(APIView):
    """CSV export for student documents register."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = _student_documents_queryset(request)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students_documents_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['student_name', 'admission_number', 'file_name', 'file_url', 'uploaded_at'])
        for doc in queryset:
            file_url = doc.file.url if doc.file else ''
            writer.writerow([
                f"{doc.student.first_name} {doc.student.last_name}".strip(),
                doc.student.admission_number,
                _display_document_name(doc.file),
                request.build_absolute_uri(file_url) if file_url else '',
                doc.uploaded_at,
            ])
        return response


class StudentsDocumentsPdfExportView(APIView):
    """PDF export for student documents register."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = _student_documents_queryset(request)
        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Students Documents Report")
        styles = getSampleStyleSheet()
        story = []
        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass
        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph("<b>Students Documents Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 8))

        rows = [["Student", "Admission #", "File", "Uploaded At"]]
        for doc_row in queryset[:300]:
            rows.append([
                _safe_cell(f"{doc_row.student.first_name} {doc_row.student.last_name}"),
                _safe_cell(doc_row.student.admission_number),
                _safe_cell(doc_row.file.name.split('/')[-1] if doc_row.file else ''),
                _safe_cell(doc_row.uploaded_at.date()),
            ])
        table = Table(rows, colWidths=[130, 90, 150, 90])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)
        doc.build(story)

        pdf_data = buffer.getvalue()
        buffer.close()
        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="students_documents_report.pdf"'
        return response


class AcademicsSummaryView(APIView):
    """
    Summary endpoint for Academics module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ACADEMICS"

    def get(self, request):
        return Response(AcademicsService.get_summary())

class HrSummaryView(APIView):
    """
    Summary endpoint for Human Resources module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "HR"

    def get(self, request):
        return Response(HrService.get_summary())

class CommunicationSummaryView(APIView):
    """
    Summary endpoint for Communication module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "COMMUNICATION"

    def get(self, request):
        return Response(CommunicationService.get_summary())

class CoreSummaryView(APIView):
    """
    Summary endpoint for Core Administration module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "CORE"

    def get(self, request):
        return Response(CoreService.get_summary())

class ReportingSummaryView(APIView):
    """
    Summary endpoint for Reporting module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "REPORTING"

    def get(self, request):
        return Response(ReportingService.get_summary())

class FinanceStudentRefView(APIView):
    """
    Read-only reference data for Finance module.
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        is_active = request.query_params.get('active')
        class_id = request.query_params.get('class_id')
        term_id = request.query_params.get('term_id')
        order_by = request.query_params.get('order_by', 'admission_number')
        order_dir = request.query_params.get('order_dir', 'asc')
        limit = request.query_params.get('limit')
        offset = request.query_params.get('offset')

        allowed_order = {'id', 'admission_number', 'first_name', 'last_name'}
        if order_by not in allowed_order:
            order_by = 'admission_number'
        if order_dir == 'desc':
            order_by = f"-{order_by}"

        queryset = Student.objects.all()
        if is_active is None or is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() == 'false':
            queryset = queryset.filter(is_active=False)

        if class_id or term_id:
            enrollments = Enrollment.objects.filter(is_active=True)
            if class_id:
                enrollments = enrollments.filter(school_class_id=class_id)
            if term_id:
                enrollments = enrollments.filter(term_id=term_id)
            queryset = queryset.filter(id__in=enrollments.values_list('student_id', flat=True))

        queryset = queryset.order_by(order_by)

        if limit is not None or offset is not None:
            try:
                limit_val = int(limit) if limit is not None else 50
                offset_val = int(offset) if offset is not None else 0
            except ValueError:
                return Response({"error": "limit and offset must be integers"}, status=status.HTTP_400_BAD_REQUEST)

            if limit_val > 200:
                limit_val = 200

            total = queryset.count()
            page = list(queryset[offset_val:offset_val + limit_val])
            serializer = FinanceStudentRefSerializer(page, many=True)
            next_offset = offset_val + limit_val
            if next_offset >= total:
                next_offset = None

            return Response({
                "count": total,
                "next_offset": next_offset,
                "results": serializer.data
            }, status=status.HTTP_200_OK)

        serializer = FinanceStudentRefSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FinanceStudentDetailView(APIView):
    """
    Finance-safe student detail endpoint (includes guardians).
    This avoids requiring STUDENTS module access for finance workflows.
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request, student_id):
        student = get_object_or_404(Student, id=student_id)
        serializer = StudentSerializer(student)
        return Response(serializer.data, status=status.HTTP_200_OK)

class FinanceEnrollmentRefView(APIView):
    """
    Read-only enrollment references for Finance module.
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        is_active = request.query_params.get('active')
        class_id = request.query_params.get('class_id')
        term_id = request.query_params.get('term_id')
        student_id = request.query_params.get('student_id')
        order_by = request.query_params.get('order_by', 'id')
        order_dir = request.query_params.get('order_dir', 'asc')
        limit = request.query_params.get('limit')
        offset = request.query_params.get('offset')

        allowed_order = {'id', 'student_id', 'school_class_id', 'term_id'}
        if order_by not in allowed_order:
            order_by = 'id'
        if order_dir == 'desc':
            order_by = f"-{order_by}"

        queryset = Enrollment.objects.all()
        if is_active is None or is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() == 'false':
            queryset = queryset.filter(is_active=False)

        if class_id:
            queryset = queryset.filter(school_class_id=class_id)
        if term_id:
            queryset = queryset.filter(term_id=term_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        queryset = queryset.order_by(order_by)

        if limit is not None or offset is not None:
            try:
                limit_val = int(limit) if limit is not None else 50
                offset_val = int(offset) if offset is not None else 0
            except ValueError:
                return Response({"error": "limit and offset must be integers"}, status=status.HTTP_400_BAD_REQUEST)

            if limit_val > 200:
                limit_val = 200

            total = queryset.count()
            page = list(queryset[offset_val:offset_val + limit_val])
            serializer = FinanceEnrollmentRefSerializer(page, many=True)
            next_offset = offset_val + limit_val
            if next_offset >= total:
                next_offset = None

            return Response({
                "count": total,
                "next_offset": next_offset,
                "results": serializer.data
            }, status=status.HTTP_200_OK)

        serializer = FinanceEnrollmentRefSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class FinanceClassRefView(APIView):
    """
    Returns active SchoolClass list with enrolled student counts.
    Used by fee-assignment-by-class form.
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        term_id = request.query_params.get('term_id')
        qs = SchoolClass.objects.filter(is_active=True).order_by('name')
        result = []
        for sc in qs:
            enrollment_qs = Enrollment.objects.filter(school_class_id=sc.id, is_active=True)
            if term_id:
                enrollment_qs = enrollment_qs.filter(term_id=term_id)
            result.append({
                'id': sc.id,
                'name': sc.display_name,
                'stream': sc.stream,
                'student_count': enrollment_qs.count(),
            })
        return Response(result)


class BulkFeeAssignByClassView(APIView):
    """
    POST: Assigns a fee structure to every enrolled student in a given class/term.
    Body: { class_id, fee_structure_id, term_id (optional), discount_amount (optional) }
    Returns: { created, updated, skipped, student_count }
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def post(self, request):
        class_id = request.data.get('class_id')
        fee_structure_id = request.data.get('fee_structure_id')
        term_id = request.data.get('term_id')
        discount_amount = request.data.get('discount_amount', 0)

        if not class_id:
            return Response({'error': 'class_id is required.'}, status=400)
        if not fee_structure_id:
            return Response({'error': 'fee_structure_id is required.'}, status=400)

        try:
            school_class = SchoolClass.objects.get(id=class_id)
        except SchoolClass.DoesNotExist:
            return Response({'error': 'Class not found.'}, status=404)

        try:
            fee_structure = FeeStructure.objects.get(id=fee_structure_id)
        except FeeStructure.DoesNotExist:
            return Response({'error': 'Fee structure not found.'}, status=404)

        try:
            discount = float(discount_amount or 0)
        except (ValueError, TypeError):
            return Response({'error': 'discount_amount must be a number.'}, status=400)

        enrollments = Enrollment.objects.filter(school_class_id=school_class.id, is_active=True)
        if term_id:
            enrollments = enrollments.filter(term_id=term_id)

        student_ids = list(enrollments.values_list('student_id', flat=True).distinct())
        if not student_ids:
            return Response({
                'created': 0, 'updated': 0, 'student_count': 0,
                'message': 'No enrolled students found in this class/term combination.'
            })

        created_count = 0
        updated_count = 0
        for student_id in student_ids:
            existing = FeeAssignment.objects.filter(
                student_id=student_id, fee_structure=fee_structure, is_active=True
            ).first()
            if existing:
                existing.discount_amount = discount
                existing.save(update_fields=['discount_amount'])
                updated_count += 1
            else:
                FeeAssignment.objects.create(
                    student_id=student_id,
                    fee_structure=fee_structure,
                    discount_amount=discount,
                    is_active=True,
                )
                created_count += 1

        return Response({
            'created': created_count,
            'updated': updated_count,
            'student_count': len(student_ids),
            'class_name': school_class.display_name,
            'fee_structure': fee_structure.name,
            'message': f'Assigned "{fee_structure.name}" to {len(student_ids)} students in {school_class.display_name}.',
        })


class SchoolDashboardView(APIView):
    """
    Executive Overview for Tenant Admin.
    Aggregates high-level counts. Read-Only.
    """
    permission_classes = [IsSchoolAdmin | IsAccountant, HasModuleAccess]
    module_key = "REPORTING"

    def get(self, request):
        return Response({
            "students_active": Student.objects.filter(is_active=True).count(),
            "staff_active": Staff.objects.filter(is_active=True).count(),
            "invoices_pending": Invoice.objects.filter(is_active=True, status='CONFIRMED').count(), # Approximate
            "enrollments_this_year": Enrollment.objects.filter(is_active=True).count()
        })

class DashboardRoutingView(APIView):
    """
    Returns routing instructions based on module assignments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role_name = None
        if hasattr(request.user, 'userprofile'):
            role_name = request.user.userprofile.role.name

        if role_name in ['ADMIN', 'TENANT_SUPER_ADMIN']:
            modules = list(Module.objects.filter(is_active=True).order_by('key').values('key', 'name'))
        else:
            assignments = UserModuleAssignment.objects.filter(
                is_active=True,
                user=request.user,
                module__is_active=True
            ).select_related('module').order_by('module__key')
            modules = [{'key': a.module.key, 'name': a.module.name} for a in assignments]

        modules = [module for module in modules if is_module_allowed(module.get("key"))]

        module_count = len(modules)
        if module_count == 1:
            target = "MODULE"
            target_module = modules[0]['key']
        else:
            target = "MAIN"
            target_module = None

        return Response({
            "user": request.user.username,
            "role": role_name,
            "permissions": self._build_permissions(role_name, modules),
            "module_count": module_count,
            "modules": modules,
            "target": target,
            "target_module": target_module
        })

    @staticmethod
    def _build_permissions(role_name, modules):
        permissions = {"settings:view"}
        module_keys = {m["key"] for m in modules}

        if role_name in ["ADMIN", "TENANT_SUPER_ADMIN"]:
            permissions.update({"settings:debug", "finance:settings:view"})
        elif role_name in ["ACCOUNTANT"]:
            permissions.add("finance:settings:view")

        if "FINANCE" in module_keys:
            permissions.add("finance:settings:view")

        return sorted(permissions)

class DashboardSummaryView(APIView):
    """
    Aggregated, read-only summaries across modules for the main dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role_name = None
        if hasattr(request.user, 'userprofile'):
            role_name = request.user.userprofile.role.name

        if role_name in ['ADMIN', 'TENANT_SUPER_ADMIN']:
            modules = list(Module.objects.filter(is_active=True).order_by('key').values('key', 'name'))
        else:
            modules = list(UserModuleAssignment.objects.filter(
                is_active=True,
                user=request.user,
                module__is_active=True
            ).select_related('module').order_by('module__key').values('module__key', 'module__name'))

            # Normalize keys for non-admin users
            modules = [{'key': m['module__key'], 'name': m['module__name']} for m in modules]

        modules = [module for module in modules if is_module_allowed(module.get("key"))]

        module_keys = [m['key'] for m in modules]

        summary = {}
        unavailable = []

        if "STUDENTS" in module_keys:
            try:
                summary["students"] = {
                    "active": Student.objects.filter(is_active=True).count(),
                    "enrollments": Enrollment.objects.filter(is_active=True).count(),
                }
            except Exception:
                summary["students"] = {"active": 0, "enrollments": 0}
                unavailable.append("STUDENTS")

        if "ADMISSIONS" in module_keys:
            try:
                summary["admissions"] = {
                    "applications": AdmissionApplication.objects.count(),
                    "enrolled": AdmissionApplication.objects.filter(status="Enrolled").count(),
                }
            except Exception:
                summary["admissions"] = {"applications": 0, "enrolled": 0}
                unavailable.append("ADMISSIONS")

        if "HR" in module_keys:
            try:
                summary["hr"] = {
                    "staff_active": Staff.objects.filter(is_active=True).count()
                }
            except Exception:
                summary["hr"] = {"staff_active": 0}
                unavailable.append("HR")

        if "STAFF" in module_keys:
            try:
                from staff_mgmt.models import StaffMember

                summary["staff"] = {
                    "active": StaffMember.objects.filter(is_active=True).count(),
                }
            except Exception:
                summary["staff"] = {"active": 0}
                unavailable.append("STAFF")

        if "PARENTS" in module_keys:
            try:
                summary["parents"] = {
                    "guardian_profiles": Guardian.objects.filter(is_active=True).count(),
                }
            except Exception:
                summary["parents"] = {"guardian_profiles": 0}
                unavailable.append("PARENTS")

        if "LIBRARY" in module_keys:
            try:
                from library.models import (
                    CirculationTransaction,
                    FineRecord,
                    LibraryMember,
                    LibraryResource,
                )

                summary["library"] = {
                    "resources": LibraryResource.objects.filter(is_active=True).count(),
                    "members": LibraryMember.objects.filter(is_active=True).count(),
                    "active_borrowings": CirculationTransaction.objects.filter(
                        is_active=True,
                        transaction_type="Issue",
                        return_date__isnull=True,
                    ).count(),
                    "pending_fines": FineRecord.objects.filter(
                        is_active=True,
                        status="Pending",
                    ).count(),
                }
            except Exception:
                summary["library"] = {
                    "resources": 0,
                    "members": 0,
                    "active_borrowings": 0,
                    "pending_fines": 0,
                }
                unavailable.append("LIBRARY")

        if "FINANCE" in module_keys:
            try:
                invoice_total = Invoice.objects.aggregate(total=Sum('total_amount'))['total'] or 0
                payment_total = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
                expense_total = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
                summary["finance"] = {
                    "revenue_billed": float(invoice_total),
                    "cash_collected": float(payment_total),
                    "total_expenses": float(expense_total),
                    "net_profit": float(payment_total - expense_total),
                    "outstanding_receivables": float(invoice_total - payment_total)
                }
            except Exception:
                summary["finance"] = {
                    "revenue_billed": 0.0,
                    "cash_collected": 0.0,
                    "total_expenses": 0.0,
                    "net_profit": 0.0,
                    "outstanding_receivables": 0.0,
                }
                unavailable.append("FINANCE")

        if "REPORTING" in module_keys:
            try:
                summary["reporting"] = {
                    "invoices_pending": Invoice.objects.filter(is_active=True, status='CONFIRMED').count()
                }
            except Exception:
                summary["reporting"] = {"invoices_pending": 0}
                unavailable.append("REPORTING")

        if "STORE" in module_keys:
            try:
                summary["store"] = {
                    "total_items": StoreItem.objects.filter(is_active=True).count(),
                    "low_stock": StoreItem.objects.filter(is_active=True, current_stock__lte=models.F('reorder_level')).count(),
                    "pending_orders": StoreOrderRequest.objects.filter(status='PENDING').count(),
                }
            except Exception:
                summary["store"] = {"total_items": 0, "low_stock": 0, "pending_orders": 0}
                unavailable.append("STORE")

        if "DISPENSARY" in module_keys:
            try:
                import datetime
                summary["dispensary"] = {
                    "visits_today": DispensaryVisit.objects.filter(visit_date=datetime.date.today()).count(),
                    "stock_items": DispensaryStock.objects.count(),
                    "low_stock": DispensaryStock.objects.filter(current_quantity__lte=models.F('reorder_level')).count(),
                }
            except Exception:
                summary["dispensary"] = {"visits_today": 0, "stock_items": 0, "low_stock": 0}
                unavailable.append("DISPENSARY")

        handled = {
            "STUDENTS",
            "ADMISSIONS",
            "HR",
            "FINANCE",
            "REPORTING",
            "ACADEMICS",
            "COMMUNICATION",
            "CORE",
            "ASSETS",
            "LIBRARY",
            "PARENTS",
            "STAFF",
            "STORE",
            "DISPENSARY",
            "CLOCKIN",
            "TIMETABLE",
            "TRANSPORT",
            "VISITOR_MGMT",
            "EXAMINATIONS",
            "ALUMNI",
            "HOSTEL",
            "PTM",
            "SPORTS",
            "CAFETERIA",
            "CURRICULUM",
            "MAINTENANCE",
            "ELEARNING",
            "ANALYTICS",
        }
        for key in module_keys:
            if key not in handled:
                unavailable.append(key)

        return Response({
            "modules": module_keys,
            "modules_detail": modules,
            "unavailable_modules": sorted(list(set(unavailable))),
            "summary": summary
        })

class FinanceSummaryCsvExportView(APIView):
    """CSV export for finance summary."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        report = FinanceService.get_summary()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="finance_summary_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['section', 'metric', 'value'])
        writer.writerow(['summary', 'revenue_billed', report.get('revenue_billed', 0)])
        writer.writerow(['summary', 'cash_collected', report.get('cash_collected', 0)])
        writer.writerow(['summary', 'total_expenses', report.get('total_expenses', 0)])
        writer.writerow(['summary', 'net_profit', report.get('net_profit', 0)])
        writer.writerow(['summary', 'outstanding_receivables', report.get('outstanding_receivables', 0)])
        writer.writerow(['summary', 'active_students_count', report.get('active_students_count', 0)])
        return response


class FinanceSummaryPdfExportView(APIView):
    """PDF export for finance summary."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        report = FinanceService.get_summary()
        tenant_meta = _resolve_tenant_pdf_meta(request)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Finance Summary Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Finance Summary Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        summary_rows = [
            ["Metric", "Value"],
            ["Revenue Billed", _safe_cell(report.get("revenue_billed"))],
            ["Cash Collected", _safe_cell(report.get("cash_collected"))],
            ["Total Expenses", _safe_cell(report.get("total_expenses"))],
            ["Net Profit", _safe_cell(report.get("net_profit"))],
            ["Outstanding Receivables", _safe_cell(report.get("outstanding_receivables"))],
            ["Active Students", _safe_cell(report.get("active_students_count"))],
        ]
        summary_table = Table(summary_rows, colWidths=[220, 220])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ]))
        story.append(summary_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="finance_summary_report.pdf"'
        return response

class AttendanceSummaryCsvExportView(APIView):
    """CSV export for attendance summary."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        student_id = request.query_params.get('student_id')
        queryset = AttendanceRecord.objects.all()
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        total = queryset.count()
        present = queryset.filter(status='Present').count()
        absent = queryset.filter(status='Absent').count()
        late = queryset.filter(status='Late').count()
        attendance_rate = round((present / total) * 100, 2) if total else 0

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="attendance_summary_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['section', 'metric', 'value'])
        writer.writerow(['summary', 'attendance_rate', attendance_rate])
        writer.writerow(['summary', 'present', present])
        writer.writerow(['summary', 'absent', absent])
        writer.writerow(['summary', 'late', late])
        writer.writerow(['summary', 'period_label', 'All time'])
        return response


class AttendanceSummaryPdfExportView(APIView):
    """PDF export for attendance summary."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        student_id = request.query_params.get('student_id')
        queryset = AttendanceRecord.objects.all()
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        total = queryset.count()
        present = queryset.filter(status='Present').count()
        absent = queryset.filter(status='Absent').count()
        late = queryset.filter(status='Late').count()
        attendance_rate = round((present / total) * 100, 2) if total else 0

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Attendance Summary Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Attendance Summary Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        summary_rows = [
            ["Metric", "Value"],
            ["Attendance Rate", f"{attendance_rate}%"],
            ["Present", _safe_cell(present)],
            ["Absent", _safe_cell(absent)],
            ["Late", _safe_cell(late)],
            ["Period", "All time"],
        ]
        summary_table = Table(summary_rows, colWidths=[220, 220])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ]))
        story.append(summary_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="attendance_summary_report.pdf"'
        return response


class AttendanceRecordsCsvExportView(APIView):
    """CSV export for attendance records."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = AttendanceRecord.objects.select_related('student').all().order_by('-date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        status_param = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="attendance_records_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['student_name', 'student_id', 'status', 'date', 'notes'])
        for record in queryset:
            writer.writerow([
                f"{record.student.first_name} {record.student.last_name}".strip(),
                record.student_id,
                record.status,
                record.date,
                record.notes or '',
            ])
        return response


class AttendanceRecordsPdfExportView(APIView):
    """PDF export for attendance records."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = AttendanceRecord.objects.select_related('student').all().order_by('-date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        status_param = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Attendance Records Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Attendance Records Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        table_rows = [["Student", "Status", "Date", "Notes"]]
        for record in queryset:
            table_rows.append([
                f"{record.student.first_name} {record.student.last_name}".strip(),
                record.status,
                _safe_cell(record.date),
                _safe_cell(record.notes),
            ])

        attendance_table = Table(table_rows, colWidths=[130, 80, 90, 170])
        attendance_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(attendance_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="attendance_records_report.pdf"'
        return response


class BehaviorIncidentsCsvExportView(APIView):
    """CSV export for behavior incidents."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        queryset = BehaviorIncident.objects.select_related('student').all().order_by('-incident_date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        incident_type = request.query_params.get('incident_type')
        severity = request.query_params.get('severity')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if incident_type:
            queryset = queryset.filter(incident_type=incident_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if date_from:
            queryset = queryset.filter(incident_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(incident_date__lte=date_to)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="behavior_incidents_report.csv"'
        writer = csv.writer(response)
        writer.writerow(['student_name', 'student_id', 'incident_type', 'category', 'incident_date', 'severity', 'description'])
        for incident in queryset:
            writer.writerow([
                f"{incident.student.first_name} {incident.student.last_name}".strip(),
                incident.student_id,
                incident.incident_type,
                incident.category,
                incident.incident_date,
                incident.severity or '',
                incident.description or '',
            ])
        return response


class BehaviorIncidentsPdfExportView(APIView):
    """PDF export for behavior incidents."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        try:
            from io import BytesIO
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        except ImportError:
            return Response(
                {"error": "PDF export dependency missing. Install reportlab."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        queryset = BehaviorIncident.objects.select_related('student').all().order_by('-incident_date', '-created_at')
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        incident_type = request.query_params.get('incident_type')
        severity = request.query_params.get('severity')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if incident_type:
            queryset = queryset.filter(incident_type=incident_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if date_from:
            queryset = queryset.filter(incident_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(incident_date__lte=date_to)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="Behavior Incidents Report")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get("logo_path"):
            try:
                story.append(Image(tenant_meta["logo_path"], width=48, height=48))
            except Exception:
                pass

        story.append(Paragraph(f"<b>{_safe_cell(tenant_meta.get('school_name'))}</b>", styles["Title"]))
        story.append(Paragraph(f"Tenant: {_safe_cell(tenant_meta.get('schema'))}", styles["Normal"]))
        if tenant_meta.get("address"):
            story.append(Paragraph(_safe_cell(tenant_meta["address"]), styles["Normal"]))
        if tenant_meta.get("phone"):
            story.append(Paragraph(f"Phone: {_safe_cell(tenant_meta['phone'])}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Behavior Incidents Report</b>", styles["Heading2"]))
        story.append(Spacer(1, 6))

        table_rows = [["Student", "Type", "Category", "Date", "Severity"]]
        for incident in queryset:
            table_rows.append([
                f"{incident.student.first_name} {incident.student.last_name}".strip(),
                incident.incident_type,
                incident.category,
                _safe_cell(incident.incident_date),
                _safe_cell(incident.severity),
            ])

        incidents_table = Table(table_rows, colWidths=[120, 70, 120, 80, 70])
        incidents_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(incidents_table)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="behavior_incidents_report.pdf"'
        return response


# ==========================================
# VOTE HEADS
# ==========================================

class VoteHeadViewSet(viewsets.ModelViewSet):
    serializer_class = VoteHeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = VoteHead.objects.all()
        if self.request.query_params.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'], url_path='seed-defaults')
    def seed_defaults(self, request):
        created = []
        for i, name in enumerate(VoteHead.PRELOADED_NAMES):
            vh, is_new = VoteHead.objects.get_or_create(
                name=name,
                defaults={'is_preloaded': True, 'order': i, 'is_active': True}
            )
            if is_new:
                created.append(name)
        return Response({'seeded': created, 'message': f'{len(created)} vote heads seeded.'})


class VoteHeadPaymentAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = VoteHeadPaymentAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = VoteHeadPaymentAllocation.objects.select_related('payment', 'vote_head').all()
        payment_id = self.request.query_params.get('payment')
        if payment_id:
            qs = qs.filter(payment_id=payment_id)
        vote_head_id = self.request.query_params.get('vote_head')
        if vote_head_id:
            qs = qs.filter(vote_head_id=vote_head_id)
        return qs


# ==========================================
# CASHBOOK & BANKBOOK
# ==========================================

def _recompute_running_balances(book_type):
    entries = list(CashbookEntry.objects.filter(book_type=book_type).order_by('entry_date', 'created_at'))
    running = Decimal('0.00') if not entries else None
    from decimal import Decimal as D
    balance = D('0.00')
    for entry in entries:
        balance += (entry.amount_in or D('0.00')) - (entry.amount_out or D('0.00'))
        entry.running_balance = balance
    if entries:
        CashbookEntry.objects.bulk_update(entries, ['running_balance'])


class CashbookEntryViewSet(viewsets.ModelViewSet):
    serializer_class = CashbookEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CashbookEntry.objects.all()
        book_type = self.request.query_params.get('book_type')
        if book_type:
            qs = qs.filter(book_type=book_type.upper())
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(entry_date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(entry_date__lte=date_to)
        return qs.order_by('book_type', 'entry_date', 'created_at')

    def perform_create(self, serializer):
        from decimal import Decimal as D
        obj = serializer.save()
        _recompute_running_balances(obj.book_type)
        obj.refresh_from_db()

    def perform_update(self, serializer):
        obj = serializer.save()
        _recompute_running_balances(obj.book_type)

    def perform_destroy(self, instance):
        book_type = instance.book_type
        instance.delete()
        _recompute_running_balances(book_type)


class CashbookSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from decimal import Decimal as D
        result = {}
        for book_type in ['CASH', 'BANK']:
            entries = CashbookEntry.objects.filter(book_type=book_type).order_by('entry_date', 'created_at')
            total_in = entries.aggregate(t=Sum('amount_in'))['t'] or D('0.00')
            total_out = entries.aggregate(t=Sum('amount_out'))['t'] or D('0.00')
            closing = entries.last()
            opening = entries.filter(entry_type='OPENING').first()
            result[book_type.lower()] = {
                'total_in': float(total_in),
                'total_out': float(total_out),
                'closing_balance': float(closing.running_balance) if closing else 0.0,
                'opening_balance': float(opening.amount_in) if opening else 0.0,
                'entry_count': entries.count(),
            }
        return Response(result)


# ==========================================
# BALANCE CARRY FORWARD
# ==========================================

class BalanceCarryForwardViewSet(viewsets.ModelViewSet):
    serializer_class = BalanceCarryForwardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = BalanceCarryForward.objects.select_related('student', 'from_term', 'to_term').all()
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        from_term = self.request.query_params.get('from_term')
        if from_term:
            qs = qs.filter(from_term_id=from_term)
        to_term = self.request.query_params.get('to_term')
        if to_term:
            qs = qs.filter(to_term_id=to_term)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ==========================================
# ARREARS REPORT
# ==========================================

class FinanceArrearsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from decimal import Decimal as D
        term_id = request.query_params.get('term')
        group_by = request.query_params.get('group_by', 'student')

        invoices_qs = Invoice.objects.filter(is_active=True).exclude(status__in=['PAID', 'VOID'])
        if term_id:
            invoices_qs = invoices_qs.filter(term_id=term_id)

        rows = []
        for inv in invoices_qs.select_related('student', 'term'):
            balance = float(inv.balance_due)
            if balance <= 0:
                continue
            enrollment = inv.student.enrollment_set.filter(is_active=True).select_related('school_class').first()
            class_name = enrollment.school_class.name if enrollment and enrollment.school_class else 'N/A'
            rows.append({
                'invoice_id': inv.id,
                'invoice_number': inv.invoice_number,
                'student_id': inv.student.id,
                'student_name': f"{inv.student.first_name} {inv.student.last_name}".strip(),
                'admission_number': inv.student.admission_number,
                'class_name': class_name,
                'term': inv.term.name if inv.term else '',
                'total_amount': float(inv.total_amount),
                'balance_due': balance,
                'due_date': str(inv.due_date),
                'status': inv.status,
            })

        if group_by == 'class':
            from collections import defaultdict
            grouped = defaultdict(lambda: {'class_name': '', 'student_count': 0, 'total_balance': 0.0, 'invoices': []})
            for row in rows:
                key = row['class_name']
                grouped[key]['class_name'] = key
                grouped[key]['student_count'] += 1
                grouped[key]['total_balance'] += row['balance_due']
                grouped[key]['invoices'].append(row)
            return Response({'group_by': 'class', 'data': list(grouped.values())})

        return Response({'group_by': 'student', 'count': len(rows), 'results': rows})


# ==========================================
# VOTE HEAD ALLOCATION REPORT
# ==========================================

class FinanceVoteHeadAllocationReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from decimal import Decimal as D
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        qs = VoteHeadPaymentAllocation.objects.select_related('vote_head', 'payment')
        if date_from:
            qs = qs.filter(payment__payment_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(payment__payment_date__date__lte=date_to)

        totals = qs.values('vote_head__id', 'vote_head__name').annotate(
            total_allocated=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('vote_head__order', 'vote_head__name')

        grand_total = sum(float(r['total_allocated'] or 0) for r in totals)

        return Response({
            'date_from': date_from,
            'date_to': date_to,
            'grand_total': grand_total,
            'rows': [
                {
                    'vote_head_id': r['vote_head__id'],
                    'vote_head_name': r['vote_head__name'],
                    'total_allocated': float(r['total_allocated'] or 0),
                    'transaction_count': r['transaction_count'],
                    'percentage_of_total': round(float(r['total_allocated'] or 0) / grand_total * 100, 2) if grand_total else 0,
                }
                for r in totals
            ]
        })


# ==========================================
# CLASS BALANCES REPORT
# ==========================================

class FinanceClassBalancesReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        term_id = request.query_params.get('term')
        invoices_qs = Invoice.objects.filter(is_active=True)
        if term_id:
            invoices_qs = invoices_qs.filter(term_id=term_id)

        from collections import defaultdict
        class_data = defaultdict(lambda: {
            'class_name': '', 'student_count': 0,
            'total_billed': 0.0, 'total_paid': 0.0, 'total_outstanding': 0.0
        })

        for inv in invoices_qs.select_related('student'):
            enrollment = inv.student.enrollment_set.filter(is_active=True).select_related('school_class').first()
            class_name = enrollment.school_class.name if enrollment and enrollment.school_class else 'Unassigned'
            balance = float(inv.balance_due)
            class_data[class_name]['class_name'] = class_name
            class_data[class_name]['total_billed'] += float(inv.total_amount)
            class_data[class_name]['total_paid'] += float(inv.total_amount) - balance
            class_data[class_name]['total_outstanding'] += max(balance, 0)
        student_counts = defaultdict(set)
        for inv in invoices_qs.select_related('student'):
            enrollment = inv.student.enrollment_set.filter(is_active=True).select_related('school_class').first()
            class_name = enrollment.school_class.name if enrollment and enrollment.school_class else 'Unassigned'
            student_counts[class_name].add(inv.student_id)
        for class_name, students in student_counts.items():
            class_data[class_name]['student_count'] = len(students)

        return Response({
            'term_id': term_id,
            'rows': sorted(class_data.values(), key=lambda x: x['class_name'])
        })


# ==========================================
# ARREARS BY TERM REPORT
# ==========================================

class FinanceArrearsByTermReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from collections import defaultdict
        invoices_qs = Invoice.objects.filter(is_active=True).exclude(status__in=['PAID', 'VOID'])
        term_data = defaultdict(lambda: {
            'term_id': None, 'term_name': '', 'student_count': 0,
            'total_outstanding': 0.0, 'invoice_count': 0
        })
        for inv in invoices_qs.select_related('term'):
            balance = float(inv.balance_due)
            if balance <= 0:
                continue
            key = inv.term_id
            term_data[key]['term_id'] = inv.term_id
            term_data[key]['term_name'] = inv.term.name if inv.term else 'N/A'
            term_data[key]['total_outstanding'] += balance
            term_data[key]['invoice_count'] += 1

        student_counts = defaultdict(set)
        for inv in invoices_qs.select_related('term'):
            if float(inv.balance_due) > 0:
                student_counts[inv.term_id].add(inv.student_id)
        for term_id, students in student_counts.items():
            term_data[term_id]['student_count'] = len(students)

        return Response({
            'rows': sorted(term_data.values(), key=lambda x: (x['term_name']))
        })


# ==========================================
# IPSAS BUDGET VARIANCE REPORT
# ==========================================

class FinanceBudgetVarianceReportView(APIView):
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def get(self, request):
        from collections import defaultdict
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')

        budgets_qs = Budget.objects.filter(is_active=True)
        if academic_year:
            budgets_qs = budgets_qs.filter(academic_year_id=academic_year)
        if term:
            budgets_qs = budgets_qs.filter(term_id=term)

        expenses_qs = Expense.objects.all()
        if term:
            try:
                term_obj = Term.objects.get(id=term)
                expenses_qs = expenses_qs.filter(
                    expense_date__gte=term_obj.start_date,
                    expense_date__lte=term_obj.end_date,
                )
            except Exception:
                pass
        elif academic_year:
            try:
                year_obj = AcademicYear.objects.get(id=academic_year)
                expenses_qs = expenses_qs.filter(
                    expense_date__gte=year_obj.start_date,
                    expense_date__lte=year_obj.end_date,
                )
            except Exception:
                pass

        expense_by_category = defaultdict(float)
        for exp in expenses_qs:
            expense_by_category[exp.category] += float(exp.amount or 0)

        total_actual = sum(expense_by_category.values())

        rows = []
        for budget in budgets_qs.select_related('academic_year', 'term'):
            annual = float(budget.annual_budget or 0)
            monthly = float(budget.monthly_budget or 0)
            quarterly = float(budget.quarterly_budget or 0)
            variance = annual - total_actual
            utilization_pct = round((total_actual / annual * 100), 1) if annual > 0 else None
            rows.append({
                'budget_id': budget.id,
                'academic_year': budget.academic_year.name,
                'term': budget.term.name,
                'monthly_budget': monthly,
                'quarterly_budget': quarterly,
                'annual_budget': annual,
                'total_actual_spend': round(total_actual, 2),
                'variance': round(variance, 2),
                'utilization_pct': utilization_pct,
                'status': 'UNDER' if variance >= 0 else 'OVER',
            })

        by_category = [
            {'category': cat, 'actual': round(amt, 2)}
            for cat, amt in sorted(expense_by_category.items(), key=lambda x: -x[1])
        ]

        return Response({
            'rows': rows,
            'by_category': by_category,
            'total_actual': round(total_actual, 2),
        })


# ==========================================
# RECEIPT PDF
# ==========================================

class FinanceReceiptPdfView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from io import BytesIO

        try:
            payment = Payment.objects.select_related('student').get(pk=pk)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        tenant_meta = _resolve_tenant_pdf_meta(request)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Receipt {payment.receipt_number}")
        styles = getSampleStyleSheet()
        story = []

        if tenant_meta.get('logo_path'):
            try:
                story.append(Image(tenant_meta['logo_path'], width=60, height=60))
            except Exception:
                pass

        school_name = tenant_meta.get('school_name', 'School')
        story.append(Paragraph(f"<b>{_safe_cell(school_name)}</b>", styles['Title']))
        if tenant_meta.get('address'):
            story.append(Paragraph(_safe_cell(tenant_meta['address']), styles['Normal']))
        if tenant_meta.get('phone'):
            story.append(Paragraph(f"Tel: {_safe_cell(tenant_meta['phone'])}", styles['Normal']))
        story.append(Spacer(1, 18))

        story.append(Paragraph("<b>OFFICIAL RECEIPT</b>", styles['Heading2']))
        story.append(Spacer(1, 8))

        details = [
            ['Receipt No.', _safe_cell(payment.receipt_number)],
            ['Date', _safe_cell(payment.payment_date.strftime('%d %b %Y') if payment.payment_date else '')],
            ['Student', f"{payment.student.first_name} {payment.student.last_name}".strip()],
            ['Admission No.', _safe_cell(payment.student.admission_number)],
            ['Amount', f"KES {float(payment.amount):,.2f}"],
            ['Method', _safe_cell(payment.payment_method)],
            ['Reference', _safe_cell(payment.reference_number)],
        ]

        vote_allocs = VoteHeadPaymentAllocation.objects.filter(payment=payment).select_related('vote_head')
        if vote_allocs.exists():
            story.append(Spacer(1, 8))
            alloc_rows = [['Vote Head', 'Amount']]
            for va in vote_allocs:
                alloc_rows.append([_safe_cell(va.vote_head.name), f"KES {float(va.amount):,.2f}"])
            alloc_table = Table(alloc_rows, colWidths=[200, 120])
            alloc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ]))
            details.append(['Vote Head Breakdown', ''])
            table = Table(details, colWidths=[160, 280])
            table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(table)
            story.append(Spacer(1, 6))
            story.append(alloc_table)
        else:
            table = Table(details, colWidths=[160, 280])
            table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(table)

        story.append(Spacer(1, 24))
        story.append(Paragraph("____________________________", styles['Normal']))
        story.append(Paragraph("Authorised Signature", styles['Normal']))
        story.append(Spacer(1, 8))
        story.append(Paragraph("<i>This is a computer-generated receipt.</i>", styles['Italic']))

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{payment.receipt_number}.pdf"'
        return response


# ==========================================
# STUDENT ACCOUNT LEDGER
# ==========================================

class FinanceStudentLedgerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        from decimal import Decimal as D
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=404)
        term_id = request.query_params.get('term')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        entries = []

        inv_qs = Invoice.objects.filter(student=student, is_active=True)
        if term_id:
            inv_qs = inv_qs.filter(term_id=term_id)
        if date_from:
            inv_qs = inv_qs.filter(invoice_date__gte=date_from)
        if date_to:
            inv_qs = inv_qs.filter(invoice_date__lte=date_to)
        for inv in inv_qs.select_related('term').order_by('invoice_date', 'id'):
            entries.append({
                'date': str(inv.invoice_date),
                'type': 'INVOICE',
                'reference': inv.invoice_number or f'INV-{inv.id}',
                'description': f'Invoice – {inv.term.name if inv.term else ""}',
                'debit': float(inv.total_amount),
                'credit': 0.0,
                'term': inv.term.name if inv.term else '',
                'status': inv.status,
                'invoice_id': inv.id,
            })

        pay_qs = Payment.objects.filter(student=student, is_active=True)
        if date_from:
            pay_qs = pay_qs.filter(payment_date__date__gte=date_from)
        if date_to:
            pay_qs = pay_qs.filter(payment_date__date__lte=date_to)
        for pay in pay_qs.order_by('payment_date', 'id'):
            pay_date = pay.payment_date.date() if hasattr(pay.payment_date, 'date') else pay.payment_date
            entries.append({
                'date': str(pay_date),
                'type': 'PAYMENT',
                'reference': pay.receipt_number or pay.reference_number,
                'description': f'Payment – {pay.payment_method}',
                'debit': 0.0,
                'credit': float(pay.amount),
                'term': '',
                'status': 'REVERSED' if pay.reversed_at else 'ACTIVE',
                'payment_id': pay.id,
            })

        adj_qs = InvoiceAdjustment.objects.filter(invoice__student=student)
        if date_from:
            adj_qs = adj_qs.filter(created_at__date__gte=date_from)
        if date_to:
            adj_qs = adj_qs.filter(created_at__date__lte=date_to)
        for adj in adj_qs.select_related('invoice').order_by('created_at', 'id'):
            signed = float(adj.signed_amount)
            adj_date = adj.created_at.date() if hasattr(adj.created_at, 'date') else adj.created_at
            entries.append({
                'date': str(adj_date),
                'type': 'ADJUSTMENT',
                'reference': f'ADJ-{adj.id}',
                'description': f'{adj.adjustment_type} – {adj.reason[:60] if adj.reason else ""}',
                'debit': max(-signed, 0.0),
                'credit': max(signed, 0.0),
                'term': '',
                'status': 'POSTED',
            })

        cf_qs = BalanceCarryForward.objects.filter(student=student)
        if term_id:
            cf_qs = cf_qs.filter(to_term_id=term_id)
        for cf in cf_qs.select_related('from_term', 'to_term').order_by('created_at'):
            cf_date = cf.created_at.date() if hasattr(cf.created_at, 'date') else cf.created_at
            entries.append({
                'date': str(cf_date),
                'type': 'CARRY_FORWARD',
                'reference': f'CF-{cf.id}',
                'description': f'Balance carried forward from {cf.from_term.name} → {cf.to_term.name}',
                'debit': float(cf.amount),
                'credit': 0.0,
                'term': cf.to_term.name if cf.to_term else '',
                'status': 'POSTED',
            })

        entries.sort(key=lambda e: e['date'])

        balance = D('0.00')
        for entry in entries:
            balance += D(str(entry['debit'])) - D(str(entry['credit']))
            entry['balance'] = float(balance)

        enrollment = student.enrollment_set.filter(is_active=True).select_related('school_class', 'term').first()
        student_data = {
            'id': student.id,
            'name': f"{student.first_name} {student.last_name}".strip(),
            'admission_number': student.admission_number,
            'class_name': enrollment.school_class.name if enrollment and enrollment.school_class else 'N/A',
            'current_term': enrollment.term.name if enrollment and enrollment.term else 'N/A',
        }

        return Response({
            'student': student_data,
            'entry_count': len(entries),
            'closing_balance': float(balance),
            'entries': entries,
        })


# ==========================================
# TENANT USER MANAGEMENT
# ==========================================

class RoleListView(APIView):
    """List all available roles for tenant users."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        roles = Role.objects.all().order_by('name')
        data = [{'id': r.id, 'name': r.name, 'description': r.description} for r in roles]
        return Response(data)


class RoleModuleAccessView(APIView):
    """
    GET  – Returns all roles with the modules assigned to each role.
            For admin-level roles (ADMIN, TENANT_SUPER_ADMIN) every active
            module is returned.  For other roles the union of active
            UserModuleAssignments for users of that role is returned.
    POST – Body: { role_name: str, module_keys: [str] }
            Replaces module assignments for ALL currently active users of
            that role.  Admin-level roles are skipped (they always have all
            modules).
    """
    permission_classes = [permissions.IsAuthenticated]

    _ADMIN_ROLES = {'ADMIN', 'TENANT_SUPER_ADMIN'}

    def get(self, request):
        from django.contrib.auth.models import User as AuthUser
        all_modules = list(Module.objects.filter(is_active=True).order_by('key').values('key', 'name'))
        roles = Role.objects.all().order_by('name')
        result = []
        for role in roles:
            user_ids = list(
                AuthUser.objects.filter(
                    userprofile__role=role, is_active=True
                ).values_list('id', flat=True)
            )
            user_count = len(user_ids)
            if role.name in self._ADMIN_ROLES:
                assigned_keys = [m['key'] for m in all_modules]
                editable = False
            else:
                assigned_keys = list(
                    UserModuleAssignment.objects.filter(
                        user_id__in=user_ids, is_active=True, module__is_active=True
                    ).values_list('module__key', flat=True).distinct()
                )
                editable = True
            result.append({
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'user_count': user_count,
                'assigned_module_keys': sorted(assigned_keys),
                'editable': editable,
            })
        return Response({'roles': result, 'all_modules': all_modules})

    def post(self, request):
        from django.contrib.auth.models import User as AuthUser
        role_name = request.data.get('role_name', '').strip().upper()
        module_keys = request.data.get('module_keys', [])
        if not role_name:
            return Response({'error': 'role_name is required.'}, status=400)
        if role_name in self._ADMIN_ROLES:
            return Response({'error': 'Admin-level role assignments cannot be restricted.'}, status=400)
        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            return Response({'error': f'Role "{role_name}" not found.'}, status=404)
        modules = {m.key: m for m in Module.objects.filter(key__in=module_keys, is_active=True)}
        users = AuthUser.objects.filter(userprofile__role=role, is_active=True)
        for user in users:
            UserModuleAssignment.objects.filter(user=user).update(is_active=False)
            for key in module_keys:
                mod = modules.get(key)
                if mod:
                    UserModuleAssignment.objects.update_or_create(
                        user=user,
                        module=mod,
                        defaults={'is_active': True, 'assigned_by': request.user},
                    )
        return Response({
            'updated_users': users.count(),
            'assigned_module_keys': sorted(module_keys),
            'role': role_name,
        })


class UserManagementListCreateView(APIView):
    """List all tenant users with roles / create a new tenant user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.contrib.auth.models import User as AuthUser
        users = AuthUser.objects.select_related('userprofile__role').filter(is_active=True).order_by('username')
        data = []
        for u in users:
            profile = getattr(u, 'userprofile', None)
            role = getattr(profile, 'role', None)
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'date_joined': u.date_joined.strftime('%Y-%m-%d') if u.date_joined else None,
                'last_login': u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else None,
                'role_id': role.id if role else None,
                'role_name': role.name if role else None,
                'phone': profile.phone if profile else '',
            })
        return Response({'results': data, 'count': len(data)})

    def post(self, request):
        from django.contrib.auth.models import User as AuthUser
        data = request.data
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        email = data.get('email', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        phone = data.get('phone', '').strip()
        role_id = data.get('role_id')

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=400)
        if AuthUser.objects.filter(username=username).exists():
            return Response({'detail': f'Username "{username}" is already taken.'}, status=400)
        if not role_id:
            return Response({'detail': 'A role must be assigned.'}, status=400)
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({'detail': 'Invalid role.'}, status=400)

        user = AuthUser.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        UserProfile.objects.create(user=user, role=role, phone=phone)
        return Response({
            'id': user.id,
            'username': user.username,
            'role_name': role.name,
        }, status=201)


class UserManagementDetailView(APIView):
    """Retrieve, update, or deactivate a specific tenant user."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_user(self, user_id):
        from django.contrib.auth.models import User as AuthUser
        try:
            return AuthUser.objects.select_related('userprofile__role').get(id=user_id)
        except AuthUser.DoesNotExist:
            return None

    def get(self, request, user_id):
        u = self._get_user(user_id)
        if not u:
            return Response({'detail': 'User not found.'}, status=404)
        profile = getattr(u, 'userprofile', None)
        role = getattr(profile, 'role', None)
        return Response({
            'id': u.id, 'username': u.username, 'email': u.email,
            'first_name': u.first_name, 'last_name': u.last_name,
            'is_active': u.is_active, 'is_staff': u.is_staff,
            'date_joined': u.date_joined.strftime('%Y-%m-%d') if u.date_joined else None,
            'last_login': u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else None,
            'role_id': role.id if role else None,
            'role_name': role.name if role else None,
            'phone': profile.phone if profile else '',
        })

    def patch(self, request, user_id):
        u = self._get_user(user_id)
        if not u:
            return Response({'detail': 'User not found.'}, status=404)
        data = request.data
        if 'email' in data:
            u.email = data['email']
        if 'first_name' in data:
            u.first_name = data['first_name']
        if 'last_name' in data:
            u.last_name = data['last_name']
        if 'password' in data and data['password']:
            u.set_password(data['password'])
        u.save()

        profile = getattr(u, 'userprofile', None)
        if 'role_id' in data and data['role_id']:
            try:
                role = Role.objects.get(id=data['role_id'])
                if profile:
                    profile.role = role
                    if 'phone' in data:
                        profile.phone = data.get('phone', '')
                    profile.save()
                else:
                    UserProfile.objects.create(user=u, role=role, phone=data.get('phone', ''))
            except Role.DoesNotExist:
                return Response({'detail': 'Invalid role.'}, status=400)
        elif profile and 'phone' in data:
            profile.phone = data.get('phone', '')
            profile.save()

        return Response({'detail': 'User updated.'})

    def delete(self, request, user_id):
        from django.contrib.auth.models import User as AuthUser
        if str(user_id) == str(request.user.id):
            return Response({'detail': 'You cannot deactivate your own account.'}, status=400)
        u = self._get_user(user_id)
        if not u:
            return Response({'detail': 'User not found.'}, status=404)
        u.is_active = False
        u.save()
        return Response({'detail': f'User "{u.username}" has been deactivated.'})


# ==========================================
# STORE / INVENTORY VIEWS
# ==========================================

class StoreCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = StoreCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StoreCategory.objects.all()
        item_type = self.request.query_params.get('item_type')
        if item_type:
            qs = qs.filter(item_type=item_type.upper())
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs.order_by('name')


class StoreItemViewSet(viewsets.ModelViewSet):
    serializer_class = StoreItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StoreItem.objects.select_related('category').all()
        item_type = self.request.query_params.get('item_type')
        if item_type and item_type.upper() != 'ALL':
            qs = qs.filter(item_type=item_type.upper())
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            from django.db.models import F
            qs = qs.filter(current_stock__lte=F('reorder_level'))
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        q = self.request.query_params.get('search')
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.order_by('name')


class StoreTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = StoreTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StoreTransaction.objects.select_related('item', 'performed_by').all()
        item_id = self.request.query_params.get('item')
        if item_id:
            qs = qs.filter(item_id=item_id)
        tx_type = self.request.query_params.get('transaction_type')
        if tx_type:
            qs = qs.filter(transaction_type=tx_type.upper())
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)


class StoreOrderRequestViewSet(viewsets.ModelViewSet):
    serializer_class = StoreOrderRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StoreOrderRequest.objects.select_related('requested_by', 'reviewed_by').prefetch_related('items__item').all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        send_to = self.request.query_params.get('send_to')
        if send_to:
            qs = qs.filter(send_to__in=[send_to.upper(), 'BOTH'])
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        order = serializer.save(requested_by=self.request.user)
        items_data = self.request.data.get('order_items', [])
        for item_data in items_data:
            item_id = item_data.get('item')
            item_name = item_data.get('item_name', '')
            StoreOrderItem.objects.create(
                order=order,
                item_id=item_id if item_id else None,
                item_name=item_name or (StoreItem.objects.filter(id=item_id).values_list('name', flat=True).first() if item_id else ''),
                unit=item_data.get('unit', 'pcs'),
                quantity_requested=item_data.get('quantity_requested', 1),
                notes=item_data.get('notes', ''),
            )

    @action(detail=True, methods=['post'], url_path='generate-expense')
    def generate_expense(self, request, pk=None):
        order = self.get_object()

        # Prevent duplicate expense generation
        if order.generated_expense_id:
            return Response({
                'already_generated': True,
                'expense_id': order.generated_expense_id,
                'message': f'Expense already generated (Expense #{order.generated_expense_id}).',
            }, status=200)

        if order.status not in ('APPROVED', 'FULFILLED'):
            return Response({'error': 'Only approved or fulfilled orders can generate expenses.'}, status=400)

        # Calculate total cost from order items
        total = sum(
            float(item.quantity_approved or item.quantity_requested) * float(item.item.cost_price if item.item else 0)
            for item in order.items.select_related('item').all()
        )

        import datetime as dt
        from school.models import Expense
        expense = Expense.objects.create(
            category='Store Purchase',
            amount=max(total, 0.01),
            expense_date=order.reviewed_at.date() if order.reviewed_at else dt.date.today(),
            description=f'{order.request_code or ("Order #" + str(order.id))}: {order.title}. {order.description}'.strip(),
            approval_status='Approved',
            vendor='Store Department',
        )
        # Link expense back to order so we can detect duplicates
        order.generated_expense = expense
        order.save(update_fields=['generated_expense'])
        return Response({'expense_id': expense.id, 'amount': total, 'message': 'Expense record created.'})

class AcademicsCurrentContextView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        from academics.models import AcademicYear, Term
        year = AcademicYear.objects.filter(is_current=True).first()
        term = Term.objects.filter(is_current=True).first()
        return Response({
            'academic_year': {'id': year.id, 'name': year.name} if year else None,
            'term': {'id': term.id, 'name': term.name} if term else None,
        })

class BulkOptionalChargeByClassView(APIView):
    """
    POST: Assigns an optional charge to every enrolled student in a given class.
    Body: { class_id, optional_charge_id, term_id (optional) }
    Returns: { created, skipped, student_count }
    """
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"

    def post(self, request):
        class_id = request.data.get('class_id')
        optional_charge_id = request.data.get('optional_charge_id')
        term_id = request.data.get('term_id')

        if not class_id:
            return Response({'error': 'class_id is required.'}, status=400)
        if not optional_charge_id:
            return Response({'error': 'optional_charge_id is required.'}, status=400)

        try:
            school_class = SchoolClass.objects.get(id=class_id)
        except SchoolClass.DoesNotExist:
            return Response({'error': 'Class not found.'}, status=404)

        try:
            optional_charge = OptionalCharge.objects.get(id=optional_charge_id)
        except OptionalCharge.DoesNotExist:
            return Response({'error': 'Optional charge not found.'}, status=404)

        enrollments = Enrollment.objects.filter(school_class_id=school_class.id, is_active=True)
        if term_id:
            enrollments = enrollments.filter(term_id=term_id)

        student_ids = list(enrollments.values_list('student_id', flat=True).distinct())
        if not student_ids:
            return Response({'created': 0, 'skipped': 0, 'student_count': 0,
                             'message': 'No enrolled students found in this class.'})

        created_count = 0
        skipped_count = 0
        for student_id in student_ids:
            _, created = StudentOptionalCharge.objects.get_or_create(
                student_id=student_id,
                optional_charge=optional_charge,
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        return Response({
            'created': created_count,
            'skipped': skipped_count,
            'student_count': len(student_ids),
            'message': f'Assigned to {created_count} new students ({skipped_count} already had this charge).',
        })


class StoreOrderReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        from django.utils import timezone as tz
        try:
            order = StoreOrderRequest.objects.get(id=pk)
        except StoreOrderRequest.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        action = request.data.get('action', '').upper()
        if action not in ('APPROVE', 'REJECT', 'FULFILL'):
            return Response({'detail': 'action must be APPROVE, REJECT, or FULFILL.'}, status=400)
        status_map = {'APPROVE': 'APPROVED', 'REJECT': 'REJECTED', 'FULFILL': 'FULFILLED'}
        order.status = status_map[action]
        order.reviewed_by = request.user
        order.reviewed_at = tz.now()
        order.notes = request.data.get('notes', order.notes)
        order.save()
        approved_items = request.data.get('approved_items', [])
        for ai in approved_items:
            try:
                oi = StoreOrderItem.objects.get(id=ai['id'])
                oi.quantity_approved = ai.get('quantity_approved', oi.quantity_requested)
                oi.save()
            except StoreOrderItem.DoesNotExist:
                pass
        return Response({'detail': f'Order {status_map[action].lower()}.', 'status': order.status})


class StoreDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import F
        total_items = StoreItem.objects.filter(is_active=True).count()
        low_stock_items = list(
            StoreItem.objects.filter(is_active=True, current_stock__lte=F('reorder_level'))
            .values('id', 'name', 'current_stock', 'reorder_level', 'unit', 'item_type')[:10]
        )
        pending_orders = StoreOrderRequest.objects.filter(status='PENDING').count()
        total_categories = StoreCategory.objects.filter(is_active=True).count()
        recent_transactions = list(
            StoreTransaction.objects.select_related('item')
            .values('id', 'transaction_type', 'quantity', 'date', 'item__name', 'item__unit', 'purpose')
            .order_by('-date', '-created_at')[:10]
        )
        return Response({
            'total_items': total_items,
            'low_stock_count': len(low_stock_items),
            'low_stock_items': low_stock_items,
            'pending_orders': pending_orders,
            'total_categories': total_categories,
            'recent_transactions': recent_transactions,
        })


# ==========================================
# DISPENSARY VIEWS
# ==========================================

class DispensaryVisitViewSet(viewsets.ModelViewSet):
    serializer_class = DispensaryVisitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DispensaryVisit.objects.select_related('student', 'attended_by').prefetch_related('prescriptions').all()
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity.upper())
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(visit_date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(visit_date__lte=date_to)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(student__first_name__icontains=search) |
                models.Q(student__last_name__icontains=search) |
                models.Q(student__admission_number__icontains=search)
            )
        return qs.order_by('-visit_date', '-created_at')

    def perform_create(self, serializer):
        visit = serializer.save()
        prescriptions = self.request.data.get('prescriptions', [])
        for p in prescriptions:
            DispensaryPrescription.objects.create(
                visit=visit,
                medication_name=p.get('medication_name', ''),
                dosage=p.get('dosage', ''),
                frequency=p.get('frequency', ''),
                quantity_dispensed=p.get('quantity_dispensed', 0),
                unit=p.get('unit', ''),
                notes=p.get('notes', ''),
            )


class DispensaryPrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = DispensaryPrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DispensaryPrescription.objects.select_related('visit__student').all()
        visit_id = self.request.query_params.get('visit')
        if visit_id:
            qs = qs.filter(visit_id=visit_id)
        return qs.order_by('-created_at')


class DispensaryStockViewSet(viewsets.ModelViewSet):
    serializer_class = DispensaryStockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DispensaryStock.objects.all()
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            from django.db.models import F
            qs = qs.filter(current_quantity__lte=F('reorder_level'))
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(medication_name__icontains=search) |
                models.Q(generic_name__icontains=search)
            )
        return qs.order_by('medication_name')


class DispensaryDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import F
        import datetime
        today = datetime.date.today()
        first_of_month = today.replace(day=1)
        visits_today = DispensaryVisit.objects.filter(visit_date=today).count()
        visits_month = DispensaryVisit.objects.filter(visit_date__gte=first_of_month).count()
        low_stock_meds = DispensaryStock.objects.filter(current_quantity__lte=F('reorder_level')).count()
        referred_count = DispensaryVisit.objects.filter(visit_date__gte=first_of_month, referred=True).count()
        recent_visits = list(
            DispensaryVisit.objects.select_related('student')
            .values('id', 'visit_date', 'complaint', 'diagnosis', 'severity',
                    'student__first_name', 'student__last_name', 'student__admission_number',
                    'referred', 'parent_notified')
            .order_by('-visit_date', '-created_at')[:10]
        )
        return Response({
            'visits_today': visits_today,
            'visits_month': visits_month,
            'low_stock_meds': low_stock_meds,
            'referred_count': referred_count,
            'recent_visits': recent_visits,
        })
