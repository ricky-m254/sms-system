from rest_framework import serializers
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


class StaffMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffMember
        fields = [
            "id",
            "user",
            "staff_id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "photo",
            "date_of_birth",
            "gender",
            "nationality",
            "phone_primary",
            "phone_alternate",
            "email_personal",
            "email_work",
            "address_current",
            "address_permanent",
            "staff_type",
            "employment_type",
            "status",
            "join_date",
            "exit_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["staff_id", "full_name", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return " ".join(part for part in [obj.first_name, obj.middle_name, obj.last_name] if part).strip()


class StaffQualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffQualification
        fields = "__all__"


class StaffEmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffEmergencyContact
        fields = "__all__"


class StaffDepartmentSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffDepartment
        fields = [
            "id",
            "name",
            "code",
            "department_type",
            "parent",
            "parent_name",
            "head",
            "head_name",
            "description",
            "is_active",
        ]
        read_only_fields = ["parent_name", "head_name"]

    def get_head_name(self, obj):
        if not obj.head:
            return ""
        return f"{obj.head.first_name} {obj.head.last_name}".strip()


class StaffRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffRole
        fields = "__all__"


class StaffAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = StaffAssignment
        fields = [
            "id",
            "staff",
            "staff_name",
            "department",
            "department_name",
            "role",
            "role_name",
            "is_primary",
            "effective_from",
            "effective_to",
            "is_active",
        ]
        read_only_fields = ["staff_name", "department_name", "role_name"]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffAttendance
        fields = "__all__"
        read_only_fields = ["staff_name", "marked_by", "created_at"]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()


class StaffObservationSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    observer_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffObservation
        fields = "__all__"
        read_only_fields = ["staff_name", "observer_name", "created_at"]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()

    def get_observer_name(self, obj):
        if not obj.observer:
            return ""
        return f"{obj.observer.first_name} {obj.observer.last_name}".strip()


class StaffAppraisalSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    appraiser_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffAppraisal
        fields = "__all__"
        read_only_fields = ["staff_name", "appraiser_name", "created_at"]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()

    def get_appraiser_name(self, obj):
        if not obj.appraiser:
            return ""
        return f"{obj.appraiser.first_name} {obj.appraiser.last_name}".strip()


class StaffDocumentSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)
    verified_by_name = serializers.CharField(source="verified_by.username", read_only=True)

    class Meta:
        model = StaffDocument
        fields = "__all__"
        read_only_fields = ["staff_name", "uploaded_by_name", "verified_by_name", "uploaded_at"]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()
