from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from school.permissions import HasModuleAccess
from school.permissions import IsSchoolAdmin, IsTeacher
from .models import Message
from .serializers import MessageSerializer
from .events import message_created, message_sent


class MessagesRefView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "COMMUNICATION"

    def get(self, request):
        data = Message.objects.values(
            "id", "recipient_type", "recipient_id", "subject", "sent_at", "status"
        ).order_by("-sent_at")
        return Response(list(data), status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsSchoolAdmin | IsTeacher, HasModuleAccess]
    module_key = "COMMUNICATION"

    def perform_create(self, serializer):
        message = serializer.save()
        message_created.send(
            sender=MessageViewSet,
            message_id=message.id,
            recipient_type=message.recipient_type,
            recipient_id=message.recipient_id
        )
        message_sent.send(
            sender=MessageViewSet,
            message_id=message.id,
            recipient_type=message.recipient_type,
            recipient_id=message.recipient_id
        )
