# Project Status Handoff (Frontend + Backend)

This document summarizes what has been implemented so far, what is missing, and key integration points. It is intended for the next team to continue the work without losing context.

## Backend Overview

**Architecture**
- Django + DRF with `django-tenants` multi-tenant model.
- Tenant routing by domain or `X-Tenant-ID` header.
- Public schema handles system-level routes; tenant schema handles module routes.

**Auth**
- JWT via `rest_framework_simplejwt`.
- Login endpoint: `POST /api/auth/login/` (tenant routes).
- All module endpoints require auth + module permissions.

**Permissions**
- Role-based: `ADMIN`, `TENANT_SUPER_ADMIN`, `ACCOUNTANT`, `TEACHER`.
- Module access enforced by `HasModuleAccess` using `UserModuleAssignment`.

**Key Backend Routes (Tenant)**
- Dashboard:
  - `GET /api/dashboard/summary/`
  - `GET /api/dashboard/routing/`
- Students:
  - `GET /api/students/`
  - `GET /api/students/summary/`
- Finance:
  - `GET /api/finance/summary/`
  - `GET /api/finance/invoices/`
  - `POST /api/finance/invoices/`
  - `GET /api/finance/invoices/{id}/`
  - `GET /api/finance/payments/`
  - `POST /api/finance/payments/`
  - `POST /api/finance/payments/{id}/allocate/`
  - `GET /api/finance/expenses/`
  - `POST /api/finance/expenses/`
  - `PATCH /api/finance/expenses/{id}/`
  - `GET /api/finance/fees/`
  - `POST /api/finance/fees/`
  - `PATCH /api/finance/fees/{id}/`
  - `GET /api/finance/fee-assignments/` (registered)
  - `POST /api/finance/fee-assignments/`
  - `PATCH /api/finance/fee-assignments/{id}/`
  - `GET /api/finance/invoice-adjustments/` (registered)
  - `POST /api/finance/invoice-adjustments/`
- Finance references:
  - `GET /api/finance/ref/students/`
  - `GET /api/finance/ref/enrollments/`
- Academics references:
  - `GET /api/academics/ref/academic-years/`
  - `GET /api/academics/ref/terms/`

**Backend Fixes Applied**
- `FeeAssignmentViewSet` registered in router.
- `InvoiceAdjustmentViewSet` registered in router.
- Summary endpoints reordered before router to avoid `/students/summary` being treated as pk.
- Invoice serializer now explicitly declares writable `student` and `term` fields.
- Invoice serializer now uses `school.Term` queryset to avoid cross-app Term mismatch.

## API Examples (Sample Payloads)

**Auth**
```
POST /api/auth/login/
{
  "username": "admin",
  "password": "admin123"
}
```
Response:
```
{
  "access": "<jwt-access-token>",
  "refresh": "<jwt-refresh-token>"
}
```

**Students Summary**
```
GET /api/students/summary/
Authorization: Bearer <token>
X-Tenant-ID: demo_school
```
Response:
```
{
  "students_active": 2,
  "enrollments_active": 2
}
```

**Finance Summary**
```
GET /api/finance/summary/
```
Response:
```
{
  "revenue_billed": 1500,
  "cash_collected": 500,
  "total_expenses": 200,
  "net_profit": 300,
  "outstanding_receivables": 1000,
  "active_students_count": 2
}
```

**Create Invoice**
```
POST /api/finance/invoices/
{
  "student": 1,
  "term": 1,
  "due_date": "2026-03-01",
  "line_items": [
    { "fee_structure": 1, "amount": 1500.00, "description": "Tuition" }
  ]
}
```

**Record Payment**
```
POST /api/finance/payments/
{
  "student": 1,
  "amount": 500.00,
  "payment_method": "Cash",
  "reference_number": "RCPT-1001",
  "notes": "Initial deposit"
}
```

**Allocate Payment**
```
POST /api/finance/payments/1/allocate/
{
  "invoice_id": 1,
  "amount": 200.00
}
```

**Create Expense**
```
POST /api/finance/expenses/
{
  "category": "Utilities",
  "amount": 200.00,
  "expense_date": "2026-02-04",
  "description": "Electricity bill"
}
```

**Create Fee Structure**
```
POST /api/finance/fees/
{
  "name": "Term 1 Tuition",
  "amount": 1500.00,
  "academic_year": 1,
  "term": 1,
  "is_active": true
}
```

**Create Fee Assignment**
```
POST /api/finance/fee-assignments/
{
  "student": 1,
  "fee_structure": 1,
  "discount_amount": 100.00,
  "is_active": true
}
```

**Create Invoice Adjustment**
```
POST /api/finance/invoice-adjustments/
{
  "invoice": 1,
  "amount": 100.00,
  "reason": "Scholarship waiver"
}
```

## Screenshots (To Add)

- Main dashboard (`/dashboard`)
- Students dashboard (`/modules/students`)
- Finance summary (`/modules/finance`)
- Finance invoices list + modal
- Finance create invoice form
- Finance payments list + create
- Finance expenses list + create/edit
- Finance fee structures list + create/edit
- Finance fee assignments list + create/edit
- Finance adjustments list + create
- Settings (global + finance) pages

## Frontend Overview

**Stack**
- Vite + React + TypeScript
- Tailwind + shadcn style primitives
- Axios for API calls
- React Router for routing
- Zustand for auth state

**Design Constraints Enforced**
- 12-column grid system
- Flat dark UI
- Single accent color (emerald)
- KPIs limited to 4
- Clear visual hierarchy and spacing

**Routing**
- `/login`
- `/dashboard`
- `/modules/students`
- `/modules/finance/*`

**Auth + API**
- Token stored in localStorage (`sms_access_token`, `sms_refresh_token`, `sms_tenant_id`).
- Axios injects `Authorization` and `X-Tenant-ID` headers.

### Students Module (Complete)
- Summary + roster from backend:
  - `GET /api/students/summary/`
  - `GET /api/students/`
- Search filter included.

### Finance Module (In Progress)
**Layout**
- Sidebar navigation with submodules.

**Dashboard (Summary)**
- KPIs + charts (area, bar, pie).
- Real data from:
  - `GET /api/finance/summary/`
  - `GET /api/finance/invoices/`
  - `GET /api/finance/payments/`
  - `GET /api/finance/expenses/`
- Charts updated: Cashflow from Operating Activities, Debtors Aging Report, Payments by Method, Payments volume.

**Invoices**
- List with filters + pagination.
- Invoice detail and allocation shown in modal popup.
- Student column now prefers full name (from `student_full_name`) over admission number.
- Invoice list includes index column.
- Invoice list now includes Invoice Date, Due Date, Amount Paid, and Due Amount.
- Invoice form now shows admin-aligned fields (total amount, status, is_active, invoice/created dates, balance due) as read-only.
- For TENANT_SUPER_ADMIN, status and is_active are editable and sent to backend on create.
- Invoice line items now auto-fill amount from selected fee structure (editable override).
- Invoice create flow includes "Create & add another" and success message.
- Invoice list shows success banner after create.
- Allocation popup now shows student name, current balance, payment date, notes, and filters payments by student.
- Allocation popup header shows class/term and guardian count.
- Allocation posts to:
  - `POST /api/finance/payments/{id}/allocate/`
- Invoice create form now shows student class/term and guardian contacts (from `/api/students/{id}/` and `/api/finance/ref/enrollments/`).
- Invoice list rows include a "Context" expander for class/term + guardian info.

**Payments**
- List view with Create button.
- Create page implemented.
- Create now returns success banner on payments list.
- Payments list shows student names and supports search + student filter.
- Payment form shows student class/term and guardian contacts (student + enrollment endpoints).
- Payments list rows include a "Context" expander for class/term + guardian info.

**Fee Assignments**
- Fee assignment form now shows student class/term and guardian contacts (student + enrollment endpoints).

**Invoice Adjustments**
- Adjustment form now shows student class/term and guardian contacts (via selected invoice student).

**Expenses**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Edit/save now returns a success banner on the list page.
- Budgeting inputs (monthly/quarterly/annual) stored in localStorage (`finance:budget:*`).
- Spending trends chart (last 6 months) from loaded expense data.
- Budget API contract wired to `/api/v1/finance/budgets` with `academicYear` + `term` params.
- Budget save flow attempts `POST /api/v1/finance/budgets/` or `PUT /api/v1/finance/budgets/{id}/` and falls back to localStorage if API missing.
- Spending trends now support daily/weekly/monthly views with category filter.
- Export tools: CSV list export and JSON summary export from the expenses list page.

**Fee Structures**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Uses academic references.
- Edit/save now returns a success banner on the list page.
- Term options now filter by selected academic year.

**Fee Assignments**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Edit/save now returns a success banner on the list page.

**Invoice Adjustments**
- List view with Create button.
- Create page implemented.
- Create form validates against invoice balance due (client-side) and shows balance in selector.
- Filtering + summary cards (total, average, last 30 days) for adjustments list.

**Settings (Global + Module)**
- Central Settings layout at `/settings`.
- Sidebar links for Global, Finance, Students, Parents, Academics, Staff.
- Schema-driven settings stored in `src/settings/schemas`.
- Renderer built via reusable `SettingsField` component.
- LocalStorage persistence via `settings:<module>` keys.
- Permissions mocked via `src/settings/permissions.ts` (hidden fields use `requiredPermission`).
- Debug toggle allows admins to show restricted fields (localStorage `settings:debug_show_hidden`).
- Settings permissions are now fetched from `/api/dashboard/routing/` and stored in `sms_permissions` / `sms_user.permissions`.

## Immediate Next Steps (Safe Continuation)

- Ensure `FinanceLayout` route uses `path="/modules/finance/*"` so nested create/edit pages do not redirect to `/dashboard`.
- Restart backend after router changes (fee assignments, invoice adjustments).
- Keep tenant aligned: domain `demo.localhost` + schema `demo_school` + user `admin/admin123`.

## Missing / Not Done Yet

**Frontend**
- Field-level validation and inline error hints for Finance create/edit forms (payments, expenses, fee structures, fee assignments, invoice adjustments, invoices).
- Delete flows implemented for expenses, fee structures, fee assignments, invoices, and payments (with confirmation).
- Invoice edit is view-only (backend immutability); fields locked with guidance banner.
- Server-side pagination enabled for finance list endpoints; frontend normalizes DRF-style `count` + `results`.
- Finance summary dashboard normalizes paginated invoice/payment/expense lists.
- Auto-logout after 15 minutes of inactivity via `IdleLogout`.
- Expense budgets and spending trends are frontend-only; backend does not persist budgets yet.
- Module dashboards beyond Students/Finance.
- Parents module needs dedicated backend endpoints for guardians; currently derived from `/api/students/`.
- Admin user/module management screens.
- Finance-to-student/parent integration for class + contact data in finance flows (pending backend data).
- Responsive pass across major pages (mobile/tablet-friendly layouts, collapsible sidebars, table overflow).
- Parents module scaffolded (summary + directory) using `/api/students/` guardian data.

**Backend**
- Payment editing endpoints (not provided).
- Invoice editing endpoints (disabled by design).
- Invoice adjustment edit/delete endpoints not provided.
 - Add delete endpoints only if business rules allow; adjustments are still create-only.
- Finance list endpoints now paginate with page size 8 via `FinanceResultsPagination`.
- Settings overrides endpoint not implemented (frontend uses localStorage only).
- `/api/dashboard/routing/` now returns permissions for frontend settings.
- Budget endpoints under `/api/v1/finance/budgets` not found in backend; frontend uses mock/local data until implemented.

## Tenant Configuration (Recommended)
- `demo.localhost` domain
- `demo_school` schema name
- Admin: `admin` / `admin123`

## Notes / Pitfalls
- Direct browser access to API endpoints returns 401; JWT is only attached by the app.
- The Students summary endpoint must be registered before router to avoid `/students/summary` being treated as a pk.
- Invoices are immutable (no PUT/PATCH in backend); frontend create flow only.
- Fee assignments and adjustments routes were added to backend router; verify they remain in `sms_backend/school/urls.py`.
- Settings are persisted locally under `settings:<module>`; no backend overrides yet.
- Budget API contract expects `academicYear` (e.g., `2025`) and `term` (term id). If backend uses different identifiers, adjust frontend mapping.
- Student and guardian details rely on `/api/students/{id}/` and `/api/finance/ref/enrollments/?student_id=...`; if missing, the UI shows fallback mock data.

## Theme Preference

- Stored in localStorage under `settings:global` (`themePreference`).
- UI exposes `system`, `light`, and `dark`.

## Current UI Patterns (Do Not Break)

- Finance submodules use list pages with Create/Edit buttons that navigate to dedicated pages.
- Invoice detail uses modal popup for viewing and allocation.
- Flat dark UI, single accent color, 12-column grid, KPIs limited to 4.

## How To Run (Local)

- Frontend: `npm run dev -- --host --port 3000`
- Backend: `python manage.py runserver`
- Tenant: `demo.localhost` domain + `demo_school` schema

## Next Team Start Point (Updated Order)

1. Confirm adjustment creation rules and surface backend errors clearly (especially balance constraints).
2. Add server-side pagination + filters once backend enables pagination.
3. Expand settings permissions from backend (replace mock).

## Repo Hygiene

- Added root `.gitignore` to exclude build artifacts, venvs, and `.env` files.
- Added `.env.example` in `sms_backend/` and `sms_frontend/` (not yet wired in backend settings).
- Root `README.md` includes structure and run steps.
