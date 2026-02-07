from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView

def ping_view(request):
    """
    Public Health Check.
    Accessible from any origin before tenant isolation.
    """
    return JsonResponse({
        "status": "ok",
        "service": "sms_backend",
        "schema": "public"
    })

urlpatterns = [
    # 1. System Health
    path("api/ping/", ping_view),
    
    # 2. Authentication (Login)
    path("api/auth/login/", TokenObtainPairView.as_view()),
]   