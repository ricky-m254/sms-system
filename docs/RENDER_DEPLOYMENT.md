# Render Deployment (Presentation Ready)

This project can be deployed on Render using the repo-level `render.yaml`.

## 1) Pre-check

- Backend root: `sms_backend`
- Frontend root: `sms_frontend`
- Multi-tenant mode is enabled via `django-tenants`.

## 2) Create Blueprint on Render

1. Open Render Dashboard -> `New` -> `Blueprint`.
2. Connect this GitHub repo.
3. Select branch: `main`.
4. Render reads `render.yaml` and creates:
   - `sms-backend` (web service)
   - `sms-frontend` (static site)
   - `sms-postgres` (managed DB)

## 3) Set required backend env vars (Render dashboard)

Set these on `sms-backend`:

- `DJANGO_SECRET_KEY` (strong random value)
- `DJANGO_ALLOWED_HOSTS`:
  - `sms-backend.onrender.com` (plus any custom domain)
- `CORS_ALLOWED_ORIGINS`:
  - `https://sms-frontend.onrender.com` (plus custom frontend domain if used)
- `CSRF_TRUSTED_ORIGINS`:
  - `https://sms-frontend.onrender.com`
  - `https://sms-backend.onrender.com`
- `PLATFORM_DEFAULT_BASE_DOMAIN`:
  - `onrender.com` for quick presentation OR your custom base domain

Quick-trial defaults already set in `render.yaml`:
- `DJANGO_ALLOW_INSECURE_DEFAULTS=true`
- `TENANT_REQUIRE_HEADER=true`
- `TENANT_ENFORCE_HEADER_MATCH=true`
- `TENANT_ENFORCE_HOST_MATCH=false`

## 4) Set required frontend env vars

Set on `sms-frontend`:
- `VITE_FORCE_API_BASE_URL=https://sms-backend.onrender.com`

## 5) Deploy

Render auto-deploys after env vars are saved.
Backend startup runs:
- `migrate_schemas --shared`
- `migrate_schemas`
- `collectstatic`
- `gunicorn`

## 6) Post-deploy bootstrap (Render shell on backend)

Run:

```bash
python manage.py createsuperuser
python manage.py create_school --schema_name demo_school --name "Demo School" --domain demo.onrender.com
python manage.py create_school_admin --schema_name demo_school --username admin --password 'Admin@12345' --email admin@demo.com
python manage.py tenant_command seed_roles --schema=demo_school
python manage.py tenant_command seed_modules --schema=demo_school
```

For presentation mode, tenant routing uses the login header flow (`X-Tenant-ID`) with:
- Tenant ID: `demo_school`

## 7) Smoke tests

- `GET /api/ping/` on backend
- Tenant login from frontend
- `/api/dashboard/summary/` loads
- Finance + Students + Library page load checks

## 8) Move from trial to production

When switching to a paid production setup:
- Set `DJANGO_ALLOW_INSECURE_DEFAULTS=false`
- Set strict webhook/provider secrets
- Enable host-domain tenant matching (`TENANT_ENFORCE_HOST_MATCH=true`)
- Use custom wildcard domain (`*.your-domain.com`)
