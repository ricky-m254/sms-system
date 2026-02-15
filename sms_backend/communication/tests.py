from django.contrib.auth import get_user_model
from django.test import override_settings
from django.test import TestCase
from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory, force_authenticate

from clients.models import Domain, Tenant
from school.models import Module, Role, UserProfile
from school.models import UserModuleAssignment

from .views import (
    CommunicationAnalyticsSummaryView,
    CommunicationMessageViewSet,
    ConversationViewSet,
    EmailCampaignViewSet,
    NotificationViewSet,
    PushDeviceViewSet,
    PushSendView,
    SmsWebhookView,
    SmsSendView,
)

User = get_user_model()


class TenantTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        with schema_context("public"):
            cls.tenant = Tenant.objects.create(
                schema_name="communication_test",
                name="Communication Test School",
                paid_until="2030-01-01",
            )
            Domain.objects.create(domain="communication.localhost", tenant=cls.tenant, is_primary=True)

    def setUp(self):
        self.ctx = schema_context(self.tenant.schema_name)
        self.ctx.__enter__()

    def tearDown(self):
        self.ctx.__exit__(None, None, None)


class CommunicationModuleTests(TenantTestBase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username="comm_admin", password="pass1234", email="admin@school.local")
        self.user2 = User.objects.create_user(username="teacher1", password="pass1234", email="teacher@school.local")
        role = Role.objects.create(name="ADMIN", description="School Administrator")
        UserProfile.objects.create(user=self.user, role=role)
        module = Module.objects.create(key="COMMUNICATION", name="Communication")
        UserModuleAssignment.objects.create(user=self.user2, module=module, is_active=True)

    @override_settings(COMMUNICATION_WEBHOOK_TOKEN="test-webhook-token")
    def test_communication_core_flow(self):
        create_conversation = self.factory.post(
            "/api/communication/conversations/",
            {"conversation_type": "Direct", "title": "DM"},
            format="json",
        )
        force_authenticate(create_conversation, user=self.user)
        conversation_response = ConversationViewSet.as_view({"post": "create"})(create_conversation)
        self.assertEqual(conversation_response.status_code, 201)
        conversation_id = conversation_response.data["id"]

        add_participant = self.factory.post(
            f"/api/communication/conversations/{conversation_id}/participants/",
            {"user": self.user2.id, "role": "Member"},
            format="json",
        )
        force_authenticate(add_participant, user=self.user)
        add_participant_response = ConversationViewSet.as_view({"post": "add_participant"})(add_participant, pk=conversation_id)
        self.assertEqual(add_participant_response.status_code, 200)

        create_message = self.factory.post(
            "/api/communication/messages/",
            {"conversation": conversation_id, "content": "Hello"},
            format="json",
        )
        force_authenticate(create_message, user=self.user)
        message_response = CommunicationMessageViewSet.as_view({"post": "create"})(create_message)
        self.assertEqual(message_response.status_code, 201)
        message_id = message_response.data["id"]

        mark_read = self.factory.post(f"/api/communication/messages/{message_id}/read/", {}, format="json")
        force_authenticate(mark_read, user=self.user)
        read_response = CommunicationMessageViewSet.as_view({"post": "mark_read"})(mark_read, pk=message_id)
        self.assertEqual(read_response.status_code, 200)

        create_notification = self.factory.post(
            "/api/communication/notifications/",
            {"recipient": self.user2.id, "notification_type": "System", "title": "Alert", "message": "Test"},
            format="json",
        )
        force_authenticate(create_notification, user=self.user)
        notification_response = NotificationViewSet.as_view({"post": "create"})(create_notification)
        self.assertEqual(notification_response.status_code, 201)

        create_campaign = self.factory.post(
            "/api/communication/email-campaigns/",
            {"title": "Notice", "subject": "Subject", "body_text": "Body"},
            format="json",
        )
        force_authenticate(create_campaign, user=self.user)
        campaign_response = EmailCampaignViewSet.as_view({"post": "create"})(create_campaign)
        self.assertEqual(campaign_response.status_code, 201)
        campaign_id = campaign_response.data["id"]

        send_campaign = self.factory.post(
            f"/api/communication/email-campaigns/{campaign_id}/send/",
            {"emails": ["parent@school.local"]},
            format="json",
        )
        force_authenticate(send_campaign, user=self.user)
        send_campaign_response = EmailCampaignViewSet.as_view({"post": "send"})(send_campaign, pk=campaign_id)
        self.assertEqual(send_campaign_response.status_code, 200)

        send_sms = self.factory.post(
            "/api/communication/sms/send/",
            {"phones": ["+1555010001"], "message": "Hello parents", "channel": "SMS"},
            format="json",
        )
        force_authenticate(send_sms, user=self.user)
        sms_response = SmsSendView.as_view()(send_sms)
        self.assertEqual(sms_response.status_code, 201)

        analytics = self.factory.get("/api/communication/analytics/summary/")
        force_authenticate(analytics, user=self.user)
        analytics_response = CommunicationAnalyticsSummaryView.as_view()(analytics)
        self.assertEqual(analytics_response.status_code, 200)
        self.assertGreaterEqual(analytics_response.data["total_messages"], 1)

    @override_settings(COMMUNICATION_WEBHOOK_TOKEN="test-webhook-token")
    def test_message_edit_guard_and_sms_webhook_and_push(self):
        create_conversation = self.factory.post(
            "/api/communication/conversations/",
            {"conversation_type": "Direct", "title": "DM2"},
            format="json",
        )
        force_authenticate(create_conversation, user=self.user)
        conversation_response = ConversationViewSet.as_view({"post": "create"})(create_conversation)
        self.assertEqual(conversation_response.status_code, 201)
        conversation_id = conversation_response.data["id"]

        add_participant = self.factory.post(
            f"/api/communication/conversations/{conversation_id}/participants/",
            {"user": self.user2.id, "role": "Member"},
            format="json",
        )
        force_authenticate(add_participant, user=self.user)
        add_participant_response = ConversationViewSet.as_view({"post": "add_participant"})(add_participant, pk=conversation_id)
        self.assertEqual(add_participant_response.status_code, 200)

        create_message = self.factory.post(
            "/api/communication/messages/",
            {"conversation": conversation_id, "content": "Guard test"},
            format="json",
        )
        force_authenticate(create_message, user=self.user)
        message_response = CommunicationMessageViewSet.as_view({"post": "create"})(create_message)
        self.assertEqual(message_response.status_code, 201)
        message_id = message_response.data["id"]

        update_by_other = self.factory.patch(
            f"/api/communication/messages/{message_id}/",
            {"content": "Edited by other"},
            format="json",
        )
        force_authenticate(update_by_other, user=self.user2)
        update_response = CommunicationMessageViewSet.as_view({"patch": "partial_update"})(update_by_other, pk=message_id)
        self.assertEqual(update_response.status_code, 403)

        send_sms = self.factory.post(
            "/api/communication/sms/send/",
            {"phones": ["+1555010002"], "message": "Webhook test", "channel": "SMS"},
            format="json",
        )
        force_authenticate(send_sms, user=self.user)
        sms_response = SmsSendView.as_view()(send_sms)
        self.assertEqual(sms_response.status_code, 201)
        provider_id = sms_response.data[0]["provider_id"]

        sms_webhook = self.factory.post(
            "/api/communication/webhooks/sms/",
            {"provider_id": provider_id, "status": "Delivered"},
            format="json",
            HTTP_X_WEBHOOK_TOKEN="test-webhook-token",
        )
        webhook_response = SmsWebhookView.as_view()(sms_webhook)
        self.assertEqual(webhook_response.status_code, 200)

        register_device = self.factory.post(
            "/api/communication/push/devices/",
            {"token": "token-abc-123", "platform": "Web"},
            format="json",
        )
        force_authenticate(register_device, user=self.user2)
        register_response = PushDeviceViewSet.as_view({"post": "create"})(register_device)
        self.assertEqual(register_response.status_code, 201)

        push_send = self.factory.post(
            "/api/communication/push/send/",
            {"users": [self.user2.id], "title": "Push", "body": "Hello"},
            format="json",
        )
        force_authenticate(push_send, user=self.user)
        push_response = PushSendView.as_view()(push_send)
        self.assertEqual(push_response.status_code, 201)

        invalid_sms_webhook = self.factory.post(
            "/api/communication/webhooks/sms/",
            {"provider_id": provider_id, "status": "Delivered"},
            format="json",
            HTTP_X_WEBHOOK_TOKEN="wrong-token",
        )
        invalid_response = SmsWebhookView.as_view()(invalid_sms_webhook)
        self.assertEqual(invalid_response.status_code, 403)
