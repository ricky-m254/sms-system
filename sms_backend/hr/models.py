from django.db import models


class Staff(models.Model):
    """
    Unmanaged wrapper for school.Staff (pilot migration).
    """
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50)
    role = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "school_staff"


class Department(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, unique=True)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    head = models.ForeignKey("Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="headed_departments")
    description = models.TextField(blank=True)
    budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Position(models.Model):
    title = models.CharField(max_length=120)
    department = models.ForeignKey("school.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_positions")
    description = models.TextField(blank=True)
    responsibilities = models.TextField(blank=True)
    qualifications = models.TextField(blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    headcount = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class Employee(models.Model):
    GENDER_CHOICES = [("Male", "Male"), ("Female", "Female"), ("Other", "Other")]
    EMPLOYMENT_TYPE_CHOICES = [
        ("Full-time", "Full-time"),
        ("Part-time", "Part-time"),
        ("Contract", "Contract"),
        ("Temporary", "Temporary"),
        ("Intern", "Intern"),
    ]
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("On Leave", "On Leave"),
        ("Suspended", "Suspended"),
        ("Terminated", "Terminated"),
        ("Retired", "Retired"),
    ]
    EXIT_REASON_CHOICES = [
        ("Resignation", "Resignation"),
        ("Termination", "Termination"),
        ("Retirement", "Retirement"),
        ("Contract End", "Contract End"),
    ]
    MARITAL_STATUS_CHOICES = [
        ("Single", "Single"),
        ("Married", "Married"),
        ("Divorced", "Divorced"),
        ("Widowed", "Widowed"),
    ]

    user = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES)
    nationality = models.CharField(max_length=100, blank=True)
    national_id = models.CharField(max_length=100, blank=True)
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUS_CHOICES, default="Single")
    photo = models.ImageField(upload_to="hr/employees/photos/", null=True, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    medical_conditions = models.TextField(blank=True)

    department = models.ForeignKey("school.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_employees")
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default="Full-time")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")
    join_date = models.DateField()
    probation_end = models.DateField(null=True, blank=True)
    confirmation_date = models.DateField(null=True, blank=True)
    contract_start = models.DateField(null=True, blank=True)
    contract_end = models.DateField(null=True, blank=True)
    reporting_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="reportees")
    work_location = models.CharField(max_length=120, blank=True)
    notice_period_days = models.PositiveIntegerField(default=30)
    exit_date = models.DateField(null=True, blank=True)
    exit_reason = models.CharField(max_length=20, choices=EXIT_REASON_CHOICES, blank=True)
    exit_notes = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_id", "first_name", "last_name"]

    def __str__(self):
        return f"{self.employee_id} - {self.first_name} {self.last_name}".strip()


class EmergencyContact(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=120)
    relationship = models.CharField(max_length=60)
    phone_primary = models.CharField(max_length=30)
    phone_alt = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_primary", "name"]

    def __str__(self):
        return f"{self.name} ({self.relationship})"


class EmployeeDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ("Resume", "Resume"),
        ("Certificate", "Certificate"),
        ("License", "License"),
        ("ID", "ID"),
        ("Contract", "Contract"),
        ("Medical", "Medical"),
        ("Other", "Other"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, default="Other")
    file = models.FileField(upload_to="hr/employees/documents/")
    file_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_uploaded_documents",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.employee.employee_id} {self.document_type}"


class WorkSchedule(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name="schedules")
    department = models.ForeignKey("school.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_schedules")
    shift_start = models.TimeField()
    shift_end = models.TimeField()
    working_days = models.JSONField(default=list)
    break_duration = models.PositiveIntegerField(default=60)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ("Present", "Present"),
        ("Absent", "Absent"),
        ("Late", "Late"),
        ("Half-Day", "Half-Day"),
        ("On Leave", "On Leave"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    clock_in = models.TimeField(null=True, blank=True)
    clock_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Present")
    hours_worked = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_attendance_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date", "-id"]


class LeaveType(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=30, unique=True)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    requires_document = models.BooleanField(default=False)
    max_days_year = models.PositiveIntegerField(null=True, blank=True)
    notice_days = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, default="#0EA5E9")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class LeavePolicy(models.Model):
    ACCRUAL_METHOD_CHOICES = [
        ("Annual", "Annual"),
        ("Monthly", "Monthly"),
        ("Per-Payroll", "Per-Payroll"),
    ]
    EMPLOYMENT_TYPE_CHOICES = [
        ("Full-time", "Full-time"),
        ("Part-time", "Part-time"),
        ("Contract", "Contract"),
    ]

    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="policies")
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, blank=True)
    entitlement_days = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    accrual_method = models.CharField(max_length=20, choices=ACCRUAL_METHOD_CHOICES, default="Annual")
    carry_forward_max = models.PositiveIntegerField(default=0)
    effective_from = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["leave_type__name", "employment_type", "-effective_from"]

    def __str__(self):
        return f"{self.leave_type.code} {self.employment_type or 'All'}"


class LeaveBalance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="balances")
    year = models.PositiveIntegerField()
    opening_balance = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    accrued = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    used = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    pending = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    available = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("employee", "leave_type", "year")
        ordering = ["-year", "leave_type__name"]

    def __str__(self):
        return f"{self.employee.employee_id} {self.leave_type.code} {self.year}"


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
        ("Cancelled", "Cancelled"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="requests")
    start_date = models.DateField()
    end_date = models.DateField()
    days_requested = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    reason = models.TextField(blank=True)
    supporting_doc = models.FileField(upload_to="hr/leave/supporting_docs/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    current_approver = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leave_pending_approvals",
    )
    approved_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leave_approved_requests",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-submitted_at", "-id"]

    def __str__(self):
        return f"{self.employee.employee_id} {self.leave_type.code} {self.start_date}"


class SalaryStructure(models.Model):
    PAY_FREQUENCY_CHOICES = [
        ("Monthly", "Monthly"),
        ("Bi-weekly", "Bi-weekly"),
        ("Weekly", "Weekly"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_structures")
    basic_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="USD")
    pay_frequency = models.CharField(max_length=20, choices=PAY_FREQUENCY_CHOICES, default="Monthly")
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_from", "-id"]

    def __str__(self):
        return f"{self.employee.employee_id} {self.basic_salary}"


class SalaryComponent(models.Model):
    COMPONENT_TYPE_CHOICES = [("Allowance", "Allowance"), ("Deduction", "Deduction")]
    AMOUNT_TYPE_CHOICES = [("Fixed", "Fixed"), ("Percentage", "Percentage")]

    structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name="components")
    component_type = models.CharField(max_length=20, choices=COMPONENT_TYPE_CHOICES, default="Allowance")
    name = models.CharField(max_length=120)
    amount_type = models.CharField(max_length=20, choices=AMOUNT_TYPE_CHOICES, default="Fixed")
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    is_taxable = models.BooleanField(default=True)
    is_statutory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.name} ({self.component_type})"


class PayrollBatch(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Processing", "Processing"),
        ("Approved", "Approved"),
        ("Paid", "Paid"),
        ("Closed", "Closed"),
    ]

    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_net = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    processed_by = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_payroll_processed")
    approved_by = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_payroll_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("month", "year")
        ordering = ["-year", "-month", "-id"]

    def __str__(self):
        return f"{self.month}/{self.year} {self.status}"


class PayrollItem(models.Model):
    payroll = models.ForeignKey(PayrollBatch, on_delete=models.CASCADE, related_name="items")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payroll_items")
    basic_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_allowances = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    gross_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    days_worked = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    overtime_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    pdf_file = models.FileField(upload_to="hr/payroll/payslips/", null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("payroll", "employee")
        ordering = ["employee__employee_id", "id"]

    def __str__(self):
        return f"{self.payroll_id} {self.employee.employee_id}"


class JobPosting(models.Model):
    EMPLOYMENT_TYPE_CHOICES = [
        ("Full-time", "Full-time"),
        ("Part-time", "Part-time"),
        ("Contract", "Contract"),
    ]
    STATUS_CHOICES = [("Draft", "Draft"), ("Open", "Open"), ("Closed", "Closed")]

    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True, related_name="job_postings")
    department = models.ForeignKey("school.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_job_postings")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    responsibilities = models.TextField(blank=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default="Full-time")
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    posted_by = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_job_postings")
    posted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ("New", "New"),
        ("Screening", "Screening"),
        ("Shortlisted", "Shortlisted"),
        ("Interview", "Interview"),
        ("Offer", "Offer"),
        ("Rejected", "Rejected"),
        ("Hired", "Hired"),
    ]

    job_posting = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name="applications")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    resume = models.FileField(upload_to="hr/recruitment/resumes/", null=True, blank=True)
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="New")
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-applied_at", "-id"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.job_posting.title}"


class Interview(models.Model):
    INTERVIEW_TYPE_CHOICES = [("Phone", "Phone"), ("Video", "Video"), ("In-person", "In-person")]
    STATUS_CHOICES = [("Scheduled", "Scheduled"), ("Completed", "Completed"), ("Cancelled", "Cancelled"), ("No-show", "No-show")]

    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name="interviews")
    interview_date = models.DateTimeField()
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPE_CHOICES, default="In-person")
    location = models.CharField(max_length=255, blank=True)
    interviewers = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Scheduled")
    feedback = models.TextField(blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_by = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_interviews")
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-interview_date", "-id"]


class OnboardingTask(models.Model):
    STATUS_CHOICES = [("Pending", "Pending"), ("In Progress", "In Progress"), ("Completed", "Completed")]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="onboarding_tasks")
    task = models.CharField(max_length=255)
    assigned_to = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hr_onboarding_tasks")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "due_date", "id"]

    def __str__(self):
        return f"{self.employee.employee_id} - {self.task}"


class PerformanceGoal(models.Model):
    STATUS_CHOICES = [
        ("Not Started", "Not Started"),
        ("In Progress", "In Progress"),
        ("Achieved", "Achieved"),
        ("Not Achieved", "Not Achieved"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="performance_goals")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Not Started")
    weight = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class PerformanceReview(models.Model):
    STATUS_CHOICES = [("Draft", "Draft"), ("Submitted", "Submitted"), ("Acknowledged", "Acknowledged")]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="performance_reviews")
    reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews_given")
    review_period = models.CharField(max_length=50)
    overall_rating = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    strengths = models.TextField(blank=True)
    areas_improvement = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class TrainingProgram(models.Model):
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    trainer = models.CharField(max_length=120, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    capacity = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date", "-id"]


class TrainingEnrollment(models.Model):
    STATUS_CHOICES = [("Enrolled", "Enrolled"), ("Attended", "Attended"), ("Completed", "Completed"), ("Cancelled", "Cancelled")]

    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE, related_name="enrollments")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="training_enrollments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Enrolled")
    completion_date = models.DateField(null=True, blank=True)
    certificate = models.FileField(upload_to="hr/training/certificates/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("program", "employee")
        ordering = ["-created_at", "-id"]


class StaffTransfer(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    TRANSFER_TYPE_CHOICES = [
        ('Internal', 'Internal (Same School)'),
        ('External', 'External (Different School/County)'),
    ]

    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='transfers')
    transfer_type = models.CharField(max_length=20, choices=TRANSFER_TYPE_CHOICES, default='Internal')
    from_department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_out')
    from_position = models.CharField(max_length=150, blank=True)
    to_department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_in')
    to_position = models.CharField(max_length=150, blank=True)
    destination_school = models.CharField(max_length=255, blank=True, help_text="For External transfers")
    reason = models.TextField(blank=True)
    effective_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    handover_completed = models.BooleanField(default=False)
    clearance_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    requested_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_transfers_requested')
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_transfers_approved')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee} ({self.transfer_type}) – {self.status}"
