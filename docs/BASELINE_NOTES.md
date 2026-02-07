# Baseline Notes (Evidence Snapshot)

This file records the current code baseline for Phase 0 alignment.

## Multi-Tenancy
- django_tenants configured with schema-per-tenant routing.
- Public schema URL routing is enabled.
- Evidence: sms_backend/config/settings.py

## Public Auth + Health
- Public health: /api/ping/
- Public login: /api/auth/login/
- Evidence: sms_backend/config/public_urls.py

## Tenant API Routes (Base)
- Tenant routes are mounted under /api/ in the tenant schema.
- Evidence: sms_backend/config/urls.py

## Tenant Endpoints (Router)
- /students/
- /enrollments/
- /staff/
- /messages/
- /modules/
- /modules/mine/
- /module-assignments/
- /module-assignments/mine/
- /module-assignments/bulk_assign/
- /finance/terms/
- /finance/fees/
- /finance/invoices/
- /finance/payments/
- /finance/expenses/
- /finance/summary/
- /finance/ref/students/
- /finance/ref/enrollments/
- /dashboard/routing/
- /dashboard/summary/
- /students/summary/
- /academics/summary/
- /hr/summary/
- /communication/summary/
- /core/summary/
- /reporting/summary/
- Evidence: sms_backend/school/urls.py

## Role-Based Permissions
- Custom role permissions are implemented for ADMIN, ACCOUNTANT, TEACHER.
- Evidence: sms_backend/school/permissions.py

## Finance Rules
- Invoice total is calculated from line items in FinanceService.
- Payment allocation validates available balance and invoice balance.
- Evidence: sms_backend/school/services.py

## Module Monolith Note
- Students, Academics, Finance, HR, Communication, and Roles currently live in the school app.
- Evidence: sms_backend/school/models.py
