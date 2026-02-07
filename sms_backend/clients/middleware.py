from django_tenants.middleware import TenantMainMiddleware
from django.http import HttpResponse

from sms_backend.clients.models import Tenant

class TenantHeaderMiddleware(TenantMainMiddleware):
    """
    Allows selecting tenant via Header (X-Tenant-ID)
    if Subdomain resolution fails.
    """
    def process_request(self, request):
        # 1. Check Header first (Frontend way)
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            # Force tenant by ID (You need to map ID to Schema in logic, 
            # but for this specific architecture, we usually use subdomain)
            # FOR SIMPLICITY in this debug:
            # We will pass the SCHEMA NAME in the header, not ID.
            request.tenant = Tenant.objects.get(schema_name=tenant_id)
            return super().process_request(request)
        
        # 2. Fallback to Subdomain (Browser/Admin way)
        return super().process_request(request)