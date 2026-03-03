# Platform Super Admin Runbook

Operational guide for accessing and operating platform-level (public schema) APIs.

## 1. Bootstrap

From `sms_backend`:

```powershell
python manage.py migrate
python manage.py createsuperuser
```

Alternative for an existing user (grant platform role):

```powershell
python manage.py shell -c "from django.contrib.auth import get_user_model; from clients.models import GlobalSuperAdmin; User=get_user_model(); u=User.objects.get(username='admin'); GlobalSuperAdmin.objects.get_or_create(user=u, defaults={'is_active': True})"
```

## 2. Login (Public Schema)

- Endpoint: `POST /api/auth/login/`
- URL source: `config.public_urls`
- Do not send tenant header for platform login.

Example payload:

```json
{
  "username": "admin",
  "password": "your-password"
}
```

## 3. Access Platform APIs

Use access token from login:

- `Authorization: Bearer <access_token>`

Platform base:

- `/api/platform/`

Key endpoints:

- `/api/platform/tenants/`
- `/api/platform/tenants/{id}/assign-plan/`
- `/api/platform/tenants/{id}/generate-invoice/`
- `/api/platform/tenants/{id}/billing-overview/`
- `/api/platform/tenants/{id}/reset-school-admin/`
- `/api/platform/plans/`
- `/api/platform/subscription-invoices/`
- `/api/platform/subscription-invoices/{id}/record-payment/`
- `/api/platform/analytics/overview/`
- `/api/platform/support-tickets/`
- `/api/platform/impersonation-sessions/`
- `/api/platform/monitoring/snapshots/`
- `/api/platform/monitoring/alerts/`
- `/api/platform/action-logs/`
- `/api/platform/settings/`
- `/api/platform/admin-users/`
- `/api/platform/admin-users/{id}/reset-password/`
- `/api/platform/maintenance/windows/`
- `/api/platform/deployment/releases/`
- `/api/platform/deployment/releases/{id}/trigger-pipeline/`
- `/api/platform/deployment/releases/{id}/hook-runs/`
- `/api/platform/deployment/releases/{id}/run-health-checks/`
- `/api/platform/deployment/releases/callbacks/status/`
- `/api/platform/deployment/feature-flags/`
- `/api/platform/deployment/feature-flags/evaluate/?key=...&tenant_id=...&actor_id=...`
- `/api/platform/backup/jobs/`
- `/api/platform/backup/jobs/{id}/execute-engine/`
- `/api/platform/backup/jobs/{id}/executions/`
- `/api/platform/backup/jobs/{id}/verify-integrity/`
- `/api/platform/backup/jobs/enforce-retention/`
- `/api/platform/backup/jobs/{id}/run-restore-drill/`
- `/api/platform/backup/restores/`
- `/api/platform/backup/restores/{id}/execute/`
- `/api/platform/security/incidents/`
- `/api/platform/security/compliance-reports/`

## 3B. Access Super Admin UI (Browser)

Frontend routes:

- `http://localhost:3000/platform/login`
- `http://localhost:3000/platform`
- `http://localhost:3000/platform/tenants`
- `http://localhost:3000/platform/billing`
- `http://localhost:3000/platform/support`
- `http://localhost:3000/platform/impersonation`
- `http://localhost:3000/platform/monitoring`
- `http://localhost:3000/platform/deployment`
- `http://localhost:3000/platform/backup-recovery`
- `http://localhost:3000/platform/security-compliance`
- `http://localhost:3000/platform/action-logs`
- `http://localhost:3000/platform/settings`
- `http://localhost:3000/platform/admin-users`

Behavior:

- `platform/login` performs role-guard probe against `/api/platform/analytics/overview/`.
- Non-platform sessions are redirected away from `/platform/*`.
- Tenant sessions remain on existing `/dashboard` and `/modules/*` paths.

## 4. Query Platform Action Logs

Endpoint:

- `GET /api/platform/action-logs/`

Supported filters:

- `tenant_id`
- `actor_id`
- `action`
- `model_name`
- `date_from` (`YYYY-MM-DD`)
- `date_to` (`YYYY-MM-DD`)

Example:

`/api/platform/action-logs/?action=RESOLVE&model_name=PlatformSupportTicket&date_from=2026-03-01`

## 5. Notes

- `IsGlobalSuperAdmin` allows:
  - active `GlobalSuperAdmin` users
  - Django `is_superuser=True` users
- Platform APIs are wired through `config.public_urls`, not tenant `config.urls`.
- Deployment callback endpoint uses `X-Platform-Hook-Token` (or bearer token) and is intended for CI/CD systems.
- Callback endpoint follows platform auth guard; use a dedicated platform service account plus callback token.
- Trigger/rollback deployment hooks use:
  - `DEPLOYMENT_TRIGGER_HOOK_URL`
  - `DEPLOYMENT_ROLLBACK_HOOK_URL`
  - `DEPLOYMENT_HOOK_TIMEOUT_SECONDS`
  - `DEPLOYMENT_CALLBACK_TOKEN` (sent in hook headers)
- Maintenance window lifecycle now persists tenant notification fan-out in `PlatformNotificationDispatch`.
- Backup engine orchestration now supports:
  - `BACKUP_ENGINE_MODE=mock` (default safe artifact mode)
  - `BACKUP_ENGINE_MODE=pg_dump` (requires `pg_dump` binary + DB access)
- Backup execution attempts are persisted in `BackupExecutionRun`.

## 6. Continuation Checkpoint (March 3, 2026)

- Super Admin tenant operations are expected to run from:
  - UI host: `http://localhost:3000`
  - API host: `http://localhost:8000` (public schema routes)
- Tenant users operate from tenant host (example):
  - `http://demo.localhost:3000`
- If route mismatch or 404 occurs for newly-added platform endpoint:
  - restart backend process to reload `clients/platform_views.py` route actions.
- Current tenant management capabilities in UI:
  - create tenant, update profile, activate/suspend/resume
  - assign subscription plan
  - generate invoice
  - reset school admin credentials
- Current super-admin user management capabilities:
  - create/grant, role update, activate/deactivate, revoke, reset password
