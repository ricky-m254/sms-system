# School Management System (SMS)

A multi-tenant school management system built with Django (backend) and React/Vite (frontend).

## Architecture

- **Backend**: Django 4.2 + Django REST Framework, running on `localhost:8000` (dev) / port 3000 (production)
- **Frontend**: React 18 + TypeScript + Vite, running on `0.0.0.0:5000` (dev)
- **Database**: PostgreSQL (Replit built-in), accessed via `django-tenants` with schema-per-tenant isolation
- **Multi-tenancy**: Header-based (`X-Tenant-ID`) — the platform domain serves all tenants; schools are identified by header

## Project Structure

```
sms_backend/      Django backend
  config/         Settings, URLs (public_urls.py + urls.py), WSGI
  clients/        Tenant & domain management, middleware
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
  frontend_build/ React build output (populated during deployment build phase)

sms_frontend/     React frontend
  src/api/        Axios API client — uses same-origin base URL; Vite proxies /api → localhost:8000 in dev
  src/components/ Reusable UI components
  src/pages/      Page-level views
  src/store/      Zustand state management
```

## Development Workflows

- **Start application**: `cd sms_frontend && npm run dev` (port 5000, webview)
- **Backend API**: `cd sms_backend && python manage.py runserver localhost:8000` (port 8000, console)

### Frontend → Backend Connectivity (dev)

Vite proxies all `/api/*` requests from port 5000 to `localhost:8000`. No CORS setup or separate port needed in the browser. Configured in `sms_frontend/vite.config.ts`.

## Deployment (Production)

- **Build phase** (`build.sh`): npm install, npm build, copy to `sms_backend/frontend_build/`, collectstatic, fake shared migrations, seed demo tenant, register production domain
- **Run phase** (`deploy.sh`): start gunicorn on port 3000
- Production: Django serves both the React SPA and all API endpoints from a single origin

## Environment Variables (managed via Replit Secrets)

- `DJANGO_SECRET_KEY` — Django secret key (Replit secret)
- `DJANGO_DEBUG` — `true` for dev, `false` for production
- `DJANGO_ALLOW_INSECURE_DEFAULTS` — `true` (shared env var)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `REPLIT_DOMAINS` — auto-set by Replit; used to register production domain at build time

## Tenant Setup

The shared PostgreSQL database contains:
- `public` schema — platform-level tables (Tenant, Domain, subscriptions)
- `demo_school` schema — seeded demo tenant with sample data

### Demo Tenant Login
- **Tenant ID**: `demo_school`
- **Username**: `admin`
- **Password**: `admin123`

### Key Middleware (order matters)
1. `SecurityMiddleware`
2. `WhiteNoiseMiddleware` — serves static files and `frontend_build/`
3. `HealthCheckMiddleware` — intercepts `/health` and `/` before tenant routing
4. `TenantMainMiddleware` — resolves tenant from domain
5. `TenantContextGuardMiddleware` — resolves tenant from `X-Tenant-ID` header; skips host-match check for header-resolved tenants

## Modules

All 28 tenant modules are fully implemented (frontend + backend):

**Core Modules:**
- **Students** — directory, attendance, behavior, medical, documents, reports; student ID card generator (printable)
- **Finance** — invoices, payments (receipt PDF download), expenses, fee structures, adjustments, accounts, reconciliation, scholarships, write-offs, vote heads, cashbook & bankbook, arrears management, balance carry-forward
- **Academics** — structure, subjects, classes, gradebook, report cards, assignments, calendar, analytics
- **Admissions** — inquiries, applications, reviews, assessments, interviews, decisions, enrollment, analytics
- **HR** — employees (full CRUD incl. inline edit + deactivate), org chart, attendance, leave (leave types + policies CRUD), payroll (salary structures + components CRUD, printable payslip modal with school branding), recruitment, onboarding, performance, training, analytics
- **Staff** — directory, profiles, departments/roles, attendance, performance, documents, analytics
- **Communication** — messaging, notifications, email, SMS gateway, templates, announcements, analytics
- **Library** — catalog, circulation, reservations, members, fines, inventory, acquisition, reports
- **Parent Portal** — child academics, attendance, finance, communication, schedule, assignments
- **Assets** — registry, categories, assignments, maintenance records, depreciation schedule (IPSAS 17), dashboard
- **Store & Inventory** — food + office item CRUD, stock receipt/issuance/adjustment movements, reorder-level alerts, low-stock view, order requests with approve/reject workflow
- **Dispensary** — student clinic visit records with diagnosis, treatment, severity triage, referrals, follow-ups, prescription/medication dispensing, medication stock tracker

**Operational Modules (added March 2026):**
- **Clock-In / Biometric Attendance** — fingerprint scanner integration, school shift configuration, auto-late detection, auto-updates school & HR attendance records, gate kiosk UI at `/kiosk/clockin` (no-auth), person registry, device management, reports; late arrivals auto-notify all HR/Admin users
- **Timetable** — weekly slot schedule (teacher/subject/class/room per period), staff duty schedule, lesson coverage tracking (auto-flagged when teacher clocks in late), change request workflow (submit → HR/Admin approve/reject → notify)
- **Transport Management** — vehicle fleet, bus routes with stop sequences, student bus pass assignments, driver management, incident tracking; dashboard
- **Visitor Management & Gate Security** — visitor sign-in/out log (with badge number), authorized student pickup registry, pickup log with authorization tracking, dashboard stats
- **Examinations** — exam sessions, paper scheduling (room, invigilator, marks), seat allocation, mark entry, grade boundaries, position/rank calculation, result analytics
- **Alumni Management** — alumni directory (graduation year, institution, occupation, country), alumni events with attendee registration, dashboard
- **Hostel / Boarding** — dormitories, bed space management, student allocations, hostel roll-call attendance (Morning/Evening/Night), leave management with approval workflow
- **Parent-Teacher Meetings (PTM)** — session scheduling, teacher slot generation, parent booking system, meeting notes recording
- **Sports & Extracurricular** — clubs (Sports/Academic/Arts/Community), member enrollment with roles, tournament tracking, student awards & achievements
- **Cafeteria / Food Service** — meal plans, weekly menu planner, student enrollment by meal plan, meal service log, cafeteria wallet transactions
- **Curriculum & Lesson Planning** — scheme of work per subject/class/term, weekly topic coverage tracking, lesson plan submission/approval workflow, teaching resource library
- **Maintenance Requests** — facility issue reporting (Electrical/Plumbing/IT/Building etc.), priority management (Low/Medium/High/Urgent), assignment to maintenance staff, cost tracking, update timeline
- **E-Learning / LMS** — course builder (subject/class/teacher), course materials (PDF/Video/Link/Note), online quizzes with MCQ/TF/Short Answer + auto-marking, virtual session scheduling (Zoom/Meet/Teams)
- **Executive Analytics Dashboard** — school-wide KPIs (students, staff, finance), attendance trend chart, enrollment trend, at-risk students (absenteeism detection), auto-refresh every 60s

### Navigation
- `ModuleToolbar` component in every module sidebar: back-to-dashboard button + module switcher
- All delete operations use `ConfirmDialog` for admin confirmation before any data is removed

## Deployment (Production)

**Target:** Autoscale (Replit)

**Build step:**
```
cd sms_frontend && npm run build
mkdir -p ../sms_backend/frontend_build
cp -r dist/* ../sms_backend/frontend_build/
cd ../sms_backend && python manage.py collectstatic --noinput
```

**Run step:**
```
cd sms_backend && python manage.py migrate --noinput && gunicorn --bind=0.0.0.0:3000 --workers=2 --timeout=120 config.wsgi:application
```

**How it works:**
- React is built to `sms_frontend/dist`, copied to `sms_backend/frontend_build/`
- Django/whitenoise serves the React SPA from `frontend_build/`
- A catch-all URL pattern in `config/urls.py` serves `index.html` for all non-API routes
- Replit's `REPLIT_DOMAINS` env var is automatically added to Django `ALLOWED_HOSTS`
- `DATABASE_URL` env var is picked up automatically for PostgreSQL
- Port 3000 used for gunicorn in production

**Branding:** Rynaty School Management System by Rynatyspace Technologies

## Key Notes

- Run `python manage.py seed_demo` to (re)create the demo school tenant
- Run `python manage.py create_school --schema_name X --name Y --domain Z` to provision a new school
- `migrate_schemas --shared --fake` marks shared migrations applied without executing SQL (tables already exist from original dev setup)
