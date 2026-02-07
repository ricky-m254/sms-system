from rest_framework import serializers
from .models import (
    Expense, Student, Guardian, Enrollment,
    Invoice, InvoiceLineItem, Payment, PaymentAllocation,
    FeeStructure, SchoolProfile, Guardian,
    FeeAssignment, InvoiceAdjustment, Module, UserModuleAssignment,
    AcademicYear, Term, SchoolClass
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
    guardians = GuardianSerializer(many=True, read_only=True)
    class Meta:
        model = Student
        fields = [
            'id', 'admission_number', 'first_name', 'last_name', 
            'date_of_birth', 'gender', 'is_active', 'created_at', 'guardians'
        ]

class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'stream', 'academic_year', 'is_active']

# ==========================================
# FINANCE SERIALIZERS
# ==========================================
class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = ['id', 'name', 'start_date', 'end_date', 'academic_year', 'is_active']

class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeStructure
        fields = ['id', 'name', 'amount', 'academic_year', 'term', 'is_active']

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

    def get_student_full_name(self, obj):
        if not obj.student:
            return ""
        return f"{obj.student.first_name} {obj.student.last_name}".strip()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'student', 'student_admission_number', 'term', 
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
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'payment_date', 'amount', 'payment_method', 
            'reference_number', 'notes', 'is_active', 'allocations'
        ]
        read_only_fields = ['payment_date']

# ... existing imports ...

# ADD THIS CLASS:
class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student', read_only=True)
    class_name = serializers.CharField(source='school_class', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'school_class', 'class_name', 'term', 'enrollment_date']

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


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'category', 'amount', 'expense_date', 'description', 'created_at']
        read_only_fields = ['created_at']

class FeeAssignmentSerializer(serializers.ModelSerializer):
    fee_name = serializers.CharField(source='fee_structure.name', read_only=True)
    student_name = serializers.CharField(source='student', read_only=True)

    class Meta:
        model = FeeAssignment
        fields = ['id', 'student', 'student_name', 'fee_structure', 'fee_name', 'discount_amount', 'is_active']

class InvoiceAdjustmentSerializer(serializers.ModelSerializer):
    adjusted_by_name = serializers.CharField(source='adjusted_by.username', read_only=True)
    
    class Meta:
        model = InvoiceAdjustment
        fields = ['id', 'invoice', 'amount', 'reason', 'adjusted_by', 'adjusted_by_name', 'created_at']
        read_only_fields = ['created_at', 'adjusted_by']

