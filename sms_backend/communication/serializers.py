from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id", "recipient_type", "recipient_id",
            "subject", "body", "sent_at", "status"
        ]
        read_only_fields = ["sent_at", "status"]
