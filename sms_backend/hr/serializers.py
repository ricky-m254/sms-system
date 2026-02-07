from rest_framework import serializers
from .models import Staff


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            "id", "first_name", "last_name", "employee_id",
            "role", "phone", "is_active", "created_at"
        ]
        read_only_fields = ["created_at"]
