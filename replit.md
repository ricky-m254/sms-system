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

## Design System — Glass Morphism (T006 Complete)

All 249 frontend pages now use the unified glass morphism design system. **Zero** legacy `bg-slate-900/60` or `border-slate-800` patterns remain.

- **Background**: `#070b12`, sidebar gradient `#0d1421 → #0a0f1a`
- **Primary accent**: Emerald `#10b981`, secondary: Sky `#38bdf8`
- **Approval accent**: Amber `#f59e0b`
- **Typography**: Space Grotesk (headings, `font-display`), Manrope (body)
- **Glass panel card** (CSS class `glass-panel`): `background: rgba(255,255,255,0.025)`, `border: 1px solid rgba(255,255,255,0.07)`
- **Glass panel hover** (CSS class `glass-panel-hover`): same + hover brightening
- **Hero pattern**: `linear-gradient(135deg,…)` + `radial-gradient` overlay at 0.25 opacity + pill badge + mini stat grid
- **KPI card pattern**: `relative overflow-hidden rounded-2xl p-5` + absolute icon div top-right + large value + label + colored subtext
- **Table `<thead>`**: `bg-white/[0.03]` for subtle row contrast
- **Modal/overlay panels**: `bg-[#0d1421]`
- **Currency**: `Ksh ` prefix + `toLocaleString('en-KE', { minimumFractionDigits: 2 })`

### Dashboard Pages Rebuilt (glass morphism heroes)

Cafeteria, Sports, Hostel, Assets, Maintenance, Visitor, Dispensary, Communication, HR, Finance Summary, Curriculum, Admissions, Parent Portal — all with hero banners, KPI cards, charts, and quick-action sidebar panels.

## Global UI Premium Features (T006)

### Command Palette (⌘K / Ctrl+K)
- **Component**: `sms_frontend/src/components/CommandPalette.tsx`
- 50+ searchable module routes + real-time student API search
- Keyboard navigation (↑↓ Enter Esc), grouped results with icons and colors
- **Trigger points**: ⌘K keyboard shortcut (global listener in AppShell), search bar button in expanded sidebar, search icon in collapsed sidebar, search icon in mobile header (next to avatar)
- **State**: `paletteOpen` in AppShell, rendered as `<CommandPalette open={...} onClose={...} />`

### Animated KPI Count-Up (DashboardPage)
- `AnimatedValue` component: IntersectionObserver-triggered, cubic ease-out over 1.3 s
- Applied to all 5 dashboard KPI strip cards (Students, Applications, Finance, Modules, System Areas)

### Attendance Heatmap (DashboardPage)
- `AttendanceHeatmap` component: 91-day calendar grid (13 weeks × 7 days)
- Weekend cells transparent; weekday cells colored: emerald ≥90%, green 75–90%, amber 60–75%, orange 40–60%, rose <40%
- Month labels, day-of-week labels, legend, rolling average rate badge
- Placed between System Areas and Charts sections

### CBC Report Card Printable Modal
- **Component**: `sms_frontend/src/components/CBCReportCardModal.tsx`
- All 11 CBC Kenya learning areas: English, Kiswahili, Maths, Science & Tech, Social Studies, CRE, Creative Arts, PE, Agriculture, Music, Home Science
- Competency levels: EE (Exceeds), ME (Meets), AE (Approaching), BE (Below Expectation)
- Score bars, competency distribution summary, teacher/principal remarks, school letterhead footer
- Print/Save PDF button via `window.print()`
- Integrated into `AcademicsReportCardsPage` via "CBC View" button per report card row

### PageHero Shared Component
- **Component**: `sms_frontend/src/components/PageHero.tsx`
- 9 color themes: emerald, sky, violet, amber, rose, blue, orange, pink, teal
- Deployed to **196 pages** (214/218 = 98% coverage; remaining 4 are full-screen specials or re-export wrappers)
- 18 module dashboard pages instead use custom gradient hero banners (no PageHero needed)

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

## Recent Updates

- **Teacher Portal** (new module): Full portal at `/teacher-portal/*` — Layout, Dashboard (KPI cards, schedule, recent marks), Classes (subject/class assignments with student counts), Attendance (mark/save daily attendance), Gradebook (CBC 4-band: Exceeding/Meeting/Approaching/Below), Resources (upload/manage teaching materials), Timetable (weekly grid + daily agenda views). Accessible to all authenticated tenant users.
- **Cafeteria — spec-complete**: All 10 spec subsystems now implemented. Added `CafeteriaAccountsPage` (student meal wallets, top-up modal, balance alerts), `CafeteriaPreOrdersPage` (parent/student pre-orders with confirm/cancel workflow + tomorrow's menu view), `CafeteriaKitchenPage` (ingredient stock tracking, reorder alerts, add/restock actions), `CafeteriaReportsPage` (revenue charts, meal plan distribution, top meals, dietary summary). Total cafeteria pages: 11 (dashboard + 10 subsystems).
- **Store — spec-complete**: All spec subsystems now implemented. Added `StoreCategoriesPage` (add/edit/delete stock categories with color labels), `StoreRequestsPage` (department stock requests, approve/reject/fulfill workflow), `StoreAllocationPage` (department-level inventory allocation records), `StoreReportsPage` (consumption charts, department usage breakdown, procurement trends). Total store pages: 11.
- **HR — spec-complete**: Added `HrCompliancePage` (Compliance & Audit Logs — full audit trail with log ID, user, action type, target, module, timestamp, IP; compliance checklist panel). Total HR pages: 14.
- **Clock-In — spec-complete**: Added `ClockInAlertsPage` (real-time attendance anomalies, device offline alerts, absent spike detection, manual correction notices, notification configuration table). Total ClockIn pages: 8.
- **Cafeteria expanded (prev)**: `CafeteriaDietaryPage` (dietary preferences, allergen tags, allergy reference table) and `CafeteriaPaymentsPage` (wallet top-ups, deductions, ledger) — routes `dietary` and `payments`.
- **Store expanded (prev)**: `StoreSuppliersPage` (supplier cards with add/edit/toggle-active) — route `suppliers`.
- **Student Portal expanded**: `StudentPortalLibraryPage` (catalog search, borrowings tab, overdue alerts with due-date badge) — route `library` under `/student-portal/*`.
- **Promise.allSettled**: All 10 platform pages converted from `Promise.all` to `Promise.allSettled` — partial API failures no longer crash multi-data loads.
- **Alumni module**: `AlumniEventsPage.tsx` (full CRUD + attendee viewer modal) and `AlumniAttendeesPage.tsx` (event-filtered attendee list) — both lazy-loaded with routes `events` and `attendees` in App.tsx
- **ChunkErrorBoundary**: Class component wrapping `<Suspense>` in `App.tsx`; catches chunk load failures (network/build errors) and shows retry UI
- **CBC grade scale**: `ExaminationsDashboardPage.tsx` now uses CBC Competency Levels (EE/ME/AE/BE) instead of KNEC 0-100 grading
- **Timetable print**: Print 🖨️ button added to `TimetableGridPage.tsx` using `window.print()`
- **Behavior class filter**: Incident form in `StudentsBehaviorPage.tsx` has a class dropdown that filters the student list; resets on modal close
- **Add Student modal**: `StudentsDirectoryPage.tsx` has a full student creation form (name, DOB, gender, grade, class, guardian) POSTing to `/students/`
- **Admissions Reviews Edit**: Edit button in `AdmissionsReviewsPage.tsx` opens a PATCH modal for score, recommendation, and comments; return JSX wrapped in `<>` fragment
