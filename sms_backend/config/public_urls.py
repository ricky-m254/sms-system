from django.urls import include, path, re_path
from django.http import JsonResponse, FileResponse, HttpResponse
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def ping_view(request):
    """Public health check. Accessible from any origin before tenant isolation."""
    return JsonResponse({"status": "ok", "service": "sms_backend", "schema": "public"})


def tenant_info_view(request):
    """
    Return basic info about the currently resolved tenant.
    Works via subdomain (Host header) or X-Tenant-ID header.
    Used by the frontend to auto-detect school context on login page.
    """
    from django_tenants.utils import get_public_schema_name
    tenant = getattr(request, "tenant", None)
    public_schema = get_public_schema_name()
    schema = getattr(tenant, "schema_name", None)

    if not tenant or schema in {None, public_schema}:
        return JsonResponse(
            {"error": "No tenant found for this hostname.", "code": "TENANT_NOT_FOUND"},
            status=404,
        )

    status = getattr(tenant, "status", "")
    if status in {"SUSPENDED"}:
        return JsonResponse(
            {
                "error": "This school account is suspended.",
                "code": "TENANT_SUSPENDED",
                "tenant_name": tenant.name,
                "schema_name": schema,
            },
            status=403,
        )
    if status in {"CANCELLED", "ARCHIVED"}:
        return JsonResponse(
            {
                "error": "This school account is no longer active.",
                "code": "TENANT_INACTIVE",
                "tenant_name": tenant.name,
                "schema_name": schema,
            },
            status=403,
        )

    return JsonResponse(
        {
            "schema_name": schema,
            "tenant_name": tenant.name,
            "status": status,
            "subdomain": getattr(tenant, "subdomain", None),
            "contact_email": getattr(tenant, "contact_email", ""),
        }
    )


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

    # 3. Tenant Info (subdomain/header auto-detection for login page)
    path("api/tenant/info/", tenant_info_view),

    # 4. Platform (Super Tenant) APIs
    path("api/platform/", include("clients.platform_urls")),

    # 5. Catch-all: serve the React SPA for any remaining public-schema route
    re_path(r"^(?!api/|admin/|static/|media/).*$", _serve_react_app),
]
