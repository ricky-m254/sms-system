# RSM – Rynatyschool Management System

A multi-tenant school management system built by Rynatyspace Technologies. Django 4.2 backend, React/Vite frontend, PostgreSQL schema-per-tenant, IPSAS-compliant finance. 28 modules.

## Recent Fixes

### Parent/Student Login Race Condition Fix (2026-03-28)
- **Root cause**: `setTokens()` was called immediately after the login POST, making `isTenantAuth=true`. At the next `await` yield point (routing/me calls), React re-rendered the `/login` route as `<Navigate to="/dashboard" replace />`, sending parents/students to the staff dashboard BEFORE the final `navigate('/modules/parent-portal/dashboard')` fired.
- **Fix in `LoginPage.tsx` `handleSubmit`**: Deferred ALL Zustand store writes (tokens, role, tenant, permissions, assignedModules, availableRoles) until AFTER all API calls (routing + me) complete. Added explicit `Authorization: Bearer ${token}` + `X-Tenant-ID` headers to routing/me calls so they work without the store. Then committed all state + called `navigate()` in one synchronous block — React 18 automatic batching ensures a single render at the destination URL.
- **Effect**: Parents land on `/modules/parent-portal/dashboard`, students on `/student-portal` — no flash through staff dashboard, no race condition.

## Recently Added Modules

### Student Portal & Parent Portal — Full Fix (2026-03)
**Student Portal (all 8 pages now functional):**
- **Root cause fixed**: Student role (`STUDENT_PORTAL` module) was being rejected by `/api/parent-portal/` endpoints which require `PARENTS` module. Created a dedicated `/api/student-portal/` namespace with `StudentPortalAccessMixin` (`module_key = "STUDENT_PORTAL"`)
- **New backend**: `parent_portal/student_portal_views.py` — `StudentDashboardView`, `StudentAcademicsGradesView`, `StudentReportCardsView`, `StudentAttendanceSummaryView`, `StudentAttendanceCalendarView`, `StudentAssignmentsView`, `StudentTimetableView`, `MyInvoicesView`, `MyPaymentsView`
- **New URLs** (mounted in `school/urls.py`):
  - `/api/student-portal/dashboard/`, `academics/grades/`, `academics/report-cards/`, `attendance/summary/`, `attendance/calendar/`, `assignments/`, `timetable/`
  - `/api/portal/my-invoices/`, `/api/portal/my-payments/` — previously missing, now fixed for StudentPortalFeesPage
- **Student lookup**: `_student_from_request(user)` — finds student by `admission_number == username` (primary), then `ParentStudentLink` (fallback)
- **Frontend**: All 5 broken StudentPortal pages updated: `Dashboard`, `Grades`, `Timetable`, `Assignments`, `Attendance` — all now call `/student-portal/` endpoints

**Parent Portal (5 stub pages rebuilt with full UI):**
- `ParentPortalAcademicsPage` — grades table with PASS/FAIL badges, grade color coding, report cards list; uses `/parent-portal/academics/grades/` + `report-cards/`
- `ParentPortalFinancePage` — KPI cards (total billed/paid/outstanding), invoices list with status badges, payments table; uses `/parent-portal/finance/summary/`, `invoices/`, `payments/`
- `ParentPortalAttendancePage` — attendance rate progress bar, stats grid, behavior incidents with severity badges; uses `/parent-portal/attendance/summary/` + `behavior/incidents/`
- `ParentPortalCommunicationPage` — tabbed view (notifications/announcements/messages) with unread count badges; uses `/parent-portal/messages/`, `announcements/`, `notifications/`
- `ParentPortalSchedulePage` — calendar events with color-coded event types and past/upcoming indicators, assessments list; uses `/parent-portal/timetable/` + `calendar/`

### Smart Attendance & Access Control — Phase 1: Device Capture (clockin migration 0006)
- **Extends** existing `clockin` module (DO NOT rewrite — extend only)
- **`BiometricDevice`** extended with `use_context` field: `gate` / `classroom` / `staff_terminal`
- **`AttendanceCaptureLog`** new model — raw event log per device scan:
  - Fields: `device` (FK), `person` (FK, nullable), `method` (card/fingerprint/face), `identifier`, `timestamp`, `status` (pending/success/failed), `failure_reason`, `raw_payload`
  - Indexes on `timestamp`, `device+timestamp`, `status`
- **`AttendanceCaptureService`** (`clockin/application/services/attendance_capture_service.py`) — Phase 1 service:
  - `receive_scan()` validates device by `device_id + api_key`, stores raw log with `status=PENDING`, updates `device.last_seen`
  - Returns structured result dict; Phase 2 identity resolution hooks in next
- **`CaptureView`** (in `clockin/views.py`) — `POST /api/attendance/capture/` and `POST /api/clockin/capture/`:
  - No JWT required (device authenticates with `api_key`)
  - Validates required fields; parses optional ISO-8601 timestamp
  - Returns `202 Accepted` on success; `401` for bad key; `422` for invalid method
- **`AttendanceCaptureLogViewSet`** — read-only list/detail; filter by `?status=` and `?device=`
- **Routes**: `attendance/capture/` wired in `school/urls.py` via thin `clockin/urls_capture.py` module

### Custom Domain Onboarding (clients migration 0014 + dnspython)
- **Model**: `CustomDomainRequest` (public schema) — tracks domain, verification token, status (PENDING/VERIFIED/ACTIVE/FAILED/REJECTED), timestamps, attempts
- **Service**: `clients/domain_service.py` — `initiate_domain_request()`, `verify_domain_request()` (DNS TXT lookup via dnspython), `activate_domain_request()`, `reject_domain_request()`, `get_current_request()`
- **School-Admin API** (tenant-scoped via `schema_context("public")`):
  - `GET /api/settings/domain/` — current request status + DNS instructions
  - `POST /api/settings/domain/request/` — submit domain (validates: reserved names, length, cross-tenant conflicts)
  - `POST /api/settings/domain/verify/` — trigger DNS TXT record check
  - `DELETE /api/settings/domain/` — cancel pending request
- **Platform-Admin API** (`IsGlobalSuperAdmin` protected):
  - `GET /api/platform/domain-requests/?status=VERIFIED` — list all requests (filterable)
  - `GET /api/platform/domain-requests/{id}/` — detail
  - `POST /api/platform/domain-requests/{id}/approve/` — activate (creates Domain record, updates tenant.custom_domain)
  - `POST /api/platform/domain-requests/{id}/reject/` — reject with reason
- **Frontend pages**:
  - `pages/settings/SettingsDomainPage.tsx` — school admin self-service: submit domain, view DNS TXT instructions with copy button, trigger verification, see status badges, cancel/retry
  - `pages/platform/PlatformDomainRequestsPage.tsx` — platform admin: list all requests, filter by status, Activate/Reject with reason modal, full audit logging
- **Routes**: `/settings/domain`, `/platform/domain-requests`
- **Sidebars**: "Custom Domain" added to Settings → Access Control; "Domain Requests" added to Platform nav

### Multi-Tenant Subdomain Routing (Prompt 1 — completed)
- Backend: `TenantContextGuardMiddleware` enhanced with subdomain fallback detection, `RESERVED_SUBDOMAINS` frozenset
- `GET /api/tenant/info/` added to both public and tenant URL configs
- Frontend: `useTenantDetection.ts` hook — auto-detects school subdomain, resolves tenant info
- `LoginPage.tsx`: auto-fill + lock tenant field, school name banner, suspended/not-found error screens

### Transfer System (migration 0046)
- Models: `CrossTenantTransfer`, `TransferPackage`, `StudentHistory`, `StaffHistory`
- 11 API endpoints covering: initiate, approve-from, approve-to, execute, reject, cancel, package, history
- Frontend: `pages/transfers/` (Dashboard, Initiate, Detail pages)
- Supports cross-tenant and internal (class/stream) transfers with JSON data snapshots

### Settings & Admission System (migrations 0047, 0048)
- Models: `AdmissionSettings` (sequence tracking, year, padding, transfer policy, reset policy), `MediaFile` (file upload registry), `TenantSettings` (generic KV store)
- `SchoolProfile` extended with: `timezone`, `language`, `default_date_format`, `late_fee_grace_days`, `late_fee_type`, `late_fee_value`, `late_fee_max`, `accepted_payment_methods`
- 12 new API endpoints:
  - `GET/PATCH /settings/admission/` — admission number configuration
  - `GET /settings/admission/preview/` — preview next admission number without consuming it
  - `POST /settings/media/upload/` — multipart file upload with module tagging
  - `GET /settings/media/` — list uploaded files
  - `GET /settings/import/{module}/template/` — download blank CSV template (students/staff/fees/payments)
  - `POST /settings/import/students/` — bulk CSV import with validate-only dry-run support
  - `POST /settings/import/staff/` — bulk CSV import for HR employees
  - `GET/POST /settings/` — generic KV store (bulk upsert list `[{key,value,category}]` or flat dict)
  - `DELETE /settings/kv/{key}/` — delete a KV setting by key
  - `GET/PATCH /settings/finance/` — finance config (currency, tax, prefixes, late fees, payment methods)
  - `GET/PATCH /settings/general/` — general school config (name, address, timezone, language, date format)
- Frontend: `pages/settings/SettingsAdmissionPage.tsx`, `pages/settings/SettingsImportExportPage.tsx`, `pages/settings/SettingsFinancePage.tsx`
- `SettingsSchoolProfilePage.tsx` updated with Timezone and System Language dropdowns
- Sidebar: "Admission Numbers" added to School Setup; "Import & Export" added under new Data Management group; "Finance" wired to dedicated SettingsFinancePage

### Auto-Role Login System
- **JWT enrichment**: `get_token()` now embeds `role` and `tenant_id` as custom claims in every access token
- **Login response enriched**: `POST /auth/login/` returns `{access, refresh, role, available_roles, redirect_to, tenant_id}` alongside tokens
- **Audit trail**: Every successful login writes a `LOGIN` record to `AuditLog` (action, user, role, tenant_id, redirect_to, timestamp)
- **New endpoint**: `POST /auth/role-switch/` validates requested role against user's assigned roles, returns routing info + logs `ROLE_SWITCH` to AuditLog
- **Dashboard routing enriched**: `GET /dashboard/routing/` now returns `available_roles` and `redirect_path` fields in every response
- **Multi-role frontend**: `LoginPage.tsx` shows a glassmorphism `RoleSelectModal` when `available_roles.length > 1`; role selection calls `/auth/role-switch/` then navigates
- **Auth store**: `availableRoles: string[]` added to Zustand store (persisted in `localStorage` via `sms_available_roles`)
- **Role → path table**: STUDENT→`/student-portal`, PARENT→`/modules/parent-portal/dashboard`, all staff/admin→`/dashboard`

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

### Phase 13 — Testing (Prompts 50-56)

Test files in `sms_backend/domains/tests/` — all use Python stdlib `unittest`, no database required:

| File | Tests | Coverage |
|---|---|---|
| `test_create_student_service.py` | 7 | Validation, duplicate prevention, whitespace, save guard |
| `test_enroll_student_service.py` | 6 | Student/class existence, duplicate enrollment, term_id |
| `test_permission_resolver_service.py` | 8 | Role perms, GRANT/DENY overrides, has_permission, no-role |
| `test_api_auth_students.py` | 13 | Permission format, auth schema, Role add/remove/idempotent |
| `test_tenant_isolation.py` | 18 | Tenant entity, resolver, blank/None header, cross-tenant |

Run: `python -m unittest domains.tests.test_create_student_service domains.tests.test_enroll_student_service domains.tests.test_permission_resolver_service domains.tests.test_api_auth_students domains.tests.test_tenant_isolation`

### Phase 14 — Database Migration Analysis (Prompts 57-63)

Management command: `python manage.py analyze_inventory_migration --schema=demo_school`

**Finding**: Asset models are CORRECTLY isolated in the `assets/` Django app. Store/Inventory models (`StoreItem`, `StoreCategory`, etc.) live in `school/models.py` — architecturally acceptable at current scale. API separation is sound. No data migration needed today.

**Deprecation plan** (v2.1+): Create standalone `inventory` Django app, copy models, run `INSERT INTO inventory_* SELECT * FROM school_store*`, keep backward-compat aliases.

### Phase 15 — Frontend Alignment (Prompts 64-70)

**New hooks/components:**
- `sms_frontend/src/hooks/usePermissions.ts` — fetches `/rbac/users/{id}/permissions/`, 5-min sessionStorage cache, fail-open (`'*'` wildcard on error)
- `sms_frontend/src/components/PermissionGate.tsx` — `<PermissionGate permission="…">`, `anyOf`, `allOf`, `fallback` props; `usePermissionCheck()` hook variant
- `sms_frontend/src/modules/` — 7 barrel `index.ts` files (users, academics, finance, operations, inventory, communication, analytics) with module keys and route lists

### Phase 16 UX — Permission-Based UI (Prompts 71-75)

PermissionGate applied to action buttons:
- `StudentsDirectoryPage.tsx` — "+ Add Student" gated on `students.student.create`
- `FinancePaymentsPage.tsx` — "Record payment" gated on `finance.payment.create`

Pattern to extend to other pages: import `PermissionGate` from `'../../components/PermissionGate'`, wrap add/create/delete buttons.

### Phase 17 — Workflow Optimization (Prompts 76-80)

Management command: `python manage.py workflow_optimization_report --schema=demo_school`

Analyzed 4 workflows:
- **Admissions**: 5-step → 3-step (auto-enroll signal + 2-step form)
- **Fee Payment**: Student Profile → Finance tab shortcut + quick-fill buttons
- **Attendance**: "Mark All Present" bulk action + sticky save button
- **Duplication**: Unified student creation path; RBAC hybrid duplication is by design

### Phase 18 — Performance Optimization (Prompts 81-86)

**DB Indexes** (migration `0045_phase18_performance_indexes` — applied to demo_school):
- `Student.is_active`, `Student.created_at`
- `Invoice.status`, `Invoice.(student, status)`, `Invoice.due_date`
- `Payment.payment_date`, `Payment.is_active`, `Payment.(student, is_active)`
- `AttendanceRecord.date`, `AttendanceRecord.status`
- `StoreItem.is_active`
- `Enrollment.status`

**Query optimization**: `StudentViewSet.get_queryset` → `prefetch_related('guardians')` (eliminates N+1 on student detail with multiple guardians)

**Caching** (`DashboardSummaryView`): 2-minute per-tenant+user LocMemCache. Cache key: `dashboard_summary_{schema}_{user_id}`. `cache.set()` failure is caught silently so cache errors never break the view.

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
- **Super Admin Platform (Prompt 6)**: Implemented missing cross-tenant modules. Added `GET /platform/analytics/workflow-monitor/` — iterates all non-public tenant schemas via `schema_context()`, returns per-school counts (students, staff, pending transfers, pending admissions, overdue invoices, payments last 30d) plus platform totals and `CrossTenantTransfer` summary. Added `GET /platform/analytics/global-reports/` — cross-tenant academic + financial aggregates (total students/staff, KES invoiced/paid/overdue, per-school collection rates). Frontend: `PlatformWorkflowMonitorPage.tsx` (summary cards + color-coded per-school table), `PlatformGlobalReportsPage.tsx` (collection-rate progress bars + financial table). Both wired to `PlatformLayout.tsx` sidebar and `App.tsx` routes (`/platform/workflow-monitor`, `/platform/global-reports`). Public schema (`schema_name="public"`) excluded from queries to prevent `school_student does not exist` errors.
