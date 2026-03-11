# RSM – Rynatyschool Management System

A multi-tenant school management system built by Rynatyspace Technologies. Django 4.2 backend, React/Vite frontend, PostgreSQL schema-per-tenant, IPSAS-compliant finance. 28 modules.

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
  school/         Core school module (students, finance, staff, etc.)
  academics/      Academics, report cards, gradebook
  admissions/     Admissions module
  hr/             HR & Payroll module
  library/        Library module
  communication/  Messaging module
  parent_portal/  Parent portal module
  clockin/        Biometric Clock-In / Out module
  transport/      School transport & fleet management
  curriculum/     Curriculum management
  examinations/   Examinations module
  analytics/      Analytics & reporting
  reporting/      Finance reporting
  frontend_build/ React build output (populated during deployment build phase)

sms_frontend/     React frontend
  src/api/        Axios API client — uses same-origin base URL; Vite proxies /api → localhost:8000 in dev
  src/components/ Reusable UI components (AppShell, DemoBanner)
  src/pages/      Page-level views (28 module dashboards)
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
- `demo_school` schema — seeded demo tenant with full sample data

### Demo Tenant Login
- **Tenant ID**: `demo_school`
- **Username**: `admin`
- **Password**: `admin123`
- **Teacher login**: `samuel.otieno` / `teacher123`

### Key Middleware (order matters)
1. `SecurityMiddleware`
2. `WhiteNoiseMiddleware` — serves static files and `frontend_build/`
3. `HealthCheckMiddleware` — intercepts `/health` and `/` before tenant routing
4. `TenantMainMiddleware` — resolves tenant from domain
5. `TenantContextGuardMiddleware` — resolves tenant from `X-Tenant-ID` header; skips host-match check for header-resolved tenants

## CRITICAL API Rule

Frontend `apiClient` paths must NOT include the `/api/` prefix. Correct: `apiClient.get('/students/')`.
Named export: `import { apiClient } from '../../api/client'`

## School Profile API

Response shape: `{ tenant: { name, schema }, profile: { school_name, primary_color, … } }`
Profile is NESTED — always access as `resp.profile?.school_name` (not `resp.school_name`).

## Demo Reset System

- Endpoint: `POST /school/demo/reset/` — wipes and reseeds all demo_school data (only works for demo_school tenant)
- `GET /school/demo/reset/` — returns current demo status
- Frontend: `DemoBanner` component shows 30-min countdown, reset button; auto-mounted in AppShell
- Management command: `python manage.py reset_demo` — clears then re-runs `seed_kenya_school`

## Modules

All 28 tenant modules are fully implemented (frontend + backend):

### Student Management
- Students, Enrollments, Admissions, Guardian management, Alumni, Parent Portal

### Academic Management
- Academic structure (years/terms/classes), Subjects (Kenyan CBC + 8-4-4), Timetable, Gradebook, Report Cards, Examinations, E-Learning, Curriculum, PTM

### Finance & Commerce
- Fee structures, Invoices, Payments (IPSAS), Store & Inventory, Assets, Cafeteria

### Staff & HR
- Staff Directory (Teaching + Non-Teaching categories), HR records, Clock-In/Out (biometric kiosk + PIN + QR), Shifts, Leave management

### School Operations
- Library (books, lending), Transport (fleet, routes, OpenStreetMap, parent portal), Hostel, Dispensary, Maintenance, Visitor Management

### Communication & Analytics
- Announcements, Messaging, Analytics dashboards

## Kenyan CBC Curriculum Data

Seeded subjects organized by department:
- **Sciences**: Biology, Chemistry, Physics, Agriculture, Integrated Science
- **Mathematics**: Mathematics
- **Languages**: English, Kiswahili
- **Humanities**: History & Government, Geography, CRE, Social Studies, Life Skills
- **Technical**: Computer Studies, Home Science, Art & Design, Pre-Technical Studies
- **Business**: Business Studies
- **Creative Arts**: Music, Art, Creative Arts & Sports
- **Physical Education**: Physical Education

## Staff Categories

- **Teaching**: TSC/BOM deployed teachers (seeded: 12 with subjects)
- **Non-Teaching** (seeded: 18): Principal, Deputy, Bursar, Clerks, Lab Technicians, Librarian, Drivers, Security Guards, Cooks, Groundskeeper, Nurse, ICT Technician, Matron
- Filter tabs in StaffDirectoryPage: All / Teaching / Non-Teaching / Administration / Support

## Design System

- **Background**: `#070b12`, sidebar gradient `#0d1421 → #0a0f1a`
- **Primary accent**: Emerald `#10b981`, secondary: Sky `#38bdf8`
- **Approval accent**: Amber `#f59e0b`
- **Typography**: Space Grotesk (headings, `font-display`), Manrope (body)
- **Glass panels**: `background: rgba(255,255,255,0.025)`, `border: rgba(255,255,255,0.07)`
- **Currency**: `Ksh ` prefix + `toLocaleString('en-KE', { minimumFractionDigits: 2 })`

## Clock-In Kiosk

Route: `/modules/clockin/kiosk` (renders full-screen, fixed position, z-[200])
Modes: Fingerprint (hidden input, auto-focus), PIN entry (6-digit keypad), QR / ID Card (hidden input)
Live attendance wall shown on right side (large screens)
API: `POST /api/clockin/kiosk/scan/` with `{ fingerprint_id: string }`

## Transport Dashboard

- OpenStreetMap iframe embed (Nairobi, no API key required), filter: `hue-rotate(185deg)` for dark mode
- Mock live fleet data (4 buses, 4 routes, Nairobi area)
- Fleet status chips overlay map with ETA and status
- Parent portal CTA linking to parent-portal module
