# Admissions Module Readiness (Standalone Target)

Date: 2026-02-14

## Current Baseline
- Admissions now has a standalone module shell (`admissions` app) and is exposed via `/api/admissions/*`.
- Core domain model is still sourced from `school` (`AdmissionApplication`, `AdmissionDocument`) during transition.
- Frontend standalone admissions shell is available at `/modules/admissions/*`.
- Legacy Students entry `/modules/students/admissions` now redirects to the standalone applications page.
- Core flows working today:
- Application create/list/update.
- Document upload/delete on application.
- Enroll application into student record.
- Pipeline summary counts.

## What Is Already Implemented
- Backend model layer:
- `school.AdmissionApplication`.
- `school.AdmissionDocument`.
- Backend endpoints:
- `GET/POST /api/admissions/applications/`.
- `PATCH /api/admissions/applications/{id}/`.
- `POST /api/admissions/applications/{id}/enroll/`.
- `POST /api/admissions/applications/{id}/documents/`.
- `DELETE /api/admissions/applications/{id}/documents/{doc_id}/`.
- `GET /api/admissions/summary/`.
- Frontend page:
- `sms_frontend/src/pages/students/StudentsAdmissionsPage.tsx`.

## Partial Implementation
- Pipeline status model exists, but not yet aligned to the full standalone module stages and review objects.
- Inquiry details are captured indirectly in application fields, not in a dedicated Inquiry workflow.
- Decision data exists on the application object, but not as a full committee/reviewer workflow.

## Missing for Standalone Admissions Module
- Dedicated backend domain models inside `admissions` app (currently wrapped around `school` models).
- Dedicated frontend module (`/modules/admissions/*`) and module dashboard entry.
- Dedicated module key + assignment seed (`ADMISSIONS`) for RBAC.
- Full submodules from spec:
- Inquiry Management.
- Application Review (scoring/shortlisting objects).
- Assessment & Testing.
- Interview Scheduling.
- Admission Decisions (offer/waitlist flows and artifacts).
- Enrollment Processing workflow entities.
- Analytics beyond basic pipeline counts.

## Phase B Status Update
- Implemented in standalone `admissions` app:
  - `AdmissionInquiry` model
  - `AdmissionApplicationProfile` model
- Added endpoints:
  - `GET/POST /api/admissions/inquiries/`
  - `GET/PATCH/DELETE /api/admissions/inquiries/{id}/`
  - `POST /api/admissions/inquiries/{id}/convert/`
  - `POST /api/admissions/inquiries/{id}/mark-lost/`
  - `GET/POST /api/admissions/application-profiles/`
  - `GET/PATCH/DELETE /api/admissions/application-profiles/{id}/`
  - `GET/POST /api/admissions/reviews/`
  - `GET/PATCH/DELETE /api/admissions/reviews/{id}/`
  - `POST /api/admissions/applications/{id}/shortlist/`
  - `GET /api/admissions/shortlisted/`
  - `GET/POST /api/admissions/assessments/`
  - `GET/PATCH/DELETE /api/admissions/assessments/{id}/`
  - `GET/POST /api/admissions/interviews/`
  - `GET/PATCH/DELETE /api/admissions/interviews/{id}/`
  - `POST /api/admissions/interviews/{id}/feedback/`
  - `GET/POST /api/admissions/decisions/`
  - `GET/PATCH/DELETE /api/admissions/decisions/{id}/`
  - `POST /api/admissions/decisions/{id}/respond/`
  - `POST /api/admissions/applications/{id}/enrollment-check/`
  - `POST /api/admissions/applications/{id}/enrollment-complete/`
  - `GET /api/admissions/enrollment/ready/`
  - `GET /api/admissions/analytics/funnel/`
  - `GET /api/admissions/analytics/sources/`
- Compatibility retained:
  - Existing `/api/admissions/applications/*` endpoints are unchanged and still operational.

## Key Risks and Gaps
- Coupling risk: admissions logic is currently mixed with student management in `school`.
- Migration risk: permissions changed to `ADMISSIONS`; users with only `STUDENTS` access need module assignment updates.
- Migration risk: splitting models/endpoints later may break existing UI/API consumers without a compatibility plan.
- Test risk: admissions-specific automated tests are currently limited or absent.

## Recommended Transition Plan
1. Introduce `ADMISSIONS` module key and assignable permissions while keeping current endpoints active.
2. Create new backend `admissions` app with equivalent endpoints and internal forwarding adapters.
3. Add `/modules/admissions/*` frontend routes and keep Students admissions page as a temporary alias.
4. Move submodule-by-submodule (Inquiry, Review, Assessment, Interview, Decisions, Enrollment, Analytics).
5. Add deprecation timeline and cutover checklist for old endpoints.

## Immediate Execution Order (Next Team)
1. Phase A: Module boundary + RBAC split (`ADMISSIONS` key, routing, guards).
2. Phase B: Inquiry + Application split and normalized data model.
3. Phase C: Review, Assessment, Interview workflows.
4. Phase D: Decisioning + Enrollment conversion hardening.
5. Phase E: Analytics/reporting + regression tests + final cutover.

## Operational Commands
1. Ensure tenant schema is migrated:
- `python manage.py migrate_schemas --schema=<tenant_schema>`
2. Seed module keys in tenant schema:
- `python manage.py seed_modules --schema=<tenant_schema>`
3. Backfill access for users currently assigned to Students:
- Preview: `python manage.py backfill_admissions_module_access --schema=<tenant_schema> --dry-run`
- Apply: `python manage.py backfill_admissions_module_access --schema=<tenant_schema>`
4. Explicitly assign module access to selected users or all active users:
- Selected users (Admissions only): `python manage.py assign_module_access --schema=<tenant_schema> --usernames=admin,teacher1 --dry-run`
- All active users (Admissions only): `python manage.py assign_module_access --schema=<tenant_schema> --all-active-users`
- All active users (Admissions + Students): `python manage.py assign_module_access --schema=<tenant_schema> --all-active-users --include-students`
