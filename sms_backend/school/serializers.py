from rest_framework import serializers
from django.db import models
from .models import (
    Expense, Student, Guardian, Enrollment,
    Invoice, InvoiceLineItem, Payment, PaymentAllocation,
    FeeStructure, SchoolProfile, Guardian,
    FeeAssignment, InvoiceAdjustment, Module, UserModuleAssignment, TenantModule, ModuleSetting,
    AcademicYear, Term, SchoolClass, AdmissionApplication, AdmissionDocument, StudentDocument, AttendanceRecord, BehaviorIncident,
    Budget,
    MedicalRecord, ImmunizationRecord, ClinicVisit,
    PaymentReversalRequest, InvoiceInstallmentPlan, InvoiceInstallment, LateFeeRule, FeeReminderLog,
    InvoiceWriteOffRequest,
    ScholarshipAward,
    AccountingPeriod, ChartOfAccount, JournalEntry, JournalLine,
    PaymentGatewayTransaction, PaymentGatewayWebhookEvent, BankStatementLine
)
from hr.models import Staff

# ==========================================
# ACADEMIC & STUDENT SERIALIZERS    
# ==========================================
class GuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = ['id', 'name', 'relationship', 'phone', 'email', 'is_active']

class StudentSerializer(serializers.ModelSerializer): 
    admission_number = serializers.CharField(required=False, allow_blank=True)
    guardians = GuardianSerializer(many=True, read_only=True)
    uploaded_documents = serializers.SerializerMethodField()
    class Meta:
        model = Student
        fields = [
            'id', 'admission_number', 'first_name', 'last_name', 
            'date_of_birth', 'gender', 'photo', 'is_active', 'created_at', 'guardians',
            'uploaded_documents'
        ]

    def get_uploaded_documents(self, obj):
        return [
            {
                "id": doc.id,
                "name": doc.file.name,
                "url": doc.file.url,
                "uploaded_at": doc.uploaded_at,
            }
            for doc in obj.uploaded_documents.all()
        ]

class SchoolClassSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = SchoolClass
        fields = [
            'id', 'name', 'stream', 'display_name', 'academic_year',
            'grade_level', 'section_name', 'class_teacher', 'room',
            'capacity', 'is_active'
        ]

class SchoolProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SchoolProfile
        fields = [
            'id',
            'school_name',
            'logo',
            'logo_url',
            'address',
            'phone',
            'currency',
            'tax_percentage',
            'receipt_prefix',
            'admission_number_mode',
            'admission_number_prefix',
            'admission_number_padding',
            'is_active',
        ]
        read_only_fields = ['id', 'logo_url']

    def get_logo_url(self, obj):
        return obj.logo.url if obj.logo else None

# ==========================================
# FINANCE SERIALIZERS
# ==========================================
class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = [
            'id', 'name', 'start_date', 'end_date', 'billing_date',
            'academic_year', 'is_active', 'is_current'
        ]

class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeStructure
        fields = [
            'id',
            'name',
            'category',
            'amount',
            'academic_year',
            'term',
            'grade_level',
            'billing_cycle',
            'is_mandatory',
            'description',
            'is_active',
        ]

class InvoiceLineItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    
    fee_structure = serializers.PrimaryKeyRelatedField(
        queryset=FeeStructure.objects.all()
    )
    
    description = serializers.CharField(allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        model = InvoiceLineItem
        fields = ['id', 'fee_structure', 'description', 'amount']
        
class InvoiceSerializer(serializers.ModelSerializer):
    """
    Handles Invoice creation and display.
    Balances are derived (property) and included automatically.
    """
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())
    term = serializers.PrimaryKeyRelatedField(queryset=Term.objects.all())
    student_admission_number = serializers.CharField(source='student.admission_number', read_only=True)
    student_full_name = serializers.SerializerMethodField()
    line_items = InvoiceLineItemSerializer(many=True)
    balance_due = serializers.ReadOnlyField() # Derived from model property
    invoice_number = serializers.CharField(read_only=True)

    def get_student_full_name(self, obj):
        if not obj.student:
            return ""
        return f"{obj.student.first_name} {obj.student.last_name}".strip()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'student', 'student_admission_number', 'term', 
            'invoice_date', 'due_date', 'total_amount', 'status', 
            'balance_due', 'is_active', 'created_at', 'line_items', 'student_full_name'
        ]
        read_only_fields = ['invoice_date', 'created_at',  'total_amount']

        depth = 1

    # Note: Create logic is complex, so we will handle it in the Service Layer, 
    # but we define the structure here.

class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = ['id', 'invoice', 'amount_allocated', 'allocated_at']
        read_only_fields = ['allocated_at']

class PaymentSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, required=False)
    allocated_amount = serializers.SerializerMethodField()
    unallocated_amount = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'payment_date', 'amount', 'payment_method', 
            'reference_number', 'receipt_number', 'notes', 'is_active',
            'reversed_at', 'reversal_reason', 'reversed_by', 'allocations',
            'allocated_amount', 'unallocated_amount', 'student_name'
        ]
        read_only_fields = ['payment_date', 'receipt_number', 'reversed_at', 'reversed_by']

    def get_allocated_amount(self, obj):
        total = obj.allocations.aggregate(total=models.Sum('amount_allocated'))['total'] or 0
        return total

    def get_unallocated_amount(self, obj):
        total = obj.allocations.aggregate(total=models.Sum('amount_allocated'))['total'] or 0
        return obj.amount - total

# ... existing imports ...

# ADD THIS CLASS:
class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    class_name = serializers.CharField(source='school_class', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id',
            'student',
            'student_name',
            'school_class',
            'class_name',
            'term',
            'enrollment_date',
            'left_date',
            'status',
            'is_active',
        ]

class AdmissionApplicationSerializer(serializers.ModelSerializer):
    applying_for_grade_name = serializers.CharField(source='applying_for_grade.name', read_only=True)
    documents_upload = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    uploaded_documents = serializers.SerializerMethodField()

    class Meta:
        model = AdmissionApplication
        fields = [
            'id', 'application_number', 'student_first_name', 'student_last_name',
            'student_dob', 'student_gender', 'previous_school', 'applying_for_grade',
            'applying_for_grade_name', 'application_date', 'status',
            'interview_date', 'interview_notes', 'assessment_score',
            'decision', 'decision_date', 'decision_notes', 'student',
            'guardian_name', 'guardian_phone', 'guardian_email', 'notes',
            'documents', 'student_photo', 'documents_upload', 'uploaded_documents', 'created_at'
        ]
        read_only_fields = ['application_number', 'created_at']

    def get_uploaded_documents(self, obj):
        return [
            {
                "id": doc.id,
                "name": doc.file.name,
                "url": doc.file.url
            }
            for doc in obj.uploaded_documents.all()
        ]

    def create(self, validated_data):
        documents_files = validated_data.pop('documents_upload', [])
        instance = super().create(validated_data)

        if documents_files:
            docs_payload = []
            for upload in documents_files:
                doc = AdmissionDocument.objects.create(application=instance, file=upload)
                docs_payload.append({"type": doc.file.name, "received": True})

            if not instance.documents:
                instance.documents = []
            instance.documents.extend(docs_payload)
            instance.save(update_fields=['documents'])

        return instance

class StudentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDocument
        fields = ['id', 'student', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'student', 'student_name', 'date', 'status', 'notes', 'recorded_by', 'created_at']
        read_only_fields = ['created_at', 'recorded_by']

class BehaviorIncidentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)

    class Meta:
        model = BehaviorIncident
        fields = [
            'id', 'student', 'student_name', 'incident_type', 'category',
            'incident_date', 'description', 'severity', 'reported_by', 'created_at'
        ]
        read_only_fields = ['created_at', 'reported_by']


class MedicalRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    last_visit = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'student', 'student_name', 'blood_type', 'allergies',
            'chronic_conditions', 'current_medications', 'doctor_name',
            'doctor_phone', 'notes', 'last_visit', 'updated_at'
        ]
        read_only_fields = ['updated_at']

    def get_last_visit(self, obj):
        visit = obj.student.clinic_visits.order_by('-visit_date', '-created_at').first()
        if not visit:
            return None
        return str(visit.visit_date)


class ImmunizationRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = ImmunizationRecord
        fields = [
            'id', 'student', 'student_name', 'vaccine_name', 'date_administered',
            'booster_due_date', 'certificate', 'certificate_url', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_certificate_url(self, obj):
        return obj.certificate.url if obj.certificate else None


class ClinicVisitSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    attended_by_name = serializers.CharField(source='attended_by.username', read_only=True)

    class Meta:
        model = ClinicVisit
        fields = [
            'id', 'student', 'student_name', 'visit_date', 'visit_time',
            'complaint', 'treatment', 'attended_by', 'attended_by_name',
            'parent_notified', 'severity', 'created_at'
        ]
        read_only_fields = ['created_at', 'attended_by']

class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ['id', 'first_name', 'last_name', 'employee_id', 'role', 'phone', 'is_active', 'created_at']
        read_only_fields = ['created_at']

class FinanceStudentRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            'id', 'admission_number', 'first_name', 'last_name',
            'gender', 'is_active'
        ]

class FinanceEnrollmentRefSerializer(serializers.ModelSerializer):
    student_admission_number = serializers.CharField(source='student.admission_number', read_only=True)
    student_name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source='school_class.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_admission_number', 'student_name',
            'school_class', 'class_name', 'term', 'term_name', 'is_active'
        ]

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'key', 'name', 'is_active', 'created_at']
        read_only_fields = ['created_at']

class UserModuleAssignmentSerializer(serializers.ModelSerializer):
    module_key = serializers.CharField(source='module.key', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)

    class Meta:
        model = UserModuleAssignment
        fields = [
            'id', 'user', 'user_name', 'module', 'module_key', 'module_name',
            'assigned_by', 'assigned_by_name', 'is_active', 'assigned_at'
        ]
        read_only_fields = ['assigned_at', 'assigned_by']


class ModuleSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleSetting
        fields = [
            'id',
            'theme_preset',
            'primary_color',
            'secondary_color',
            'sidebar_style',
            'feature_toggles',
            'config',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate(self, attrs):
        def _is_hex_color(value: str) -> bool:
            if not isinstance(value, str):
                return False
            if not value.startswith('#'):
                return False
            code = value[1:]
            if len(code) not in (3, 6):
                return False
            return all(ch in '0123456789abcdefABCDEF' for ch in code)

        for color_field in ('primary_color', 'secondary_color'):
            if color_field in attrs and not _is_hex_color(attrs[color_field]):
                raise serializers.ValidationError({color_field: 'Use a valid hex color like #10b981.'})

        toggles = attrs.get('feature_toggles')
        if toggles is not None:
            if not isinstance(toggles, dict):
                raise serializers.ValidationError({'feature_toggles': 'feature_toggles must be an object.'})
            allowed = {'analytics', 'reports', 'export', 'ai_assistant'}
            unknown = sorted([key for key in toggles.keys() if key not in allowed])
            if unknown:
                raise serializers.ValidationError(
                    {'feature_toggles': f'Unsupported feature toggles: {", ".join(unknown)}'}
                )
            for key in allowed:
                if key in toggles and not isinstance(toggles[key], bool):
                    raise serializers.ValidationError({'feature_toggles': f'"{key}" must be a boolean.'})

        return attrs


class TenantModuleSerializer(serializers.ModelSerializer):
    module_id = serializers.IntegerField(source='module.id', read_only=True)
    module_key = serializers.CharField(source='module.key', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    settings = ModuleSettingSerializer(read_only=True)

    class Meta:
        model = TenantModule
        fields = [
            'id',
            'module_id',
            'module_key',
            'module_name',
            'is_enabled',
            'sort_order',
            'settings',
            'updated_at',
        ]
        read_only_fields = fields


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id',
            'category',
            'amount',
            'expense_date',
            'vendor',
            'payment_method',
            'invoice_number',
            'approval_status',
            'description',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['created_at']


class BudgetSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id',
            'academic_year',
            'academic_year_name',
            'term',
            'term_name',
            'monthly_budget',
            'quarterly_budget',
            'annual_budget',
            'categories',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

class FeeAssignmentSerializer(serializers.ModelSerializer):
    fee_name = serializers.CharField(source='fee_structure.name', read_only=True)
    student_name = serializers.CharField(source='student', read_only=True)

    class Meta:
        model = FeeAssignment
        fields = [
            'id',
            'student',
            'student_name',
            'fee_structure',
            'fee_name',
            'discount_amount',
            'start_date',
            'end_date',
            'is_active',
        ]

class ScholarshipAwardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = ScholarshipAward
        fields = [
            'id',
            'student',
            'student_name',
            'program_name',
            'award_type',
            'amount',
            'percentage',
            'start_date',
            'end_date',
            'status',
            'notes',
            'is_active',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by', 'approved_by', 'created_at', 'updated_at']

class InvoiceAdjustmentSerializer(serializers.ModelSerializer):
    adjusted_by_name = serializers.CharField(source='adjusted_by.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)
    
    class Meta:
        model = InvoiceAdjustment
        fields = [
            'id',
            'invoice',
            'adjustment_type',
            'amount',
            'reason',
            'adjusted_by',
            'adjusted_by_name',
            'status',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'created_at',
        ]
        read_only_fields = ['created_at', 'adjusted_by', 'status', 'reviewed_by', 'reviewed_at', 'review_notes']


class PaymentReversalRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)
    payment_reference = serializers.CharField(source='payment.reference_number', read_only=True)
    payment_receipt = serializers.CharField(source='payment.receipt_number', read_only=True)

    class Meta:
        model = PaymentReversalRequest
        fields = [
            'id',
            'payment',
            'payment_reference',
            'payment_receipt',
            'reason',
            'requested_by',
            'requested_by_name',
            'requested_at',
            'status',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
        ]
        read_only_fields = ['requested_by', 'requested_at', 'status', 'reviewed_by', 'reviewed_at']


class InvoiceWriteOffRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    student_name = serializers.CharField(source='invoice.student', read_only=True)
    adjustment_id = serializers.IntegerField(source='applied_adjustment_id', read_only=True)

    class Meta:
        model = InvoiceWriteOffRequest
        fields = [
            'id',
            'invoice',
            'invoice_number',
            'student_name',
            'amount',
            'reason',
            'requested_by',
            'requested_by_name',
            'requested_at',
            'status',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'adjustment_id',
        ]
        read_only_fields = [
            'requested_by', 'requested_at', 'status',
            'reviewed_by', 'reviewed_at', 'review_notes', 'adjustment_id',
        ]


class InvoiceInstallmentSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceInstallment
        fields = [
            'id', 'sequence', 'due_date', 'amount', 'collected_amount',
            'outstanding_amount', 'status', 'paid_at', 'late_fee_applied'
        ]
        read_only_fields = ['status', 'paid_at', 'late_fee_applied']

    def get_outstanding_amount(self, obj):
        outstanding = (obj.amount or 0) - (obj.collected_amount or 0)
        return outstanding if outstanding > 0 else 0


class InvoiceInstallmentPlanSerializer(serializers.ModelSerializer):
    installments = InvoiceInstallmentSerializer(many=True, required=False)

    class Meta:
        model = InvoiceInstallmentPlan
        fields = ['id', 'invoice', 'installment_count', 'created_by', 'created_at', 'installments']
        read_only_fields = ['created_by', 'created_at']


class LateFeeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = LateFeeRule
        fields = ['id', 'grace_days', 'fee_type', 'value', 'max_fee', 'is_active']


class FeeReminderLogSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = FeeReminderLog
        fields = ['id', 'invoice', 'invoice_number', 'channel', 'recipient', 'sent_at', 'status', 'message']
        read_only_fields = ['sent_at']


class AccountingPeriodSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source='closed_by.username', read_only=True)

    class Meta:
        model = AccountingPeriod
        fields = [
            'id', 'name', 'start_date', 'end_date',
            'is_closed', 'closed_at', 'closed_by', 'closed_by_name', 'created_at',
        ]
        read_only_fields = ['closed_at', 'closed_by', 'created_at']


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = ['id', 'code', 'name', 'account_type', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = JournalLine
        fields = ['id', 'account', 'account_code', 'account_name', 'debit', 'credit', 'description']


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True)
    posted_by_name = serializers.CharField(source='posted_by.username', read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_date', 'memo', 'source_type', 'source_id',
            'entry_key', 'posted_by', 'posted_by_name', 'created_at', 'lines',
        ]
        read_only_fields = ['created_at']


class PaymentGatewayTransactionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = PaymentGatewayTransaction
        fields = [
            'id', 'provider', 'external_id', 'student', 'student_name', 'invoice', 'invoice_number',
            'amount', 'currency', 'status', 'payload', 'is_reconciled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_reconciled']


class PaymentGatewayWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGatewayWebhookEvent
        fields = [
            'id', 'event_id', 'provider', 'event_type', 'signature', 'payload',
            'processed', 'processed_at', 'error', 'received_at'
        ]
        read_only_fields = ['processed', 'processed_at', 'error', 'received_at']


class BankStatementLineSerializer(serializers.ModelSerializer):
    matched_payment_reference = serializers.CharField(source='matched_payment.reference_number', read_only=True)
    matched_gateway_external_id = serializers.CharField(source='matched_gateway_transaction.external_id', read_only=True)

    class Meta:
        model = BankStatementLine
        fields = [
            'id', 'statement_date', 'value_date', 'amount', 'reference', 'narration', 'source',
            'status', 'matched_payment', 'matched_payment_reference',
            'matched_gateway_transaction', 'matched_gateway_external_id', 'imported_at'
        ]
        read_only_fields = ['imported_at']

