from django.contrib import admin
from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["recipient_type", "subject", "sent_at", "status"]
    list_filter = ["status", "recipient_type"]
    readonly_fields = ["sent_at"]
