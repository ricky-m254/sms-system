from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal

# ==========================================
# 1. CORE ADMINISTRATION
# ==========================================
class SchoolProfile(models.Model):
    ADMISSION_NUMBER_MODE_CHOICES = [
        ("AUTO", "Auto generate"),
        ("MANUAL", "Manual entry"),
    ]

    school_name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='school_logos/', blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # --- Finance Settings ---
    currency = models.CharField(max_length=10, default='KES', help_text="e.g. KES, USD")
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    receipt_prefix = models.CharField(max_length=10, default='RCT-')
    admission_number_mode = models.CharField(
        max_length=20,
        choices=ADMISSION_NUMBER_MODE_CHOICES,
        default="AUTO",
    )
    admission_number_prefix = models.CharField(max_length=20, default="ADM-")
    admission_number_padding = models.PositiveIntegerField(default=4)
    
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


class TenantModule(models.Model):
    """
    Tenant-scoped module enablement record.
    Tenant isolation is guaranteed by schema-level isolation (django-tenants).
    """
    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name='tenant_module')
    is_enabled = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'module__key']

    def __str__(self):
        return f"{self.module.key} ({'enabled' if self.is_enabled else 'disabled'})"


class ModuleSetting(models.Model):
    """
    Theme + feature toggles per tenant module.
    Flexible data is stored in JSON for forward compatibility.
    """
    PRESET_DEFAULT = "DEFAULT"
    PRESET_MODERN = "MODERN"
    PRESET_CLASSIC = "CLASSIC"
    PRESET_MINIMAL = "MINIMAL"
    PRESET_DARK = "DARK"
    PRESET_CHOICES = [
        (PRESET_DEFAULT, "Default"),
        (PRESET_MODERN, "Modern"),
        (PRESET_CLASSIC, "Classic"),
        (PRESET_MINIMAL, "Minimal"),
        (PRESET_DARK, "Dark"),
    ]

    SIDEBAR_COLLAPSED = "COLLAPSED"
    SIDEBAR_EXPANDED = "EXPANDED"
    SIDEBAR_ICON_ONLY = "ICON_ONLY"
    SIDEBAR_STYLE_CHOICES = [
        (SIDEBAR_COLLAPSED, "Collapsed"),
        (SIDEBAR_EXPANDED, "Expanded"),
        (SIDEBAR_ICON_ONLY, "Icon-only"),
    ]

    tenant_module = models.OneToOneField(
        TenantModule,
        on_delete=models.CASCADE,
        related_name='settings',
    )
    theme_preset = models.CharField(max_length=20, choices=PRESET_CHOICES, default=PRESET_DEFAULT)
    primary_color = models.CharField(max_length=16, default="#10b981")
    secondary_color = models.CharField(max_length=16, default="#0ea5e9")
    sidebar_style = models.CharField(
        max_length=20,
        choices=SIDEBAR_STYLE_CHOICES,
        default=SIDEBAR_EXPANDED,
    )
    feature_toggles = models.JSONField(default=dict, blank=True)
    config = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_module_settings',
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_module_settings',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tenant_module__module__key']

    def __str__(self):
        return f"{self.tenant_module.module.key} settings"


class AcademicYear(models.Model):
    name = models.CharField(max_length=50) # e.g., "2023-2024"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)

    def __str__(self):
        return self.name

class Term(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    name = models.CharField(max_length=50) # e.g., "Term 1"
    start_date = models.DateField()
    end_date = models.DateField()
    billing_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_current = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            Term.objects.exclude(pk=self.pk).update(is_current=False)
    
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
    photo = models.ImageField(upload_to='students/photos/', blank=True, null=True)
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
class GradeLevel(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., Form 1 / Grade 7
    order = models.PositiveIntegerField(default=1)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class SchoolClass(models.Model):
    # Legacy fields retained for compatibility with existing flows.
    name = models.CharField(max_length=50)
    stream = models.CharField(max_length=50, blank=True) # e.g., "East", "West"
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.SET_NULL, null=True, blank=True)
    section_name = models.CharField(max_length=50, blank=True)
    class_teacher = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='homeroom_classes')
    room = models.CharField(max_length=100, blank=True)
    capacity = models.PositiveIntegerField(default=40)
    is_active = models.BooleanField(default=True)

    @property
    def display_name(self):
        if self.grade_level and self.section_name:
            return f"{self.grade_level.name} {self.section_name}".strip()
        if self.stream:
            return f"{self.name} {self.stream}".strip()
        return self.name

    def __str__(self):
        return self.display_name

class Enrollment(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('Withdrawn', 'Withdrawn'),
        ('Transferred', 'Transferred'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    enrollment_date = models.DateField(auto_now_add=True)
    left_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    is_active = models.BooleanField(default=True)


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    head = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Subject(models.Model):
    SUBJECT_TYPE_CHOICES = [
        ('Compulsory', 'Compulsory'),
        ('Elective', 'Elective'),
    ]

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE_CHOICES, default='Compulsory')
    periods_week = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('code',)

    def __str__(self):
        return f"{self.code} - {self.name}"


class SubjectMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='mappings')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    is_compulsory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('subject', 'grade_level', 'academic_year')

    def __str__(self):
        return f"{self.subject.code} @ {self.grade_level.name} ({self.academic_year.name})"


class SyllabusTopic(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='syllabus_topics')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    topic_name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1)
    is_completed = models.BooleanField(default=False)
    completed_date = models.DateField(null=True, blank=True)
    completed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['term_id', 'order', 'id']

    def __str__(self):
        return f"{self.subject.code} {self.topic_name}"


class TeacherAssignment(models.Model):
    teacher = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='teacher_assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_section = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE, null=True, blank=True)
    is_primary = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'subject', 'class_section', 'academic_year', 'term')

    def __str__(self):
        return f"{self.teacher.username}: {self.subject.code} @ {self.class_section.display_name}"


class GradingScheme(models.Model):
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            GradingScheme.objects.exclude(pk=self.pk).update(is_default=False)

    def __str__(self):
        return self.name


class GradeBand(models.Model):
    scheme = models.ForeignKey(GradingScheme, on_delete=models.CASCADE, related_name='bands')
    label = models.CharField(max_length=20)
    min_score = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    max_score = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    grade_point = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remark = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-min_score', '-max_score', 'id']

    def __str__(self):
        return f"{self.scheme.name} {self.label}"


class Assessment(models.Model):
    CATEGORY_CHOICES = [
        ('Classwork', 'Classwork'),
        ('Homework', 'Homework'),
        ('Test', 'Test'),
        ('Exam', 'Exam'),
        ('Project', 'Project'),
        ('Practical', 'Practical'),
    ]

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Test')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_section = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(Decimal('0.00'))])
    date = models.DateField()
    is_published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.subject.code})"


class AssessmentGrade(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='grades')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    raw_score = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    percentage = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    grade_band = models.ForeignKey(GradeBand, on_delete=models.SET_NULL, null=True, blank=True)
    entered_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    entered_at = models.DateTimeField(auto_now=True)
    remarks = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('assessment', 'student')

    def __str__(self):
        return f"{self.assessment_id} - {self.student_id}"


class TermResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    class_section = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    grade_band = models.ForeignKey(GradeBand, on_delete=models.SET_NULL, null=True, blank=True)
    class_rank = models.PositiveIntegerField(null=True, blank=True)
    is_pass = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'class_section', 'term', 'subject')

    def __str__(self):
        return f"{self.student_id} {self.subject.code} {self.term.name}"


class ReportCard(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Approved', 'Approved'),
        ('Published', 'Published'),
        ('Distributed', 'Distributed'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    class_section = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    teacher_remarks = models.TextField(blank=True)
    principal_remarks = models.TextField(blank=True)
    class_rank = models.PositiveIntegerField(null=True, blank=True)
    overall_grade = models.CharField(max_length=50, blank=True)
    attendance_days = models.PositiveIntegerField(default=0)
    pdf_file = models.FileField(upload_to='report_cards/', null=True, blank=True)
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('student', 'class_section', 'term', 'academic_year')

    def __str__(self):
        return f"ReportCard {self.student_id} {self.term.name}"


class Assignment(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Closed', 'Closed'),
        ('Graded', 'Graded'),
    ]

    title = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_section = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    teacher = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    max_score = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    publish_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class AssignmentSubmission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_late = models.BooleanField(default=False)
    file = models.FileField(upload_to='assignments/submissions/', null=True, blank=True)
    notes = models.TextField(blank=True)
    score = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.assignment_id} - {self.student_id}"


class CalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('Holiday', 'Holiday'),
        ('Exam', 'Exam'),
        ('Sports', 'Sports'),
        ('Trip', 'Trip'),
        ('Meeting', 'Meeting'),
        ('Closure', 'Closure'),
        ('Other', 'Other'),
    ]
    SCOPE_CHOICES = [
        ('School-wide', 'School-wide'),
        ('Class-specific', 'Class-specific'),
        ('Staff-only', 'Staff-only'),
    ]

    title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='Other')
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    description = models.TextField(blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='School-wide')
    class_section = models.ForeignKey(SchoolClass, on_delete=models.SET_NULL, null=True, blank=True)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class StudentDocument(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='uploaded_documents')
    file = models.FileField(upload_to='students/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_id} - {self.file.name}"

# ==========================================
# 2C. ATTENDANCE & BEHAVIOR
# ==========================================
class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('Late', 'Late'),
        ('Excused', 'Excused'),
        ('Half-Day', 'Half-Day'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'date')

    def __str__(self):
        return f"{self.student.admission_number} {self.date} {self.status}"

class BehaviorIncident(models.Model):
    INCIDENT_TYPES = [
        ('Positive', 'Positive'),
        ('Negative', 'Negative'),
    ]

    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    category = models.CharField(max_length=100)
    incident_date = models.DateField()
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True)
    reported_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.admission_number} {self.incident_type} {self.category}"

# ==========================================
# 2D. MEDICAL RECORDS
# ==========================================
class MedicalRecord(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='medical_record')
    blood_type = models.CharField(max_length=10, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    doctor_name = models.CharField(max_length=255, blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.admission_number} medical record"


class ImmunizationRecord(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='immunizations')
    vaccine_name = models.CharField(max_length=255)
    date_administered = models.DateField()
    booster_due_date = models.DateField(null=True, blank=True)
    certificate = models.FileField(upload_to='students/immunizations/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.admission_number} {self.vaccine_name}"


class ClinicVisit(models.Model):
    SEVERITY_CHOICES = [
        ('Minor', 'Minor'),
        ('Moderate', 'Moderate'),
        ('Serious', 'Serious'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='clinic_visits')
    visit_date = models.DateField()
    visit_time = models.TimeField(null=True, blank=True)
    complaint = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    attended_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    parent_notified = models.BooleanField(default=False)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.admission_number} {self.visit_date}"

# ==========================================
# 2B. ADMISSIONS
# ==========================================
class AdmissionApplication(models.Model):
    STATUS_CHOICES = [
        ('Inquiry', 'Inquiry'),
        ('Submitted', 'Submitted'),
        ('Documents Received', 'Documents Received'),
        ('Interview Scheduled', 'Interview Scheduled'),
        ('Assessed', 'Assessed'),
        ('Admitted', 'Admitted'),
        ('Rejected', 'Rejected'),
        ('Enrolled', 'Enrolled'),
        ('Withdrawn', 'Withdrawn'),
    ]

    DECISION_CHOICES = [
        ('Pending', 'Pending'),
        ('Admitted', 'Admitted'),
        ('Rejected', 'Rejected'),
    ]

    application_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    student_first_name = models.CharField(max_length=100)
    student_last_name = models.CharField(max_length=100)
    student_dob = models.DateField()
    student_gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])
    previous_school = models.CharField(max_length=255, blank=True)
    applying_for_grade = models.ForeignKey(SchoolClass, on_delete=models.SET_NULL, null=True, blank=True)
    application_date = models.DateField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Submitted')

    interview_date = models.DateField(null=True, blank=True)
    interview_notes = models.TextField(blank=True)
    assessment_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, default='Pending')
    decision_date = models.DateField(null=True, blank=True)
    decision_notes = models.TextField(blank=True)

    guardian_name = models.CharField(max_length=255, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)

    documents = models.JSONField(default=list, blank=True)
    student_photo = models.ImageField(upload_to='admissions/photos/', blank=True, null=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.application_number:
            # First insert to get PK, then update only the application_number.
            if self._state.adding:
                super().save(*args, **kwargs)
                self.application_number = f"APP-{self.application_date.year}-{self.pk:04d}"
                super().save(update_fields=['application_number'])
                return
            self.application_number = f"APP-{self.application_date.year}-{self.pk:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application_number} - {self.student_first_name} {self.student_last_name}"

class AdmissionDocument(models.Model):
    application = models.ForeignKey(
        AdmissionApplication,
        on_delete=models.CASCADE,
        related_name='uploaded_documents'
    )
    file = models.FileField(upload_to='admissions/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.application_id} - {self.file.name}"

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
    category = models.CharField(max_length=100, blank=True, default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    grade_level = models.ForeignKey('GradeLevel', on_delete=models.SET_NULL, null=True, blank=True)
    
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
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('VOID', 'Void'),
        ('CONFIRMED', 'Confirmed'),  # backward compatibility
    ]

    student = models.ForeignKey(Student, on_delete=models.DO_NOTHING, related_name='invoices') 
    term = models.ForeignKey(Term, on_delete=models.DO_NOTHING)
    invoice_number = models.CharField(max_length=40, unique=True, null=True, blank=True)
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    
    # Financials
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Status
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='DRAFT'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.invoice_number or f'INV-{self.id}'} - {self.student.admission_number}"

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating and not self.invoice_number:
            self.invoice_number = f"INV-{self.id:06d}"
            super().save(update_fields=['invoice_number'])

    @property
    def balance_due(self):
        """Derived Balance Rule"""
        paid = self.payments.filter(payment__is_active=True).aggregate(total=models.Sum('amount_allocated'))['total'] or 0
        adjusted = sum(adjustment.signed_amount for adjustment in self.adjustments.all())
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
    receipt_number = models.CharField(max_length=60, unique=True, null=True, blank=True)
    notes = models.TextField(blank=True)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversal_reason = models.TextField(blank=True)
    reversed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversed_payments')
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"PAY-{self.reference_number} - {self.amount}"

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating and not self.receipt_number:
            prefix = 'RCT-'
            profile = SchoolProfile.objects.filter(is_active=True).first()
            if profile and profile.receipt_prefix:
                prefix = profile.receipt_prefix
            self.receipt_number = f"{prefix}{self.id:06d}"
            super().save(update_fields=['receipt_number'])
    
# ... (Inside Finance section)

class Expense(models.Model):
    """
    Tracks School Operational Expenses: Salaries, Utilities, Maintenance.
    (Can be used to track purchasing of assets/inventory as 'One-off expenses')
    """
    category = models.CharField(max_length=100, help_text="e.g., Salaries, Utilities, Purchases")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    expense_date = models.DateField()
    vendor = models.CharField(max_length=150, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    invoice_number = models.CharField(max_length=120, blank=True)
    approval_status = models.CharField(
        max_length=30,
        choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')],
        default='Pending',
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - {self.amount}"

class Budget(models.Model):
    """
    Budget envelope scoped by academic year + term + name (multiple per term allowed).
    """
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    name = models.CharField(max_length=200, default='General Budget')
    monthly_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    quarterly_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    annual_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    categories = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.academic_year} / {self.term}"

class PaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='allocations')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount_allocated = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_at = models.DateTimeField(auto_now_add=True)

class VoteHead(models.Model):
    PRELOADED_NAMES = ['Tuition', 'Exam', 'Medical', 'Activity', 'Boarding/Meals', 'Development', 'Arrears']

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    allocation_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00'),
        help_text="Percentage of each payment allocated to this vote head (0 = manual/unallocated)",
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_preloaded = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

class VoteHeadPaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='vote_head_allocations')
    vote_head = models.ForeignKey(VoteHead, on_delete=models.CASCADE, related_name='payment_allocations')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('payment', 'vote_head')

    def __str__(self):
        return f"{self.vote_head.name} ← {self.amount} ({self.payment.receipt_number})"

class CashbookEntry(models.Model):
    ENTRY_TYPES = [
        ('OPENING', 'Opening Balance'),
        ('RECEIPT', 'Receipt (Payment In)'),
        ('EXPENSE', 'Expense (Payment Out)'),
        ('ADJUSTMENT', 'Adjustment'),
    ]
    BOOK_TYPES = [
        ('CASH', 'Cashbook'),
        ('BANK', 'Bankbook'),
    ]

    book_type = models.CharField(max_length=10, choices=BOOK_TYPES, default='CASH')
    entry_date = models.DateField()
    entry_type = models.CharField(max_length=15, choices=ENTRY_TYPES)
    reference = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255)
    amount_in = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_out = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    running_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='cashbook_entries')
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='cashbook_entries')
    is_auto = models.BooleanField(default=False, help_text="Auto-created from payment/expense")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['book_type', 'entry_date', 'created_at']

    def __str__(self):
        return f"{self.book_type} {self.entry_date} {self.entry_type} {self.amount_in or self.amount_out}"

class BalanceCarryForward(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='carry_forwards')
    from_term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='carry_forwards_from')
    to_term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='carry_forwards_to')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'from_term', 'to_term')

    def __str__(self):
        return f"Carry {self.student} {self.from_term}→{self.to_term}: {self.amount}"

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
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.fee_structure.name}"

class ScholarshipAward(models.Model):
    AWARD_TYPE_CHOICES = [
        ('FIXED', 'Fixed Amount'),
        ('PERCENT', 'Percentage'),
        ('FULL', 'Full Coverage'),
    ]
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('ENDED', 'Ended'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='scholarships')
    program_name = models.CharField(max_length=150)
    award_type = models.CharField(max_length=20, choices=AWARD_TYPE_CHOICES, default='FIXED')
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_scholarships')
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_scholarships')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.program_name}"

class InvoiceAdjustment(models.Model):
    """
    Represents a Credit Note or Waiver.
    Reduces the balance due on an invoice without changing the immutable total_amount.
    """
    TYPE_CHOICES = [
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='adjustments')
    adjustment_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='CREDIT')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    reason = models.TextField()
    adjusted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='APPROVED')
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_invoice_adjustments')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"ADJ-{self.id} - {self.amount}"

    @property
    def signed_amount(self):
        if self.status != 'APPROVED':
            return Decimal('0.00')
        return self.amount if self.adjustment_type == 'CREDIT' else -self.amount


class PaymentReversalRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='reversal_requests')
    reason = models.TextField()
    requested_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='payment_reversal_requests')
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_payment_reversals')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    def __str__(self):
        return f"REV-{self.id} {self.payment_id} {self.status}"


class InvoiceWriteOffRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='writeoff_requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    reason = models.TextField()
    requested_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='invoice_writeoff_requests')
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_invoice_writeoffs')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    applied_adjustment = models.ForeignKey('InvoiceAdjustment', on_delete=models.SET_NULL, null=True, blank=True, related_name='source_writeoff_requests')

    class Meta:
        ordering = ['-requested_at', '-id']

    def __str__(self):
        return f"WRO-{self.id} {self.invoice_id} {self.status}"


class InvoiceInstallmentPlan(models.Model):
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name='installment_plan')
    installment_count = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Plan {self.invoice_id} x{self.installment_count}"


class InvoiceInstallment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('WAIVED', 'Waived'),
    ]
    plan = models.ForeignKey(InvoiceInstallmentPlan, on_delete=models.CASCADE, related_name='installments')
    sequence = models.PositiveIntegerField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    collected_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(Decimal('0.00'))])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    paid_at = models.DateTimeField(null=True, blank=True)
    late_fee_applied = models.BooleanField(default=False)

    class Meta:
        unique_together = ('plan', 'sequence')
        ordering = ['sequence']

    def __str__(self):
        return f"{self.plan_id}#{self.sequence} {self.status}"


class LateFeeRule(models.Model):
    FEE_TYPE_CHOICES = [
        ('FLAT', 'Flat'),
        ('PERCENT', 'Percent'),
    ]
    grace_days = models.PositiveIntegerField(default=0)
    fee_type = models.CharField(max_length=20, choices=FEE_TYPE_CHOICES, default='FLAT')
    value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    max_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"LateFee {self.fee_type} {self.value}"


class FeeReminderLog(models.Model):
    CHANNEL_CHOICES = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('INAPP', 'InApp'),
    ]
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='reminder_logs')
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='EMAIL')
    recipient = models.CharField(max_length=255)
    sent_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default='SENT')
    message = models.TextField(blank=True)


class PaymentGatewayTransaction(models.Model):
    STATUS_CHOICES = [
        ('INITIATED', 'Initiated'),
        ('PENDING', 'Pending'),
        ('SUCCEEDED', 'Succeeded'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]

    provider = models.CharField(max_length=40, default='manual')
    external_id = models.CharField(max_length=120, unique=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    currency = models.CharField(max_length=10, default='KES')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payload = models.JSONField(default=dict, blank=True)
    is_reconciled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.provider}:{self.external_id} {self.status}"


class PaymentGatewayWebhookEvent(models.Model):
    event_id = models.CharField(max_length=120, unique=True)
    provider = models.CharField(max_length=40)
    event_type = models.CharField(max_length=80)
    signature = models.CharField(max_length=255, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.provider}:{self.event_type}:{self.event_id}"


class BankStatementLine(models.Model):
    STATUS_CHOICES = [
        ('UNMATCHED', 'Unmatched'),
        ('MATCHED', 'Matched'),
        ('CLEARED', 'Cleared'),
        ('IGNORED', 'Ignored'),
    ]

    statement_date = models.DateField()
    value_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=160, blank=True)
    narration = models.TextField(blank=True)
    source = models.CharField(max_length=40, default='manual')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNMATCHED')
    matched_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='statement_matches')
    matched_gateway_transaction = models.ForeignKey(PaymentGatewayTransaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='statement_matches')
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-statement_date', '-id']

    def __str__(self):
        return f"{self.statement_date} {self.amount} {self.status}"


class AccountingPeriod(models.Model):
    name = models.CharField(max_length=100, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class ChartOfAccount(models.Model):
    TYPE_CHOICES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    account_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} {self.name}"


class JournalEntry(models.Model):
    entry_date = models.DateField()
    memo = models.CharField(max_length=255, blank=True)
    source_type = models.CharField(max_length=50, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    entry_key = models.CharField(max_length=120, unique=True, null=True, blank=True)
    posted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-entry_date', '-id']

    def __str__(self):
        return f"JE-{self.id} {self.entry_date}"


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"JE-{self.entry_id} {self.account.code} D{self.debit} C{self.credit}"


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


# ==========================================
# STORE / INVENTORY MODULE
# ==========================================

class StoreCategory(models.Model):
    ITEM_TYPE_CHOICES = [('FOOD', 'Food'), ('OFFICE', 'Office/Stationery'), ('COMBINED', 'Combined')]
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default='OFFICE')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Store Categories'


class StoreItem(models.Model):
    ITEM_TYPE_CHOICES = [('FOOD', 'Food'), ('OFFICE', 'Office/Stationery'), ('OTHER', 'Other')]
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, blank=True)
    category = models.ForeignKey(StoreCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    unit = models.CharField(max_length=30, default='pcs')
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default='OFFICE')
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.current_stock <= self.reorder_level

    class Meta:
        ordering = ['name']


class StoreTransaction(models.Model):
    TYPE_CHOICES = [
        ('RECEIPT', 'Stock Receipt'),
        ('ISSUANCE', 'Stock Issuance'),
        ('ADJUSTMENT', 'Adjustment'),
        ('OPENING', 'Opening Stock'),
    ]
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=12, choices=TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    purpose = models.CharField(max_length=255, blank=True)
    performed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            item = self.item
            if self.transaction_type in ('RECEIPT', 'OPENING'):
                item.current_stock += self.quantity
            elif self.transaction_type == 'ISSUANCE':
                item.current_stock = max(item.current_stock - self.quantity, 0)
            elif self.transaction_type == 'ADJUSTMENT':
                item.current_stock = self.quantity
            item.save(update_fields=['current_stock'])

    def __str__(self):
        return f"{self.transaction_type} - {self.item.name} x{self.quantity}"

    class Meta:
        ordering = ['-date', '-created_at']


class StoreOrderRequest(models.Model):
    SEND_TO_CHOICES = [('FINANCE', 'Finance Office'), ('ADMIN', 'Administration'), ('BOTH', 'Finance & Admin')]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FULFILLED', 'Fulfilled'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    requested_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='store_requests')
    send_to = models.CharField(max_length=10, choices=SEND_TO_CHOICES, default='FINANCE')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_store_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

    class Meta:
        ordering = ['-created_at']


class StoreOrderItem(models.Model):
    order = models.ForeignKey(StoreOrderRequest, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(StoreItem, on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=200, blank=True)
    unit = models.CharField(max_length=30, default='pcs')
    quantity_requested = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_approved = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.item_name or (self.item.name if self.item else 'Item')} x{self.quantity_requested}"


# ==========================================
# DISPENSARY MODULE
# ==========================================

class DispensaryVisit(models.Model):
    SEVERITY_CHOICES = [('MINOR', 'Minor'), ('MODERATE', 'Moderate'), ('SERIOUS', 'Serious')]
    student = models.ForeignKey('Student', on_delete=models.CASCADE, related_name='dispensary_visits')
    visit_date = models.DateField()
    visit_time = models.TimeField(null=True, blank=True)
    complaint = models.TextField()
    diagnosis = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    attended_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='MINOR')
    parent_notified = models.BooleanField(default=False)
    referred = models.BooleanField(default=False)
    referred_to = models.CharField(max_length=255, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.visit_date} ({self.severity})"

    class Meta:
        ordering = ['-visit_date', '-created_at']


class DispensaryPrescription(models.Model):
    visit = models.ForeignKey(DispensaryVisit, on_delete=models.CASCADE, related_name='prescriptions')
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    quantity_dispensed = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=30, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} for {self.visit.student}"


class DispensaryStock(models.Model):
    medication_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=30, default='tablets')
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=10)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=200, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_low_stock(self):
        return self.current_quantity <= self.reorder_level

    def __str__(self):
        return self.medication_name

    class Meta:
        ordering = ['medication_name']
        verbose_name_plural = 'Dispensary Stock'
