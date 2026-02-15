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
  - Legacy CRUD (soft-delete), same fields as ref + created_at
- GET/POST/PATCH/DELETE /api/hr/employees/
  - New employee directory baseline
- GET/POST/PATCH /api/hr/departments/
  - Department hierarchy baseline
- GET/POST/PATCH /api/hr/positions/
  - Position catalog baseline
- GET/POST /api/hr/attendance/clock-in|clock-out|bulk + summary/report
  - Attendance and time tracking baseline
- GET/POST /api/hr/schedules/
  - Work schedule baseline
- GET/POST /api/hr/documents/ + /expiring/ + /{id}/download/
  - Employee document management baseline
- GET/POST/PATCH/DELETE /api/hr/leave-types/
  - Leave types baseline
- GET/POST/PATCH/DELETE /api/hr/leave-policies/
  - Leave policies baseline
- GET /api/hr/leave-balance/{employee_id}/
  - Leave balance baseline
- GET/POST/PATCH/DELETE /api/hr/leave-requests/ + /approve/ + /reject/ + /cancel/
  - Leave workflow baseline
- GET /api/hr/leave-calendar/
  - Team leave calendar baseline
- GET/POST/PATCH/DELETE /api/hr/salary-structures/
  - Salary structure baseline
- GET/POST/PATCH/DELETE /api/hr/salary-components/
  - Salary component baseline
- GET/POST /api/hr/payrolls/ + /process/ + /{id}/approve/ + /{id}/reprocess/ + /{id}/bank-file/ + /tax-report/
  - Payroll batch processing baseline
- GET /api/hr/payslips/ + /{id}/pdf/ + POST /api/hr/payslips/email/
  - Payslip download and delivery baseline
- GET/POST/PATCH /api/hr/job-postings/ + /{id}/publish/
  - Recruitment job posting baseline
- GET/POST/PATCH /api/hr/applications/ + /{id}/shortlist/ + /{id}/reject/ + /{id}/hire/
  - Applicant tracking baseline
- GET/POST/PATCH /api/hr/interviews/ + /{id}/feedback/
  - Interview scheduling and feedback baseline
- GET /api/hr/onboarding/{employee_id}/ + GET/POST/PATCH /api/hr/onboarding/ + /{id}/complete/
  - Onboarding checklist baseline
- GET/POST/PATCH/DELETE /api/hr/performance-goals/
  - Performance goals baseline
- GET/POST/PATCH/DELETE /api/hr/performance-reviews/ + /{id}/submit/
  - Performance review baseline
- GET/POST/PATCH/DELETE /api/hr/training-programs/
  - Training program baseline
- GET/POST/PATCH/DELETE /api/hr/training-enrollments/
  - Training enrollment baseline
- GET /api/hr/analytics/headcount|turnover|attendance|leave|diversity|payroll-costs/
  - HR analytics expansion baseline

### Pilot Migration Note
HR keeps a compatibility unmanaged wrapper (`Staff` -> `school_staff`) and now also contains native managed HR models.

### Source of Truth (Safe Alias)
Within the codebase, HR models should be imported from `hr.models` (`Employee`, `Department`, `Position`, `AttendanceRecord`, etc.), while `Staff` remains compatibility-only.

## Staff Management

- GET/POST/PATCH/DELETE /api/staff/
  - Staff directory and profile CRUD baseline
- GET /api/staff/search/
  - Staff search by name/ID/email/phone
- GET /api/staff/export/
  - Directory CSV export
- GET /api/staff/{id}/badge/
  - Staff badge download baseline
- GET /api/staff/{id}/profile/
  - Profile aggregate (staff + qualifications + contacts + assignments)
- GET/POST /api/staff/{id}/qualifications/
  - Qualification profile tab
- GET/POST /api/staff/{id}/emergency-contacts/
  - Emergency contact profile tab
- GET/POST /api/staff/{id}/documents/ and /api/staff/{id}/documents/upload/
  - Document profile tab upload/list aliases
- GET/POST/PATCH/DELETE /api/staff/departments/
  - Department structure baseline
- GET/POST/PATCH/DELETE /api/staff/roles/
  - Role catalog baseline
- GET/POST/PATCH/DELETE /api/staff/assignments/
  - Staff-to-department/role assignments baseline
- GET/POST/PATCH /api/staff/attendance/ + /mark/ + /summary/ + /report/ + /export/
  - Attendance operations baseline
- GET/POST/PATCH /api/staff/observations/ + /{id}/submit/
  - Observation workflow baseline
- GET/POST/PATCH /api/staff/appraisals/ + /{id}/approve/
  - Appraisal workflow baseline
- GET /api/staff/{id}/review-history/
  - Combined staff review history baseline
- GET/POST/PATCH/DELETE /api/staff/documents/
  - Document repository baseline
- GET /api/staff/documents/{id}/download/
  - Document download
- POST /api/staff/documents/{id}/verify/
  - Document verification
- GET /api/staff/documents/expiring/
  - Expiry alert feed
- GET /api/staff/analytics/summary|by-department|attendance|performance|compliance/
  - Staff analytics baseline
- GET /api/staff/reports/directory|attendance/
  - Staff report exports baseline

## Assets and Inventory

- GET /api/assets/ref/assets/
  - Placeholder (empty list) until asset models are defined

## Communication

- GET/POST/PATCH/DELETE /api/communication/conversations/
  - Conversation lifecycle (direct/group/broadcast/class/department)
- POST /api/communication/conversations/{id}/participants/
  - Add participant to conversation
- DELETE /api/communication/conversations/{id}/participants/{user_id}/
  - Remove participant (soft remove)
- GET/POST/PATCH/DELETE /api/communication/messages/
  - In-app message stream
- POST /api/communication/messages/{id}/read/
  - Read receipts
- GET /api/communication/messages/unread-count/
  - Unread count
- POST /api/communication/messages/search/
  - Message full-text search
- GET/POST/PATCH/DELETE /api/communication/notifications/
  - Notification center
- PATCH /api/communication/notifications/{id}/read/
  - Mark notification read
- POST /api/communication/notifications/read-all/
  - Bulk mark notifications read
- GET /api/communication/notifications/unread-count/
  - Notification unread count
- GET/PATCH /api/communication/notification-preferences/
  - Per-type channel preferences
- GET/POST/PATCH /api/communication/email-campaigns/
  - Email campaign manager
- POST /api/communication/email-campaigns/{id}/test/
  - Test email
- POST /api/communication/email-campaigns/{id}/send/
  - Send campaign
- GET /api/communication/email-campaigns/{id}/stats/
  - Campaign stats
- GET /api/communication/email-campaigns/{id}/recipients/
  - Recipient-level delivery state
- POST /api/communication/sms/send/
  - SMS/WhatsApp send endpoint
- GET /api/communication/sms/
  - SMS/WhatsApp history
- GET /api/communication/sms/{id}/status/
  - Delivery status lookup
- GET /api/communication/sms/balance/
  - Provider/placeholder balance state
- GET/POST /api/communication/push/devices/
  - Push device registration and listing
- POST /api/communication/push/send/
  - Admin push send
- GET /api/communication/push/
  - Push delivery logs
- GET/POST/PATCH /api/communication/templates/
  - Template library
- POST /api/communication/templates/{id}/preview/
  - Placeholder preview render
- GET/POST/PATCH/DELETE /api/communication/announcements/
  - Announcement manager
- POST /api/communication/announcements/{id}/read/
  - Read tracking
- GET /api/communication/announcements/{id}/stats/
  - Read statistics
- GET /api/communication/analytics/summary|by-channel|delivery-rate|engagement/
  - Delivery and engagement analytics
- POST /api/communication/parent/report-card-notify|fee-reminder|attendance-alert|meeting-invite/
  - Parent communication workflows
- POST /api/communication/webhooks/email|sms/
  - Provider delivery callback endpoints (status reconciliation)

### Provider Placeholder Note
- Communication uses placeholder-safe transports for SMS/WhatsApp when provider keys are missing.
- Email defaults to Django mail backend (console/SMTP based on runtime config).
- See `docs/COMMUNICATION_PROVIDER_SETUP.md` for cutover to live providers.

### Legacy Compatibility
- `communication.models.Message` and `communication.serializers.MessageSerializer` remain as unmanaged compatibility wrappers for existing `school` module references.

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
