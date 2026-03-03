# Next Dev Team Master Handoff

Date: 2026-03-03  
Audience: Incoming engineering team (backend, frontend, QA, DevOps)  
Scope: Consolidated handoff for production-hardening continuation and operational ownership

## 1. Current System Position

- Multi-tenant Django/DRF backend is operational with schema isolation (`django-tenants`).
- React/TypeScript frontend is operational with tenant-scoped API headers.
- Presentation finalization items 1-5 are executed and documented.
- Screenshot evidence pack is complete and validator returns `STATUS: PASS`.
- Consolidated backend gate matrix currently runs green: `94/94 OK`.

Primary status source:
- `sms_frontend/PROJECT_STATUS.md`

## 2. Non-Negotiable Invariants

Enforce these in every change:

1. Tenant isolation is absolute.
2. Authentication before authorization.
3. Authorization layers: role -> module -> object-level.
4. Academic backbone order must be enforced:
   - School Profile -> Academic Year -> Terms -> Grades -> Classes -> Subjects -> Staff -> Assignments -> Fees -> Enrollment
5. Student is the source-of-truth entity for cross-module references.
6. Finance integrity:
   - invoice immutability
   - oldest-first allocation
   - closed-period mutation denial
   - approval trail for reversals/adjustments/write-offs

Core architecture references:
- `ARCHITECTURE.md`
- `MODULE_BOUNDARIES.md`
- `SYSTEM_RULES.md`
- `BASELINE_ALIGNMENT.md`

## 3. Repository Orientation

- Backend root: `sms_backend/`
- Frontend root: `sms_frontend/`
- Consolidated docs: `docs/`

Read order for new contributors:

1. `docs/INDEX.md`
2. `docs/NEXT_TEAM_PLAYBOOK.md`
3. `docs/NEXT_DEV_TEAM_MASTER_HANDOFF.md` (this file)
4. `ARCHITECTURE.md`
5. `MODULE_BOUNDARIES.md`
6. `sms_frontend/PROJECT_STATUS.md`

## 4. Environment and Local Runbook

### 4.1 Tenant-aligned defaults

- Tenant schema: `demo_school`
- Tenant domain: `demo.localhost`
- Local frontend default: `http://127.0.0.1:3000`
- Local backend: `http://demo.localhost:8000` (preferred for tenant-domain behavior)

### 4.2 Backend run

From `sms_backend/`:

```powershell
python manage.py runserver 0.0.0.0:8000
```

### 4.3 Frontend run

From `sms_frontend/`:

```powershell
$env:VITE_API_BASE_URL="http://demo.localhost:8000"
npm run dev -- --host 127.0.0.1 --port 3000
```

### 4.4 Build and migration hygiene

Backend:

```powershell
python manage.py makemigrations --check --dry-run
```

Frontend:

```powershell
npm run build
```

### 4.5 Demo roles used for presentation evidence (demo tenant)

- `demo_admin / Demo123!` (TENANT_SUPER_ADMIN)
- `demo_teacher / Demo123!` (TEACHER)
- `demo_accountant / Demo123!` (ACCOUNTANT)
- `demo_parent / Demo123!` (PARENT)

Use only for local/demo context. Rotate/replace in real deployment contexts.

## 5. Validation and Evidence Pack

### 5.1 Backend consolidated gate command

From `sms_backend/`:

```powershell
python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput
```

Expected result:
- `Found 94 test(s)`
- `Ran 94 tests`
- `OK`

Critical config guard:
- Keep `MODULE_FOCUS_LOCK=false` unless intentionally running a temporary focused hardening window.
- Enabling focus lock blocks non-listed modules and will fail the consolidated matrix.

### 5.2 Presentation screenshot evidence validation

```powershell
powershell -ExecutionPolicy Bypass -File docs/validate_presentation_evidence.ps1
```

Expected result:
- `Missing files: 0`
- `STATUS: PASS`

Evidence files:
- `docs/PRESENTATION_DEMO_RUNBOOK.md`
- `docs/PRESENTATION_CHECKLIST_EXECUTION.md`
- `docs/PRESENTATION_SCREENSHOT_MANIFEST.md`
- `docs/RELEASE_EVIDENCE_BUNDLE.md`
- `docs/presentation_evidence/screenshots/`

Automation helper used to generate screenshot pack:
- `sms_frontend/scripts/capture_presentation_screenshots.mjs`

## 6. Recently Completed Hardening (High Value)

1. Env-first production config hardening in backend settings.
2. Migration state-only wrappers for unmanaged app migrations.
3. Expanded UAT fail-closure coverage and architecture audit coverage.
4. Closed-period denial enforcement in finance payment flow.
5. Middleware import fix for tenant middleware compatibility.
6. Release-gate evidence bundle and presentation evidence closure.
7. Frontend Playwright tooling added for repeatable screenshot evidence generation.

## 7. Known Risks Still Open

1. Penetration testing depth
- Automated tests enforce many invariants, but dedicated security penetration testing is still recommended before strict production certification.

2. Documentation drift risk
- `PROJECT_STATUS.md` is extensive and can drift quickly if not updated per PR.

3. Broad dirty worktree context
- Repository may contain unrelated local changes; review diffs carefully before release commits.

## 8. Mandatory PR Discipline (No Exceptions)

Every PR that affects behavior must include:

1. Code change
2. Test update/addition
3. Docs update

Minimum doc updates per change type:

- API contract changes -> `docs/API_CONTRACTS.md`
- Module boundary/ownership changes -> `docs/MODULE_CONTRACTS.md` and `MODULE_BOUNDARIES.md`
- Execution state/risk changes -> `sms_frontend/PROJECT_STATUS.md`
- New/renamed docs -> `docs/INDEX.md`

## 9. First Week Execution Plan for New Team

Day 1:

1. Re-run build/test/hygiene gates.
2. Re-run screenshot evidence validator.
3. Confirm no tenant cross-read/write on local environment using existing UAT tests.

Day 2-3:

1. Prioritize unresolved production-readiness risks (security and operational runbooks).
2. Fill any missing API contracts discovered during QA replay.

Day 4-5:

1. Stabilize CI-equivalent command set from local gate commands.
2. Prepare release checklist signoff with explicit pass/fail evidence attachments.

## 10. Quick Command Sheet

Backend tests:

```powershell
cd sms_backend
python manage.py test --keepdb --noinput
```

Targeted UAT/audit:

```powershell
cd sms_backend
python manage.py test school.test_uat_fail_closure school.test_architecture_audit school.test_production_readiness_gate --keepdb --noinput
```

Frontend build:

```powershell
cd sms_frontend
npm run build
```

Presentation evidence validator:

```powershell
cd ..
powershell -ExecutionPolicy Bypass -File docs/validate_presentation_evidence.ps1
```

Regenerate screenshot evidence pack:

```powershell
cd sms_frontend
$env:API_BASE_URL="http://demo.localhost:8000"
$env:FRONTEND_BASE_URL="http://127.0.0.1:3000"
node scripts/capture_presentation_screenshots.mjs
```

## 11. Handoff Exit Criteria

Incoming team can claim takeover readiness only when:

1. Local env boots for both frontend/backend with tenant context.
2. Consolidated test matrix is green.
3. Migration check is clean.
4. Presentation evidence validator is `STATUS: PASS`.
5. Team has read and acknowledged system invariants and module boundaries.

## 2026-03-03 Frontend Module Visibility Hotfix

- Root cause: `sms_frontend/src/config/moduleFocus.ts` was hardcoded to a narrowed set (`finance`, `students`, `academics`, `settings`), which hid operational modules in UI.
- Resolution: switched to full-default module coverage with optional env override CSVs.
- New optional env keys in `sms_frontend/.env.example`:
  - `VITE_ENABLED_BACKEND_MODULE_KEYS`
  - `VITE_ENABLED_ROUTE_KEYS`
  - `VITE_ENABLED_SETTINGS_KEYS`
- Operational guidance: keep these unset for go-live unless there is an explicit temporary module freeze window.
