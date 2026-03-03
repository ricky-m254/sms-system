# Production Env Lock Checklist

Use this before any production deployment.

## 1. Backend Env Lock

Reference template:
- `sms_backend/.env.production.example`

Required production posture:
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOW_INSECURE_DEFAULTS=false`
- `DJANGO_SECURE_SSL_REDIRECT=true`
- `DJANGO_SECURE_HSTS_SECONDS=31536000` (or your policy value > 0)
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true`
- `DJANGO_SECURE_HSTS_PRELOAD=true`
- `TENANT_REQUIRE_HEADER=true`
- `TENANT_ENFORCE_HEADER_MATCH=true`
- `TENANT_ENFORCE_HOST_MATCH=true`
- `MODULE_FOCUS_LOCK=false` (unless intentionally locking modules for a temporary window)
- `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK=false`
- `PLATFORM_DEFAULT_BASE_DOMAIN` must be your real domain (not `localhost`/placeholder)

Provider posture:
- Replace all `COMMUNICATION_*` and `FINANCE_*` placeholders with real secrets.
- `FINANCE_PAYMENT_GATEWAY_PROVIDER` must be a real provider key (not `placeholder`/`mock`).
- Keep `COMMUNICATION_WEBHOOK_STRICT_MODE=true`.
- Keep `COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP=true`.
- Keep `FINANCE_WEBHOOK_STRICT_MODE=true`.
- Set `DEPLOYMENT_CALLBACK_TOKEN` to a strong random value and share it only with CI/CD callback sender.
- `BACKUP_ENGINE_MODE` must be a real backend mode (not `mock`).

## 2. Frontend Env Lock

Reference template:
- `sms_frontend/.env.production.example`

Required:
- `VITE_API_BASE_URL` must point to production API origin (HTTPS).
- `VITE_APP_TITLE` set for production brand.

## 3. Validation Commands

Backend:

```powershell
cd sms_backend
python manage.py check
python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput
```

Frontend:

```powershell
cd sms_frontend
npm run build
```

Expected:
- Backend checks pass
- Backend matrix green
- Frontend production build passes

## 4. Secret Hygiene

- Never commit live credentials.
- Rotate any secret that has ever existed in local/shared plaintext.
- Store production secrets in your deployment secret manager, not `.env` in repo.
- Follow the full rotation procedure in `docs/SECRET_ROTATION_AND_STORAGE_RUNBOOK.md`.
