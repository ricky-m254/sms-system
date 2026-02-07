from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.db.models import Sum

from .models import (
    Student, Invoice, Payment, Enrollment,
    FeeStructure, Expense, InvoiceLineItem,
    FeeAssignment, InvoiceAdjustment, Module, UserModuleAssignment,
    Role, UserProfile
)
from hr.models import Staff
from academics.models import AcademicYear, Term, SchoolClass
from communication.models import Message
from reporting.models import AuditLog
from .serializers import (
    ExpenseSerializer, StaffSerializer,
    StudentSerializer, InvoiceSerializer, PaymentSerializer,
    EnrollmentSerializer, TermSerializer, FeeStructureSerializer,
    FeeAssignmentSerializer, InvoiceAdjustmentSerializer,
    ModuleSerializer, UserModuleAssignmentSerializer,
    FinanceStudentRefSerializer, FinanceEnrollmentRefSerializer
)
from communication.serializers import MessageSerializer
from reporting.serializers import AuditLogSerializer
from .services import (
    FinanceService, StudentsService, AcademicsService, HrService,
    CommunicationService, CoreService, ReportingService
)
from .pagination import FinanceResultsPagination
from .permissions import IsSchoolAdmin, IsAccountant, IsTeacher, HasModuleAccess

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
    queryset = FeeStructure.objects.filter(is_active=True)
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(is_active=True)
    serializer_class = StudentSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "STUDENTS"

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_active=True)
    serializer_class = InvoiceSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'delete', 'head', 'options'] # Disable PUT/PATCH (Immutability)
    pagination_class = FinanceResultsPagination

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
            # Return the created invoice
            response_serializer = self.get_serializer(invoice)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_active=True)
    serializer_class = PaymentSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'delete', 'head', 'options'] # Disable PUT/PATCH
    pagination_class = FinanceResultsPagination

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
        amount = request.data.get('amount')

        try:
            from .models import Invoice
            invoice = Invoice.objects.get(id=invoice_id)
            
            FinanceService.allocate_payment(payment, invoice, amount)
            
            return Response({"message": "Allocation successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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

        modules = list(Module.objects.filter(key__in=module_keys, is_active=True))
        found_keys = {m.key for m in modules}
        missing = [k for k in module_keys if k not in found_keys]
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

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.filter(is_active=True)
    serializer_class = ExpenseSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class FeeAssignmentViewSet(viewsets.ModelViewSet):
    queryset = FeeAssignment.objects.filter(is_active=True)
    serializer_class = FeeAssignmentSerializer
    permission_classes = [IsSchoolAdmin | IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    pagination_class = FinanceResultsPagination

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        
    def perform_create(self, serializer):
        # Use Service Logic to log it? Or just standard create? 
        # Standard create is fine, but if we want audit logs for assignment, we should use the service or signals.
        # For simplicity in Phase 1, we'll just save, but ideally use Service.
        # Let's override to use Service if possible.
        try:
             FinanceService.assign_fee(
                 student=serializer.validated_data['student'],
                 fee_structure=serializer.validated_data['fee_structure'],
                 discount_amount=serializer.validated_data.get('discount_amount', 0),
                 user=self.request.user
             )
        except Exception as e:
            # Fallback or re-raise 
             raise e

class InvoiceAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = InvoiceAdjustment.objects.all()
    serializer_class = InvoiceAdjustmentSerializer
    permission_classes = [IsAccountant, HasModuleAccess]
    module_key = "FINANCE"
    http_method_names = ['get', 'post', 'head', 'options'] # Immutable adjustments, but maybe we allow viewing
    pagination_class = FinanceResultsPagination

    def perform_create(self, serializer):
        # Use Service to Ensure Audit Log & Validation
        try:
            FinanceService.create_adjustment(
                invoice=serializer.validated_data['invoice'],
                amount=serializer.validated_data['amount'],
                reason=serializer.validated_data['reason'],
                user=self.request.user
            )
        except Exception as exc:
            raise ValidationError(str(exc))

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

class StudentsSummaryView(APIView):
    """
    Summary endpoint for Students module.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENTS"

    def get(self, request):
        return Response(StudentsService.get_summary())

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

        module_keys = [m['key'] for m in modules]

        summary = {}
        unavailable = []

        if "STUDENTS" in module_keys:
            summary["students"] = {
                "active": Student.objects.filter(is_active=True).count(),
                "enrollments": Enrollment.objects.filter(is_active=True).count()
            }

        if "HR" in module_keys:
            summary["hr"] = {
                "staff_active": Staff.objects.filter(is_active=True).count()
            }

        if "FINANCE" in module_keys:
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

        if "REPORTING" in module_keys:
            summary["reporting"] = {
                "invoices_pending": Invoice.objects.filter(is_active=True, status='CONFIRMED').count()
            }

        handled = {"STUDENTS", "HR", "FINANCE", "REPORTING", "ACADEMICS", "COMMUNICATION", "CORE"}
        for key in module_keys:
            if key not in handled:
                unavailable.append(key)

        return Response({
            "modules": module_keys,
            "modules_detail": modules,
            "unavailable_modules": unavailable,
            "summary": summary
        })
