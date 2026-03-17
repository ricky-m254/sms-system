from django.urls import include, path, re_path
from django.http import JsonResponse, FileResponse, HttpResponse
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def ping_view(request):
    """Public health check. Accessible from any origin before tenant isolation."""
    return JsonResponse({"status": "ok", "service": "sms_backend", "schema": "public"})


def _serve_react_app(request, path=""):
    """Serve the React SPA for all non-API public routes."""
    index_path = settings.BASE_DIR / "frontend_build" / "index.html"
    if index_path.exists():
        return FileResponse(open(index_path, "rb"), content_type="text/html")
    return HttpResponse(
        b"<h1>SMS Platform</h1><p>App is starting up...</p>",
        content_type="text/html",
    )


urlpatterns = [
    # 1. System Health
    path("api/ping/", ping_view),
    path("api/ping", ping_view),
    path("health/", ping_view),
    path("health", ping_view),

    # 2. Authentication (Login + Refresh)
    path("api/auth/login/", TokenObtainPairView.as_view()),
    path("api/auth/refresh/", TokenRefreshView.as_view()),

    # 3. Platform (Super Tenant) APIs
    path("api/platform/", include("clients.platform_urls")),

    # 4. Catch-all: serve the React SPA for any remaining public-schema route
    re_path(r"^(?!api/|admin/|static/|media/).*$", _serve_react_app),
]
