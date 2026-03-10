from rest_framework import serializers
from school.models import Department as SchoolDepartment
from .models import (
    Staff,
    Department,
    Position,
    Employee,
    EmergencyContact,
    EmployeeDocument,
    AttendanceRecord,
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


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            "id", "first_name", "last_name", "employee_id",
            "role", "phone", "is_active", "created_at"
        ]
        read_only_fields = ["created_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolDepartment
        fields = [
            "id",
            "name",
            "description",
            "head",
            "head_name",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at", "head_name"]

    def get_head_name(self, obj):
        if not obj.head:
            return ""
        return f"{obj.head.first_name} {obj.head.last_name}".strip()


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "title",
            "department",
            "department_name",
            "description",
            "responsibilities",
            "qualifications",
            "experience_years",
            "salary_min",
            "salary_max",
            "headcount",
            "is_active",
        ]
        read_only_fields = ["department_name"]


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    reporting_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "employee_id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "gender",
            "nationality",
            "national_id",
            "marital_status",
            "photo",
            "blood_group",
            "medical_conditions",
            "department",
            "department_name",
            "position",
            "position_title",
            "employment_type",
            "status",
            "join_date",
            "probation_end",
            "confirmation_date",
            "contract_start",
            "contract_end",
            "reporting_to",
            "reporting_to_name",
            "work_location",
            "notice_period_days",
            "exit_date",
            "exit_reason",
            "exit_notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["employee_id", "full_name", "department_name", "position_title", "reporting_to_name", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return " ".join(part for part in [obj.first_name, obj.middle_name, obj.last_name] if part).strip()

    def get_reporting_to_name(self, obj):
        if not obj.reporting_to:
            return ""
        return f"{obj.reporting_to.first_name} {obj.reporting_to.last_name}".strip()


class EmergencyContactSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "employee",
            "employee_name",
            "name",
            "relationship",
            "phone_primary",
            "phone_alt",
            "address",
            "is_primary",
            "is_active",
        ]
        read_only_fields = ["employee_name"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = [
            "id",
            "employee",
            "employee_name",
            "document_type",
            "file",
            "file_name",
            "description",
            "issue_date",
            "expiry_date",
            "uploaded_by",
            "uploaded_by_name",
            "uploaded_at",
            "is_active",
        ]
        read_only_fields = ["employee_name", "uploaded_by_name", "uploaded_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "employee",
            "employee_name",
            "date",
            "clock_in",
            "clock_out",
            "status",
            "hours_worked",
            "overtime_hours",
            "notes",
            "recorded_by",
            "recorded_by_name",
            "created_at",
            "is_active",
        ]
        read_only_fields = ["employee_name", "recorded_by_name", "created_at", "hours_worked", "overtime_hours"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class WorkScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = WorkSchedule
        fields = [
            "id",
            "employee",
            "employee_name",
            "department",
            "department_name",
            "shift_start",
            "shift_end",
            "working_days",
            "break_duration",
            "effective_from",
            "effective_to",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["employee_name", "department_name", "created_at"]

    def get_employee_name(self, obj):
        if not obj.employee:
            return ""
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            "id",
            "name",
            "code",
            "is_paid",
            "requires_approval",
            "requires_document",
            "max_days_year",
            "notice_days",
            "color",
            "is_active",
        ]


class LeavePolicySerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)

    class Meta:
        model = LeavePolicy
        fields = [
            "id",
            "leave_type",
            "leave_type_name",
            "employment_type",
            "entitlement_days",
            "accrual_method",
            "carry_forward_max",
            "effective_from",
            "is_active",
        ]
        read_only_fields = ["leave_type_name"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "year",
            "opening_balance",
            "accrued",
            "used",
            "pending",
            "available",
            "updated_at",
        ]
        read_only_fields = ["employee_name", "leave_type_name", "updated_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    current_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "days_requested",
            "reason",
            "supporting_doc",
            "status",
            "current_approver",
            "current_approver_name",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "rejection_reason",
            "submitted_at",
            "is_active",
        ]
        read_only_fields = [
            "employee_name",
            "leave_type_name",
            "current_approver_name",
            "approved_by_name",
            "approved_at",
            "submitted_at",
        ]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return ""
        return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()

    def get_current_approver_name(self, obj):
        if not obj.current_approver:
            return ""
        return f"{obj.current_approver.first_name} {obj.current_approver.last_name}".strip()


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = [
            "id",
            "structure",
            "component_type",
            "name",
            "amount_type",
            "amount",
            "is_taxable",
            "is_statutory",
            "is_active",
        ]


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    components = SalaryComponentSerializer(many=True, read_only=True)

    class Meta:
        model = SalaryStructure
        fields = [
            "id",
            "employee",
            "employee_name",
            "basic_salary",
            "currency",
            "pay_frequency",
            "effective_from",
            "effective_to",
            "is_active",
            "created_at",
            "components",
        ]
        read_only_fields = ["employee_name", "created_at", "components"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class PayrollItemSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_id_str = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    pay_frequency = serializers.SerializerMethodField()
    components = serializers.SerializerMethodField()
    payroll_month = serializers.IntegerField(source="payroll.month", read_only=True)
    payroll_year = serializers.IntegerField(source="payroll.year", read_only=True)
    payroll_payment_date = serializers.DateField(source="payroll.payment_date", read_only=True)

    class Meta:
        model = PayrollItem
        fields = [
            "id",
            "payroll",
            "payroll_month",
            "payroll_year",
            "payroll_payment_date",
            "employee",
            "employee_name",
            "employee_id_str",
            "department_name",
            "position_name",
            "currency",
            "pay_frequency",
            "basic_salary",
            "total_allowances",
            "total_deductions",
            "gross_salary",
            "net_salary",
            "days_worked",
            "overtime_hours",
            "components",
            "pdf_file",
            "sent_at",
            "is_active",
        ]
        read_only_fields = [
            "employee_name",
            "employee_id_str",
            "department_name",
            "position_name",
            "currency",
            "pay_frequency",
            "basic_salary",
            "total_allowances",
            "total_deductions",
            "gross_salary",
            "net_salary",
            "days_worked",
            "overtime_hours",
            "components",
            "payroll_month",
            "payroll_year",
            "payroll_payment_date",
            "pdf_file",
            "sent_at",
        ]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()

    def get_employee_id_str(self, obj):
        return obj.employee.employee_id

    def get_department_name(self, obj):
        if obj.employee.department:
            return obj.employee.department.name
        return ""

    def get_position_name(self, obj):
        if obj.employee.position:
            return obj.employee.position.title
        return ""

    def get_currency(self, obj):
        structure = obj.employee.salary_structures.filter(is_active=True).order_by("-effective_from").first()
        return structure.currency if structure else "KES"

    def get_pay_frequency(self, obj):
        structure = obj.employee.salary_structures.filter(is_active=True).order_by("-effective_from").first()
        return structure.pay_frequency if structure else "Monthly"

    def get_components(self, obj):
        structure = obj.employee.salary_structures.filter(is_active=True).order_by("-effective_from").first()
        if not structure:
            return []
        return [
            {
                "name": c.name,
                "component_type": c.component_type,
                "amount_type": c.amount_type,
                "amount": float(c.amount if c.amount_type == "Fixed" else c.amount * float(obj.basic_salary) / 100),
                "is_taxable": c.is_taxable,
            }
            for c in structure.components.filter(is_active=True)
        ]


class PayrollBatchSerializer(serializers.ModelSerializer):
    items = PayrollItemSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollBatch
        fields = [
            "id",
            "month",
            "year",
            "status",
            "total_gross",
            "total_deductions",
            "total_net",
            "processed_by",
            "approved_by",
            "approved_at",
            "payment_date",
            "created_at",
            "is_active",
            "items",
        ]
        read_only_fields = [
            "total_gross",
            "total_deductions",
            "total_net",
            "processed_by",
            "approved_by",
            "approved_at",
            "created_at",
            "items",
        ]


class JobPostingSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    posted_by_name = serializers.CharField(source="posted_by.username", read_only=True)

    class Meta:
        model = JobPosting
        fields = [
            "id",
            "position",
            "position_title",
            "department",
            "department_name",
            "title",
            "description",
            "requirements",
            "responsibilities",
            "employment_type",
            "salary_min",
            "salary_max",
            "deadline",
            "status",
            "posted_by",
            "posted_by_name",
            "posted_at",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["position_title", "department_name", "posted_by", "posted_by_name", "posted_at", "created_at"]


class JobApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(source="job_posting.title", read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job_posting",
            "job_title",
            "first_name",
            "last_name",
            "applicant_name",
            "email",
            "phone",
            "resume",
            "cover_letter",
            "status",
            "rating",
            "notes",
            "applied_at",
            "is_active",
        ]
        read_only_fields = ["job_title", "applicant_name", "applied_at"]

    def get_applicant_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class InterviewSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(source="application.job_posting.title", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Interview
        fields = [
            "id",
            "application",
            "applicant_name",
            "job_title",
            "interview_date",
            "interview_type",
            "location",
            "interviewers",
            "status",
            "feedback",
            "score",
            "created_by",
            "created_by_name",
            "created_at",
            "is_active",
        ]
        read_only_fields = ["applicant_name", "job_title", "created_by", "created_by_name", "created_at"]

    def get_applicant_name(self, obj):
        return f"{obj.application.first_name} {obj.application.last_name}".strip()


class OnboardingTaskSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source="assigned_to.username", read_only=True)

    class Meta:
        model = OnboardingTask
        fields = [
            "id",
            "employee",
            "employee_name",
            "task",
            "assigned_to",
            "assigned_to_name",
            "due_date",
            "status",
            "completed_at",
            "notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["employee_name", "assigned_to_name", "completed_at", "created_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class PerformanceGoalSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceGoal
        fields = [
            "id",
            "employee",
            "employee_name",
            "title",
            "description",
            "target_date",
            "status",
            "weight",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["employee_name", "created_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = [
            "id",
            "employee",
            "employee_name",
            "reviewer",
            "reviewer_name",
            "review_period",
            "overall_rating",
            "strengths",
            "areas_improvement",
            "status",
            "reviewed_at",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["employee_name", "reviewer_name", "reviewed_at", "created_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()

    def get_reviewer_name(self, obj):
        if not obj.reviewer:
            return ""
        return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()


class TrainingProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingProgram
        fields = [
            "id",
            "title",
            "description",
            "trainer",
            "start_date",
            "end_date",
            "capacity",
            "cost",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class TrainingEnrollmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    program_title = serializers.CharField(source="program.title", read_only=True)

    class Meta:
        model = TrainingEnrollment
        fields = [
            "id",
            "program",
            "program_title",
            "employee",
            "employee_name",
            "status",
            "completion_date",
            "certificate",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["employee_name", "program_title", "created_at"]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()
