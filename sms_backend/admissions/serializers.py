from rest_framework import serializers

from school.models import AdmissionApplication
from .models import (
    AdmissionApplicationProfile,
    AdmissionAssessment,
    AdmissionDecision,
    AdmissionInquiry,
    AdmissionInterview,
    AdmissionReview,
)


class AdmissionInquirySerializer(serializers.ModelSerializer):
    grade_level_interest_name = serializers.CharField(source="grade_level_interest.display_name", read_only=True)
    preferred_start_name = serializers.CharField(source="preferred_start.name", read_only=True)
    assigned_counselor_name = serializers.CharField(source="assigned_counselor.username", read_only=True)

    class Meta:
        model = AdmissionInquiry
        fields = [
            "id",
            "parent_name",
            "parent_phone",
            "parent_email",
            "child_name",
            "child_dob",
            "child_age",
            "current_school",
            "grade_level_interest",
            "grade_level_interest_name",
            "inquiry_source",
            "inquiry_date",
            "preferred_start",
            "preferred_start_name",
            "status",
            "assigned_counselor",
            "assigned_counselor_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class AdmissionApplicationProfileSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    inquiry_child_name = serializers.CharField(source="inquiry.child_name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    term_name = serializers.CharField(source="term.name", read_only=True)

    class Meta:
        model = AdmissionApplicationProfile
        fields = [
            "id",
            "application",
            "application_number",
            "inquiry",
            "inquiry_child_name",
            "academic_year",
            "academic_year_name",
            "term",
            "term_name",
            "is_shortlisted",
            "shortlisted_at",
            "special_needs",
            "medical_notes",
            "languages",
            "emergency_contact_name",
            "emergency_contact_phone",
            "parent_id_number",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_application(self, value: AdmissionApplication):
        if self.instance and self.instance.application_id == value.id:
            return value
        if AdmissionApplicationProfile.objects.filter(application=value).exists():
            raise serializers.ValidationError("A normalized profile already exists for this application.")
        return value


class AdmissionReviewSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.username", read_only=True)

    class Meta:
        model = AdmissionReview
        fields = [
            "id",
            "application",
            "application_number",
            "reviewer",
            "reviewer_name",
            "academic_score",
            "test_score",
            "interview_score",
            "overall_score",
            "recommendation",
            "comments",
            "reviewed_at",
        ]
        read_only_fields = ["reviewed_at", "reviewer"]


class AdmissionAssessmentSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = AdmissionAssessment
        fields = [
            "id",
            "application",
            "application_number",
            "scheduled_at",
            "venue",
            "score",
            "is_pass",
            "status",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class AdmissionInterviewSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = AdmissionInterview
        fields = [
            "id",
            "application",
            "application_number",
            "interview_date",
            "interview_type",
            "location",
            "panel",
            "status",
            "feedback",
            "score",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class AdmissionDecisionSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    decided_by_name = serializers.CharField(source="decided_by.username", read_only=True)

    class Meta:
        model = AdmissionDecision
        fields = [
            "id",
            "application",
            "application_number",
            "decision",
            "decision_date",
            "decision_notes",
            "offer_deadline",
            "response_status",
            "response_notes",
            "responded_at",
            "decided_by",
            "decided_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["decided_by", "responded_at", "created_at", "updated_at"]
