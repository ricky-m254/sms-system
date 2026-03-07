# School Management System (SMS)

A multi-tenant school management system built with Django (backend) and React/Vite (frontend).

## Architecture

- **Backend**: Django 4.2 + Django REST Framework, running on `localhost:8000`
- **Frontend**: React 18 + TypeScript + Vite, running on `0.0.0.0:5000`
- **Database**: PostgreSQL (Replit built-in), accessed via `django-tenants` with schema-per-tenant isolation

## Project Structure

```
sms_backend/      Django backend
  config/         Settings, URLs, WSGI/ASGI
  clients/        Tenant & domain management
  school/         Core school module (students, finance, etc.)
  academics/      Academics module
  admissions/     Admissions module
  hr/             HR & Payroll module
  library/        Library module
  communication/  Messaging module
  parent_portal/  Parent portal module
  reporting/      Reporting module
  staff_mgmt/     Staff management module
  assets/         Asset management module

sms_frontend/     React frontend
  src/api/        Axios API client config
  src/components/ Reusable UI components
  src/pages/      Page-level views
  src/store/      Zustand state management
```

## Environment Variables

The backend reads from `sms_backend/.env`:
- `DJANGO_DEBUG=true` 
- `DJANGO_ALLOW_INSECURE_DEFAULTS=true`
- `POSTGRES_*` - database connection (uses Replit built-in PostgreSQL)
- `DJANGO_ALLOWED_HOSTS` - comma-separated allowed hosts

## Workflows

- **Start application**: `cd sms_frontend && npm run dev` (port 5000, webview)
- **Backend API**: `cd sms_backend && python manage.py runserver localhost:8000` (port 8000, console)

## Key Notes

- Multi-tenancy uses `django-tenants` with PostgreSQL schemas
- Run `python manage.py migrate_schemas --shared` for shared schema migrations
- Frontend port hardcoded to 5000 via `vite.config.ts`
- Backend CORS is configured to allow `localhost:5000`
