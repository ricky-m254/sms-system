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

## Recent Bug-Fix Session (T001–T012)

- **T004 Platform Billing CRUD**: `PlatformBillingPage.tsx` — plan cards now have Edit/Delete buttons; "+ Add Plan" button opens a modal form (code, name, description, monthly_price, annual_price, max_students, max_storage_gb); plan create/edit/delete uses `publicApiClient` POST/PATCH/DELETE; delete confirmation dialog added
- **T005 AppShell Role Filtering**: `AppShell.tsx` — each nav item now carries a `moduleKey`; after login the shell fetches `/users/submodule-permissions/` and hides items where no `can_view` permission exists for the current role; admins/super-admins see everything; fails open (shows all) when no permissions configured
- **T006 Analytics Dashboard**: rewritten to match real flat backend response (`total_students`, `staff_clocked_in_today`, `revenue_this_month`, etc.)
- **T011 Alumni Auto-Enroll**: `sms_backend/alumni/signals.py` — `post_save` signal on `Enrollment` model; when `status` becomes `Completed`, creates `AlumniProfile` (idempotent, inside `transaction.on_commit`); signal registered via `AlumniConfig.ready()`
- **T012 Visitor Management CRUD**: All three stub pages fully implemented — `VisitorMgmtVisitorsPage.tsx` (sign-in/sign-out/delete), `VisitorMgmtAuthorizedPickupsPage.tsx` (create/edit/delete with student dropdown), `VisitorMgmtPickupLogsPage.tsx` (record/delete with authorized-pickup dropdown)
- **T002 Visitor Dashboard fix**: API path corrected (`/visitor_mgmt/` → `/visitor-mgmt/`), `visitors_in`/`visitors_out` response fields mapped correctly, all quick-action routes updated to `/modules/visitors/`
- **T008 Media URLs**: `StudentProfilePage.tsx` — `resolveMediaUrl()` helper prefixes relative `/media/...` URLs with the server origin; applied to `student.photo` and `doc.url` links
- **T010 Parent Portal errors**: `ParentPortalTransportPage.tsx` and `ParentPortalHealthPage.tsx` now extract the server error message (`data.error` / `data.detail`) from 404 responses; displays "No linked student found." instead of a generic error message

## Biometric Device Discovery

- **Auto-detect panel**: `ClockInDevicesPage.tsx` — "📡 Auto-detect" with WebHID USB scan + 128-thread TCP subnet scan
- **Dahua SADP broadcast** (UDP port 37020): Phase 1 identifies devices with model/serial/MAC
- **HTTP CGI identification**: Phase 2 probes TCP 80/37777/37778 to confirm Dahua ASI6214S
- **ip_prefix auto-strip bug fix**: Backend (`clockin/views.py`) and frontend both auto-extract first 3 octets if user pastes a full IP like "192.168.1.108" → "192.168.1"
- **Primary device**: Dahua ASI6214S (default 192.168.1.108, ports 37777/37778/80)
- **Additional device brands**: ZKTeco (4370), Anviz (5010/6000), FingerTec (4008), Suprema (9922)

## Finance IPSAS Audit Reports (Kenya Format)

`FinanceAuditReportsPage.tsx` completely rewritten to match Kenya Ministry of Education / TSC annual financial audit report format.

**Report Groups:**
- **Management Reports** (dark theme, operational): Income Statement, Fee Collection, Expense Summary, Budget vs Actual, Arrears, Vote Head Allocation, Class Balances
- **Kenya IPSAS Audit Package** (blue/white professional theme, matching MoE format):
  - Statement I: Management Responsibility (boilerplate + signature lines for Principal + BOM Chair)
  - Statement V: Receipts & Payments (Term 1/2/3 columns, cash-basis, Notes 1-13)
  - Statement VI: Financial Assets & Liabilities (Bank + Cash + Receivables + Payables → Net Position)
  - Statement VII: Cash Flows (IPSAS 2 — Operating/Investing/Financing)
  - Statement VIII: Budgeted vs Actual (IPSAS 24 — all accounts)
  - Section IX: Significant Accounting Policies (10 comprehensive notes)
  - Section X: Notes to Financial Statements (Note 3: Parents contributions by term; Note 5/6: Ops/Tuition expenditure by term; Note 9: Infrastructure; Note 10: Bank accounts; Note 11: Cash in hand; Note 12a/b: Receivables + aging; Note 13a/b: Payables + aging)
  - Section XI: IPSAS 17 PPE schedule

**UI Enhancements:**
- School information panel (name, county, reg no, principal name, BOM chair)
- Bank accounts panel (4 accounts: Tuition/Operations/School Fund/Infrastructure — bank, account no, balance)
- Opening cash balance input
- PDF generated with dark navy cover page + light professional audit pages
- Expenses auto-classified into Tuition/Operations/Boarding/Infrastructure by category name
- Payments split into terms by date: Term 1 (Jan–Apr), Term 2 (May–Aug), Term 3 (Sep–Dec)

**Additional API data fetched:**
- `/finance/reports/vote-head-allocation/` — vote head allocation totals
- `/finance/reports/arrears-by-term/` — arrears by academic term

## Student Model — Contact Fields (Migration 0043)

`Student` model now has `phone` (CharField 30), `email` (EmailField), `address` (TextField) — all blank=True. Migration `0043_add_student_contact_fields` applied to all schemas. `StudentSerializer` includes all three fields. **Root cause fix**: serializer previously declared `phone`/`email` fields that did not exist on the model, causing `ImproperlyConfigured` 500 errors on every `GET /api/students/` call, which blocked the entire dashboard from loading. `Student Profile → Personal` tab "Edit Profile" modal patches `first_name`, `last_name`, `date_of_birth`, `gender`, `phone`, `email` via `PATCH /students/{id}/`.

## Seed Data Infrastructure

- Backend: `ModuleSeedView` at `POST /school/seed/` runs `seed_kenya_school` management command for the current tenant schema (creates portal logins post-seed).
- Frontend: `SettingsSeedPage` at `/settings/seed-data` — "Seed All Modules" button + "Seed Transport Only" secondary button. Both use idempotent `get_or_create` logic.

## DBMA Architecture (Phase 1–16)

### Cross-cutting Domains Layer (`sms_backend/domains/`)

Implements the DBMA (Domain-Driven, Behaviour-Modelled Architecture) per the AI Prompts roadmap.
Rule #1: Only extend and refactor safely — no rewrites.

**Directory Structure:**
```
sms_backend/domains/
  users/         domain/entities.py (Student, Parent, Guardian)
                 domain/interfaces/repositories.py (StudentRepository, ParentRepository)
                 application/create_student_service.py
                 infrastructure/django_student_repository.py
  academics/     domain/entities.py (AcademicYear, Term, SchoolClass, Subject, Enrollment)
                 domain/interfaces/repositories.py
                 application/enroll_student_service.py
  finance/       domain/entities.py (FeeStructure, Invoice, Payment) — IPSAS-compliant
                 domain/interfaces/repositories.py
  inventory/     domain/entities.py (Item, Stock, StockMovement, Asset)
                 domain/interfaces/repositories.py
  auth/          domain/entities.py (UserAccount, Role, Permission, UserPermissionOverride)
                 domain/interfaces/repositories.py
                 application/login_service.py
                 application/assign_role_service.py
                 application/jwt_service.py
                 application/permission_resolver_service.py  ← Phase 16 Advanced RBAC
                 infrastructure/django_user_repository.py
                 infrastructure/django_role_repository.py
                 infrastructure/django_permission_repository.py
                 infrastructure/django_override_repository.py
                 infrastructure/has_permission_middleware.py ← in MIDDLEWARE after Auth
  tenants/       domain/entities.py (Tenant)
                 domain/interfaces/repositories.py (TenantRepository)
                 application/tenant_resolver_service.py
                 infrastructure/django_tenant_repository.py
                 infrastructure/tenant_middleware.py
  communication/ domain/entities.py (Message, Announcement)
  analytics/     domain/entities.py (DashboardMetric, Report)
  operations/    library/  transport/  hostel/  cafeteria/  visitor/
                 Each: domain/entities.py + (application, infrastructure, presentation stubs)
```

**Per-app domain re-exports:**
- `sms_backend/academics/domain/entities/__init__.py` → re-exports from `domains.academics`
- `sms_backend/academics/domain/interfaces/__init__.py`
- `sms_backend/finance/domain/entities/__init__.py`
- `sms_backend/transport/domain/entities/__init__.py`

### Phase 16 Advanced RBAC

**Permission format**: `<domain>.<resource>.<action>` — e.g. `finance.invoice.read`

**Django models added** (migration `school/0044_phase16_rbac_permission_override`):
- `school.Permission` — all named permissions (60 default)
- `school.RolePermissionGrant` — role → permission M2M bridge
- `school.UserPermissionOverride` — per-user GRANT/DENY override (overrides take priority)

**Resolution logic** (PermissionResolverService):
`Final Permissions = (Role Permissions ∪ Overrides.GRANT) − Overrides.DENY`

**API endpoints** (all under `/api/`):
- `GET  rbac/permissions/` — list all 60 permissions (filter: `?module=finance`)
- `POST rbac/permissions/seed/` — seed default permissions (admin only)
- `GET  rbac/roles/` — list roles with permissions
- `POST rbac/roles/<role_id>/grant/` — grant permission to role
- `POST rbac/roles/<role_id>/revoke/` — revoke permission from role
- `GET  rbac/users/<user_id>/permissions/` — effective permissions for a user
- `GET  rbac/users/<user_id>/overrides/` — list user overrides
- `POST rbac/users/<user_id>/overrides/` — create/update override
- `DEL  rbac/users/<user_id>/overrides/<permission_id>/` — delete override

**Management command**: `python manage.py seed_default_permissions --assign-roles --schema=demo_school`
- Creates 60 default permissions
- Seeds TENANT_SUPER_ADMIN + ADMIN: 60 perms; ACCOUNTANT: 7; TEACHER: 10; PARENT: 6; STUDENT: 5

**HasPermissionMiddleware**: registered in `settings.py` after `AuthenticationMiddleware`
- Attaches `request.has_permission("finance.invoice.read")` to every request
- Attaches `request.effective_permissions` set

**Seed integration**: `POST /school/seed/` now also runs `seed_default_permissions --assign-roles` automatically.

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
