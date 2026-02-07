from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

# ==========================================
# 1. CORE ADMINISTRATION
# ==========================================
class SchoolProfile(models.Model):
    school_name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # --- Finance Settings ---
    currency = models.CharField(max_length=10, default='KES', help_text="e.g. KES, USD")
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    receipt_prefix = models.CharField(max_length=10, default='RCT-')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.school_name
    
# ... inside Core Administration section ...

class Role(models.Model):
    """Defines User Roles within the School."""
    name = models.CharField(max_length=50, unique=True, choices=[
        ('TENANT_SUPER_ADMIN', 'Tenant Super Admin'),
        ('ADMIN', 'School Administrator'),
        ('ACCOUNTANT', 'Finance Manager'),
        ('TEACHER', 'Teaching Staff'),
    ])
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    """Links Django User to a School Role."""
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.PROTECT)
    phone = models.CharField(max_length=20, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"

class Module(models.Model):
    """Represents a functional module available to a tenant user."""
    key = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.key} - {self.name}"


class UserModuleAssignment(models.Model):
    """Assigns modules to users within a tenant."""
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='module_assignments')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='user_assignments')
    assigned_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_modules')
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'module')

    def __str__(self):
        return f"{self.user.username} -> {self.module.key}"


class AcademicYear(models.Model):
    name = models.CharField(max_length=50) # e.g., "2023-2024"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Term(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    name = models.CharField(max_length=50) # e.g., "Term 1"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.academic_year.name} - {self.name}"

# ==========================================
# 2. STUDENT MANAGEMENT
# ==========================================
class Student(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    admission_number = models.CharField(max_length=50, unique=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female')])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.admission_number} - {self.first_name} {self.last_name}"

class Guardian(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='guardians')
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50) # Father, Mother, etc.
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

# ==========================================
# 3. ACADEMIC MANAGEMENT
# ==========================================
class SchoolClass(models.Model):
    name = models.CharField(max_length=50)
    stream = models.CharField(max_length=50, blank=True) # e.g., "East", "West"
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.stream}"

class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    enrollment_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

# ==========================================
# 4. HUMAN RESOURCE (MINIMAL)
# ==========================================
class Staff(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=True)
    role = models.CharField(max_length=50) # Teaching / Non-Teaching
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

# ==========================================
# 5. FINANCE (PRIMARY) - IMMUTABLE & AUDITABLE
# ==========================================
class FeeStructure(models.Model):
    name = models.CharField(max_length=100) # e.g., "Term 1 Tuition"
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    
    # --- Billing Configuration ---
    billing_cycle = models.CharField(
        max_length=20, 
        choices=[('TERMLY', 'Termly'), ('MONTHLY', 'Monthly'), ('ONCE', 'One-Off')],
        default='TERMLY'
    )
    is_mandatory = models.BooleanField(default=True)
    
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.amount}"

class Invoice(models.Model):
    student = models.ForeignKey(Student, on_delete=models.DO_NOTHING, related_name='invoices') 
    term = models.ForeignKey(Term, on_delete=models.DO_NOTHING)
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    
    # Financials
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Status
    status = models.CharField(
        max_length=20, 
        choices=[('DRAFT', 'Draft'), ('CONFIRMED', 'Confirmed'), ('VOID', 'Void')],
        default='DRAFT'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"INV-{self.id} - {self.student.admission_number}"

    @property
    def balance_due(self):
        """Derived Balance Rule"""
        # The Fix: Balance = Total - Paid - Adjustments (Credits)
        paid = self.payments.aggregate(total=models.Sum('amount_allocated'))['total'] or 0
        adjusted = self.adjustments.aggregate(total=models.Sum('amount'))['total'] or 0
        return self.total_amount - paid - adjusted

class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.DO_NOTHING)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    def __str__(self):
        return f"{self.invoice.id} - {self.description}"

class Payment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.DO_NOTHING)
    payment_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50) # Cash, Bank Transfer, MPesa
    reference_number = models.CharField(max_length=100, unique=True)
    notes = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"PAY-{self.reference_number} - {self.amount}"
    
# ... (Inside Finance section)

class Expense(models.Model):
    """
    Tracks School Operational Expenses: Salaries, Utilities, Maintenance.
    (Can be used to track purchasing of assets/inventory as 'One-off expenses')
    """
    category = models.CharField(max_length=100, help_text="e.g., Salaries, Utilities, Purchases")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    expense_date = models.DateField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - {self.amount}"

class PaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='allocations')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount_allocated = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_at = models.DateTimeField(auto_now_add=True)

# ==========================================
# 6. COMMUNICATION
# ==========================================
class Message(models.Model):
    recipient_type = models.CharField(max_length=20) # STUDENT, GUARDIAN, STAFF
    recipient_id = models.IntegerField() # Generic ID to link to student/staff
    subject = models.CharField(max_length=200)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='SENT') # SENT, FAILED

# ==========================================
# CORE ADMINISTRATION: ROLES & PERMISSIONS
# ==========================================


# ==========================================
# 7. NEW FINANCE MODELS (ENHANCEMENT)
# ==========================================

class FeeAssignment(models.Model):
    """
    Links a Student to a FeeStructure.
    Used for knowing 'Who pays what' before invoicing.
    Essential for Scholarships/Discounts logic.
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_assignments')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE)
    
    # Specific discount for this student on this fee
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.fee_structure.name}"

class InvoiceAdjustment(models.Model):
    """
    Represents a Credit Note or Waiver.
    Reduces the balance due on an invoice without changing the immutable total_amount.
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='adjustments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount to reduce balance by")
    reason = models.TextField()
    adjusted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"ADJ-{self.id} - {self.amount}"

class AuditLog(models.Model):
    """
    Tracks sensitive actions in the system.
    """
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50) # CREATE, UPDATE, DELETE, VOID
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50) # Store ID as string to be generic
    details = models.TextField(blank=True) # JSON or text description
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} {self.model_name} - {self.user}"
