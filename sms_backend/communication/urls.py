from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MessagesRefView, MessageViewSet

router = DefaultRouter()
router.register(r"messages", MessageViewSet, basename="communication_messages")

urlpatterns = [
    path("ref/messages/", MessagesRefView.as_view(), name="communication_ref_messages"),
    path("", include(router.urls)),
]
