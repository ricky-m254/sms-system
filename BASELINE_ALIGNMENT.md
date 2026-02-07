# Phase 0 – Baseline Alignment (Checklist + Guardrails)

## 1. Gap Analysis Checklist (Vision vs Current Code)

1. Multi-tenancy (schema-per-tenant)
- Vision: Strict tenant isolation with global owner layer.
- Current: Implemented with django_tenants, public schema routing, and tenant headers.
- Status: Aligned for tenant isolation.
- Evidence: sms_backend/config/settings.py

2. Global Super Admin (platform owner)
- Vision: Global layer managing tenants with no access to tenant operational data.
- Current: Tenant and Domain models exist, but no explicit global admin model or access boundary.
- Status: Missing.
- Evidence: sms_backend/clients/models.py

3. Tenant Super Admin role
- Vision: Tenant-level system owner with full visibility and admin powers.
- Current: Roles exist (ADMIN, ACCOUNTANT, TEACHER), but no explicit tenant super-admin concept.
- Status: Partially aligned.
- Evidence: sms_backend/school/models.py, sms_backend/school/permissions.py

4. Module independence (separate apps, no cross imports)
- Vision: Each module is a standalone Django app with its own models.
- Current: Students, Finance, HR, Communication, Roles, and Audit all live inside the school app.
- Status: Not aligned.
- Evidence: sms_backend/school/models.py

5. Main dashboard as aggregation-only
- Vision: Main dashboard is summary-only, no CRUD.
- Current: No main dashboard module; there is a SchoolDashboardView in school/views.py but not routed.
- Status: Missing.
- Evidence: sms_backend/school/views.py, sms_backend/school/urls.py

6. Module dashboards
- Vision: Each module has its own dashboard.
- Current: No module dashboard endpoints or summary endpoints.
- Status: Missing.

7. Routing after login (single-module vs multi-module)
- Vision: Module assignment drives routing.
- Current: No module assignment model; no routing layer.
- Status: Missing.

8. Finance isolation (data-only dependencies)
- Vision: Finance should not modify student data.
- Current: Finance uses Student foreign keys in the same app. It does not write to student records, but the models are not separated.
- Status: Partially aligned.
- Evidence: sms_backend/school/models.py, sms_backend/school/services.py

9. Access control enforcement
- Vision: Enforced at API, module, and dashboard layers.
- Current: API-level permissions implemented with custom role checks.
- Status: Aligned at API level.
- Evidence: sms_backend/school/permissions.py, sms_backend/school/views.py

## 2. Compatibility Rules (Non-Breaking Guardrails)

1. Additive only
- No endpoint removal or renames without deprecation period.
- No model deletions in existing tables.

2. Stable API surface
- Existing endpoints remain unchanged.
- New endpoints are introduced for new modules and summaries.

3. Module isolation rules
- New modules must be standalone Django apps.
- No cross-module imports of models; use IDs plus read-only summary endpoints.

4. Tenant safety
- No changes that bypass or weaken django_tenants schema routing.

5. Auth stability
- Keep JWT auth; add new roles and assignments without altering login behavior.

6. Migration safety
- Only forward-safe migrations; no destructive schema changes.
