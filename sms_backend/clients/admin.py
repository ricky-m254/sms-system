from django.contrib import admin
from .models import Tenant, Domain, GlobalSuperAdmin

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'schema_name', 'is_active', 'paid_until']
    search_fields = ['name', 'schema_name']

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
    search_fields = ['domain']

@admin.register(GlobalSuperAdmin)
class GlobalSuperAdminAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_active', 'created_at']
    search_fields = ['user__username', 'user__email']
