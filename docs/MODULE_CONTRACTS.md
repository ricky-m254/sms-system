# Module Contracts (Read-Only Reference Endpoints)

This document defines the read-only reference contracts exposed by module apps.
These endpoints are used for safe cross-module access without sharing model logic.

## Academics

- GET /api/academics/ref/academic-years/
  - id, name, start_date, end_date, is_active

- GET /api/academics/ref/terms/
  - id, name, start_date, end_date, academic_year_id, is_active

- GET /api/academics/ref/classes/
  - id, name, stream, academic_year_id, is_active

### Pilot Migration Note
Academics is now using unmanaged wrapper models in `academics/models.py`
that map to existing `school_*` tables. This is a safe, non-breaking
first step toward moving the module.

### Source of Truth (Safe Alias)
Within the codebase, AcademicYear, Term, and SchoolClass should be imported
from `academics.models` going forward.

## Human Resources

- GET /api/hr/ref/staff/
  - id, employee_id, first_name, last_name, role, phone, is_active
- GET /api/hr/staff/
  - CRUD (soft-delete), same fields as ref + created_at

### Pilot Migration Note
HR uses an unmanaged wrapper model in `hr/models.py` mapped to `school_staff`.

### Source of Truth (Safe Alias)
Within the codebase, Staff should be imported from `hr.models`.

## Assets and Inventory

- GET /api/assets/ref/assets/
  - Placeholder (empty list) until asset models are defined

## Communication

- GET /api/communication/ref/messages/
  - id, recipient_type, recipient_id, subject, sent_at, status
- GET /api/communication/messages/
  - CRUD (read/write), includes body, sent_at, status

### Pilot Migration Note
Communication uses an unmanaged wrapper model in `communication/models.py` mapped to `school_message`.

### Source of Truth (Safe Alias)
Within the codebase, Message should be imported from `communication.models`.

## Reporting and Analytics

- GET /api/reporting/ref/audit-logs/
  - id, timestamp, action, model_name, object_id, user_id
- GET /api/reporting/audit-logs/
  - Read-only listing with details

### Pilot Migration Note
Reporting uses an unmanaged wrapper model in `reporting/models.py` mapped to `school_auditlog`.

### Source of Truth (Safe Alias)
Within the codebase, AuditLog should be imported from `reporting.models`.

## Notes

- All endpoints are read-only.
- Access is enforced by module assignment via HasModuleAccess.
- These contracts will be updated when module models move out of `school`.
