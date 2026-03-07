from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_public_schema_name

from clients.models import Tenant


class HealthCheckMiddleware:
    """
    Intercepts health-probe paths BEFORE TenantMainMiddleware runs so the
    deployment health check always gets HTTP 200 — even when no tenant domains
    are registered for the current host yet.

    Also intercepts the root path "/" so the React SPA is served immediately
    without going through tenant resolution.
    """

    PROBE_PATHS = {"/health", "/health/", "/api/ping", "/api/ping/"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path in self.PROBE_PATHS:
            return JsonResponse({"status": "ok"})
        if request.path in ("/", ""):
            return self._serve_index(request)
        return self.get_response(request)

    @staticmethod
    def _serve_index(request):
        from django.conf import settings
        from django.http import FileResponse, HttpResponse
        index_path = settings.BASE_DIR / "frontend_build" / "index.html"
        if index_path.exists():
            return FileResponse(open(index_path, "rb"), content_type="text/html")
        return HttpResponse(
            b"<h1>SMS Platform</h1><p>App is starting up...</p>",
            content_type="text/html",
        )


def _host_without_port(raw_host: str) -> str:
    return (raw_host or "").split(":")[0].strip().lower()


class TenantContextGuardMiddleware:
    """
    Validates tenant context integrity for API requests after TenantMainMiddleware:
    - Optional required tenant header on tenant API routes.
    - Header/schema mismatch rejection to prevent cross-tenant confusion.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        guard_response = self.process_request(request)
        if guard_response is not None:
            return guard_response
        return self.get_response(request)

    def process_request(self, request):
        """
        Backward-compatible hook for tests/legacy code that still calls process_request directly.
        Returns JsonResponse on guard violation, otherwise None.
        """
        api_prefix = getattr(settings, "TENANT_GUARD_API_PREFIX", "/api/")
        if not request.path.startswith(api_prefix):
            return None

        tenant = getattr(request, "tenant", None)
        tenant_schema = getattr(tenant, "schema_name", None)
        public_schema = get_public_schema_name()
        header_name = getattr(settings, "TENANT_HEADER_NAME", "X-Tenant-ID")
        header_value = (request.headers.get(header_name) or "").strip()
        host = _host_without_port(request.get_host())
        is_local_dev_host = host in {"localhost", "127.0.0.1"}

        # Header-first resolution for local/dev and audit paths:
        # if a tenant header is provided while request resolved to public schema,
        # switch the active tenant context explicitly.
        if header_value and (not hasattr(request, "tenant") or tenant_schema in {None, public_schema}):
            try:
                resolved_tenant = Tenant.objects.get(schema_name=header_value)
            except Tenant.DoesNotExist:
                return JsonResponse(
                    {
                        "detail": f"Unknown tenant schema in header '{header_name}'.",
                        "header_schema": header_value,
                    },
                    status=400,
                )
            request.tenant = resolved_tenant
            # Ensure DB connection uses the resolved tenant schema for downstream ORM usage.
            connection.set_tenant(resolved_tenant)
            # Keep routing aligned with tenant context when host resolved to public schema.
            # Without this, Django can still use public URL patterns and return 404 for tenant APIs.
            request.urlconf = settings.ROOT_URLCONF

        tenant = getattr(request, "tenant", None)
        tenant_schema = getattr(tenant, "schema_name", None)
        is_public_request = not tenant_schema or tenant_schema == public_schema
        if is_public_request:
            return None

        if getattr(settings, "TENANT_REQUIRE_HEADER", False) and not header_value:
            return JsonResponse(
                {
                    "detail": (
                        f"Missing tenant header '{header_name}' for tenant API request."
                    ),
                    "expected_schema": tenant_schema,
                },
                status=400,
            )

        if (
            header_value
            and getattr(settings, "TENANT_ENFORCE_HEADER_MATCH", True)
            and header_value != tenant_schema
        ):
            return JsonResponse(
                {
                    "detail": "Tenant header does not match resolved tenant context.",
                    "header_schema": header_value,
                    "resolved_schema": tenant_schema,
                    "host": request.get_host(),
                },
                status=400,
            )

        if getattr(settings, "TENANT_ENFORCE_HOST_MATCH", True):
            tenant_domains = {
                domain.lower()
                for domain in tenant.domains.values_list("domain", flat=True)
                if domain
            }
            if getattr(settings, "DEBUG", False) and is_local_dev_host:
                return None
            if tenant_domains and host and host not in tenant_domains:
                return JsonResponse(
                    {
                        "detail": "Request host does not match resolved tenant domain.",
                        "host": host,
                        "resolved_schema": tenant_schema,
                        "expected_domains": sorted(tenant_domains),
                    },
                    status=400,
                )

        return None


# Backward compatibility for existing imports/tests.
TenantHeaderMiddleware = TenantContextGuardMiddleware
