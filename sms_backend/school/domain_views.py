"""
School-Admin Custom Domain Onboarding Views
Endpoints scoped to the authenticated tenant admin.
These read/write to the *public* schema via domain_service.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django_tenants.utils import schema_context

from clients import domain_service
from clients.models import Tenant


def _get_tenant(request) -> Tenant | None:
    """
    Return the Tenant instance for the current request.
    Relies on TenantContextGuardMiddleware having set connection.schema_name.
    """
    from django.db import connection
    schema = connection.schema_name
    if not schema or schema == "public":
        return None
    with schema_context("public"):
        return Tenant.objects.filter(schema_name=schema).first()


class SchoolDomainStatusView(APIView):
    """
    GET  /api/settings/domain/           — current domain request status
    POST /api/settings/domain/request/   — initiate / reset domain request
    POST /api/settings/domain/verify/    — trigger DNS TXT verification
    DELETE /api/settings/domain/         — cancel pending request
    """
    permission_classes = [permissions.IsAuthenticated]

    def _require_admin(self, request):
        role = getattr(getattr(request, "user_profile", None), "role", None)
        if role not in ("ADMIN", "TENANT_SUPER_ADMIN"):
            return Response(
                {"error": "Only school administrators can manage custom domains."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request):
        with schema_context("public"):
            tenant = _get_tenant(request)
            if not tenant:
                return Response({"error": "Tenant not found."}, status=404)
            data = domain_service.get_current_request(tenant)
        return Response(data or {"status": None, "message": "No domain request found."})

    def delete(self, request):
        err = self._require_admin(request)
        if err:
            return err
        with schema_context("public"):
            tenant = _get_tenant(request)
            if not tenant:
                return Response({"error": "Tenant not found."}, status=404)
            from clients.models import CustomDomainRequest
            deleted, _ = CustomDomainRequest.objects.filter(
                tenant=tenant,
                status__in=[
                    CustomDomainRequest.STATUS_PENDING,
                    CustomDomainRequest.STATUS_FAILED,
                ],
            ).delete()
        if deleted:
            return Response({"message": "Domain request cancelled."})
        return Response({"error": "No cancellable request found."}, status=400)


class SchoolDomainRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _require_admin(self, request):
        role_name = ""
        profile = getattr(request, "user_profile", None)
        if profile:
            role_name = getattr(profile, "role", "")
        elif hasattr(request.user, "userprofile"):
            role_name = getattr(request.user.userprofile, "role", "")
        if role_name not in ("ADMIN", "TENANT_SUPER_ADMIN"):
            return Response(
                {"error": "Only school administrators can manage custom domains."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def post(self, request):
        err = self._require_admin(request)
        if err:
            return err

        requested_domain = request.data.get("domain", "").strip()
        if not requested_domain:
            return Response({"error": "A domain name is required."}, status=400)

        with schema_context("public"):
            tenant = _get_tenant(request)
            if not tenant:
                return Response({"error": "Tenant not found."}, status=404)
            try:
                result = domain_service.initiate_domain_request(
                    tenant=tenant,
                    requested_domain=requested_domain,
                    requested_by=request.user.username,
                )
            except ValueError as exc:
                return Response({"error": str(exc)}, status=400)

        return Response(result, status=status.HTTP_201_CREATED)


class SchoolDomainVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        with schema_context("public"):
            tenant = _get_tenant(request)
            if not tenant:
                return Response({"error": "Tenant not found."}, status=404)
            try:
                result = domain_service.verify_domain_request(tenant)
            except ValueError as exc:
                return Response({"error": str(exc)}, status=400)

        verified = result["status"] == "VERIFIED"
        return Response(
            {
                **result,
                "message": (
                    "DNS record verified! Your domain is now pending platform activation."
                    if verified
                    else "DNS TXT record not found yet. Please ensure the record has propagated and try again."
                ),
            },
            status=200 if verified else 202,
        )
