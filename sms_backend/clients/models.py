from django.db import models
from django.contrib.auth import get_user_model
from django_tenants.models import TenantMixin, DomainMixin

User = get_user_model()

class Tenant(TenantMixin):
    """
    Represents a School (Tenant).
    Resides in the 'public' schema only.
    """
    name = models.CharField(max_length=255)
    # schema_name is automatically inherited from TenantMixin
    
    # --- Subscription Flags ---
    is_active = models.BooleanField(default=True, help_text="Controls if the school can access the system")
    paid_until = models.DateField(null=True, blank=True, help_text="Date until subscription is valid")
    
    # --- Auto Schema Handling ---
    auto_create_schema = True
    auto_drop_schema = False  # SAFETY: Never automatically drop a school's database

    # --- Audit ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Domain(DomainMixin):
    """
    Represents a Domain linked to a School.
    Maps a URL (e.g., myschool.localhost) to a specific Schema.
    """
    # domain and tenant are inherited from DomainMixin
    pass

class GlobalSuperAdmin(models.Model):
    """Global platform owner. Lives in public schema only."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='global_admin')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

