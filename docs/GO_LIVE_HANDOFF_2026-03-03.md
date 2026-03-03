# Go-Live Handoff (March 3, 2026)

Audience: next backend/frontend/devops team taking over after production hardening work.

## 1. Current Launch Gate Status

As of **March 3, 2026**, the broader backend matrix is green:

```powershell
cd sms_backend
python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput
```

Result:
- `Found 94 test(s)`
- `Ran 94 tests`
- `OK`

Frontend build and backend checks are also green:

```powershell
cd sms_backend
python manage.py check

cd ..\sms_frontend
npm run build
```

## 2. Critical Config Note (Do Not Regress)

`MODULE_FOCUS_LOCK` previously caused broad `403` regressions across Admissions/Communication/Library.

Required baseline:
- `sms_backend/.env`: `MODULE_FOCUS_LOCK=false`
- `sms_backend/.env.example`: `MODULE_FOCUS_LOCK=false`
- `sms_backend/config/settings.py`: default `MODULE_FOCUS_LOCK=False`

Only enable focus lock for temporary, deliberate hardening windows.

## 3. Implemented vs Pending (Platform/Super Admin)

Implemented and wired:
- Platform auth mode and role-guarded platform UI routes.
- Tenant lifecycle APIs (create, update, activate/suspend/resume/archive).
- Subscription plans/invoices/subscription linkage models and endpoints.
- Platform analytics overview endpoints and deep KPI/storage endpoints.
- Support, impersonation, monitoring, action log, deployment, backup/recovery, and security/compliance pages with API wiring.
- Platform settings API/UI (`/api/platform/settings/`, `/platform/settings`).
- Platform admin user/role API/UI (`/api/platform/admin-users/`, `/platform/admin-users`).
- DB-backed platform action logs (`clients.PlatformActionLog`).

Still scaffold-level / pending deep integration:
- Deployment & maintenance:
  - Tenant notification fan-out is now persisted via `PlatformNotificationDispatch` on maintenance/deployment flows.
  - CI/CD trigger integration now has explicit trigger hook execution (`trigger-pipeline`) + persisted run records (`DeploymentHookRun`) + callback endpoint.
  - Automated release health-check execution endpoint is now available; full rollout orchestration automation is still pending.
  - Rollback execution hooks now persist execution attempts (`rollback` creates hook run), but full infra orchestration guarantees remain pending.
  - Runtime feature-flag evaluation endpoint is now available (`/api/platform/deployment/feature-flags/evaluate/`).
- Backup & recovery:
  - Backup engine orchestration endpoint now exists (`execute-engine`) with configurable modes:
    - `mock` safe artifact mode (default)
    - `pg_dump` mode (requires infra/tooling setup)
  - Backup execution runs are now persisted in `BackupExecutionRun`.
  - Retention enforcement execution endpoint is now available; scheduled orchestration is still pending.
  - Integrity verification and restore-drill execution endpoints are now available.
  - Restore orchestration endpoint (`/backup/restores/{id}/execute/`) is now available for approved restores.
  - PITR/WAL flow and geo-redundant DR automation remain pending.

## 4. Mandatory Update Rule for Every PR

For any behavior change, update docs in the same PR:
- API surface: `docs/API_CONTRACTS.md`
- Module contract/ownership: `docs/MODULE_CONTRACTS.md`
- Runtime/project state and risk notes: `sms_frontend/PROJECT_STATUS.md`
- Navigation/read order if new docs are added: `docs/INDEX.md`
- Handoff status/risk for next team: this file

If this file becomes stale, create a dated successor and link it from `docs/INDEX.md`.

## 5. Recommended Next Execution Order

1. Implement deployment hooks and real notification fan-out.
2. Implement backup engine + retention + restore verification.
3. Add integration tests around these production flows.
4. Re-run the full 94-test matrix and frontend production build.

## Frontend Visibility Alignment (added 2026-03-03)

- Frontend module visibility lock removed from hardcoded focus configuration.
- UI now aligns with backend focus unlock (`MODULE_FOCUS_LOCK=false`) by default.
- If needed, UI-level temporary focus can be applied through new env CSV overrides in `sms_frontend/.env.example`.
