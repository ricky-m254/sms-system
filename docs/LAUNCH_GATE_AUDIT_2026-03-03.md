# Launch Gate Audit - 2026-03-03

Scope:
- Final `.env` audit against `docs/PRODUCTION_ENV_LOCK_CHECKLIST.md`
- Backend/Frontend launch-gate execution
- GitHub secret-hygiene readiness

## 1. Launch-Gate Command Results

Backend checks:
- `python manage.py check` -> PASS

Backend matrix:
- `python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput` -> PASS
- Tests run: 102

Frontend build:
- `npm run build` -> PASS

Strict production-mode probe:
- Command forced `DJANGO_DEBUG=false` and `DJANGO_ALLOW_INSECURE_DEFAULTS=false`
- Result -> FAIL (expected with current local `.env`)
- Failure: missing required `PLATFORM_DEFAULT_BASE_DOMAIN`

## 2. Current Runtime `.env` Audit (sms_backend/.env)

Current file is development posture, not production posture.

Failing items for production:
- `DJANGO_DEBUG=true` (must be `false`)
- `DJANGO_ALLOW_INSECURE_DEFAULTS=true` (must be `false`)
- `DJANGO_SECURE_SSL_REDIRECT=false` (must be `true`)
- `TENANT_REQUIRE_HEADER=false` (must be `true`)
- `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK=true` (must be `false`)
- `PLATFORM_DEFAULT_BASE_DOMAIN` missing
- `DJANGO_SECURE_HSTS_SECONDS` missing (must be > 0 in strict mode)
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` missing (expected `true`)
- `DJANGO_SECURE_HSTS_PRELOAD` missing (expected `true`)
- `FINANCE_PAYMENT_GATEWAY_PROVIDER=placeholder` (must be real provider)
- `BACKUP_ENGINE_MODE` missing (strict mode blocks mock/placeholder posture)
- `COMMUNICATION_WEBHOOK_SHARED_SECRET` empty
- `FINANCE_WEBHOOK_SHARED_SECRET` empty
- `DEPLOYMENT_CALLBACK_TOKEN` missing
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` are HTTP local URLs (strict mode requires HTTPS production origins)

Sensitive local value observed:
- `POSTGRES_PASSWORD` is set to a plaintext real-looking password in local `.env`.

## 3. Current Runtime `.env` Audit (sms_frontend/.env)

Current file:
- `VITE_API_BASE_URL=http://localhost:8000`
- `VITE_APP_TITLE=SMS`

Production readiness:
- `VITE_API_BASE_URL` must be updated to HTTPS production API URL.

## 4. GitHub Deployment Safety Audit

Secret tracking status:
- Tracked env files: only `sms_backend/.env.example`, `sms_frontend/.env.example`
- Local `.env` files are ignored by root `.gitignore` (`.env`, `.env.*`, except `!.env.example`)

Conclusion:
- Repository is structurally safe to push if you do not add real secrets to tracked files.
- Rotate any secrets that were pasted into chat or shared in plaintext.

## 5. Go/No-Go

Status:
- Code quality gate: GO
- Production env lock gate: NO-GO until env values are switched to strict production values
- GitHub push readiness (without live secrets): GO

## 6. Required Actions Before Live Deployment

1. Create production env from `sms_backend/.env.production.example` and set all real values.
2. Ensure `DJANGO_DEBUG=false` and `DJANGO_ALLOW_INSECURE_DEFAULTS=false`.
3. Set real HTTPS origins for CORS/CSRF.
4. Set real provider credentials and webhook shared secrets.
5. Set `PLATFORM_DEFAULT_BASE_DOMAIN` to your real domain.
6. Set strict HSTS values (`DJANGO_SECURE_HSTS_SECONDS`, include subdomains, preload).
7. Set `VITE_API_BASE_URL` to production HTTPS API endpoint.
8. Re-run:
   - `python manage.py check`
   - Backend matrix command above
   - `npm run build`

