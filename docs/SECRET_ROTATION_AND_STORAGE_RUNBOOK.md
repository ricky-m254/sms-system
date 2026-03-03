# Secret Rotation and Secure Storage Runbook

Use this runbook to complete Step 2 before production launch.

## 1. Scope

Rotate and securely store:
- Django app secret (`DJANGO_SECRET_KEY`)
- Database credentials (`POSTGRES_*`)
- Communication webhook secrets/tokens (`COMMUNICATION_*`)
- Finance webhook/gateway secrets (`FINANCE_*`)

## 2. Baseline Rules

- Never store production secrets in committed `.env` files.
- Store secrets in deployment secret manager (for example: cloud secret store, vault, CI protected variables).
- Rotate any secret previously shared in plaintext chat, screenshots, or local files.

## 3. Rotation Order (Recommended)

1. Generate new `DJANGO_SECRET_KEY`.
2. Rotate DB password and update DB user grants.
3. Rotate communication webhook token/shared secret.
4. Rotate finance webhook token/shared secret and gateway API key.
5. Restart app with updated runtime secret source.

## 4. Runtime Guards Already Added

In strict production mode (`DJANGO_DEBUG=false`, `DJANGO_ALLOW_INSECURE_DEFAULTS=false`), backend startup now blocks known placeholder/weak values for:
- `DJANGO_SECRET_KEY`
- `POSTGRES_PASSWORD`
- `COMMUNICATION_WEBHOOK_SHARED_SECRET`
- `FINANCE_WEBHOOK_SHARED_SECRET`

This helps prevent accidental production boot with template defaults.

## 5. Verification Commands

```powershell
cd sms_backend
python manage.py check
```

If secrets are weak/placeholders in strict production mode, startup will fail fast with `ImproperlyConfigured`.

Then run:

```powershell
python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput
```

## 6. Post-Rotation Hygiene

- Revoke old tokens/keys at provider side.
- Confirm webhook senders are updated to new token/signature secrets.
- Record rotation date, owner, and next rotation due date in ops tracker.
