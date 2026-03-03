# Library + Student Administration Integration

Date: 2026-03-03

## What was implemented

1. Library member tracking is now linked to student administration records.
- `library.LibraryMember` now has a one-to-one `student` link.
- When a student is created or enrolled, backend now auto upserts a library member record:
  - `member_id`: `LIB-STU-<student_id>`
  - `member_type`: `Student`
  - `status`: `Active`
  - `is_active`: `true`
- Library member sync endpoint (`POST /api/library/members/sync/`) now also binds each synced member to `student`.

2. Admission number generation is now configurable at tenant school profile level.
- Added `SchoolProfile` fields:
  - `admission_number_mode`: `AUTO` or `MANUAL`
  - `admission_number_prefix`: string prefix (default `ADM-`)
  - `admission_number_padding`: numeric width for auto sequence (default `4`)
- Behavior:
  - `AUTO`: if admission number not provided, backend generates next value like `ADM-0001`.
  - `MANUAL`: admission number is required and must be provided by user.

3. A writable school profile settings API is now available.
- Endpoint: `PATCH /api/school/profile/`
- Access: tenant admin roles only (`ADMIN`, `TENANT_SUPER_ADMIN`)
- Supports updating admission-number settings and existing profile fields.

## Affected backend files

- `sms_backend/library/models.py`
- `sms_backend/library/serializers.py`
- `sms_backend/library/views.py`
- `sms_backend/library/migrations/0003_librarymember_student.py`
- `sms_backend/school/models.py`
- `sms_backend/school/serializers.py`
- `sms_backend/school/views.py`
- `sms_backend/school/migrations/0028_schoolprofile_admission_number_settings.py`

## Tests added/updated

- `sms_backend/school/tests.py`
  - `AdmissionNumberAndLibrarySyncTests`
- `sms_backend/library/tests.py`
  - `test_member_sync_and_notification_on_reservation_ready` now asserts student-link sync

## Operational notes

- Run migrations before using this:
  - `python manage.py migrate_schemas --shared`
  - `python manage.py migrate_schemas --tenant`
- Existing tenants can run library member sync for backfill:
  - `POST /api/library/members/sync/` (admin only)

