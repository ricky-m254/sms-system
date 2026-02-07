# Module Summary Endpoints

These endpoints provide read-only summaries for module dashboards and the main dashboard aggregation layer.

## Dashboard Aggregation Contract
- GET /api/dashboard/summary/
- Returns:
  - modules: list of module keys assigned to the user
  - modules_detail: list of module key/name pairs
  - unavailable_modules: assigned modules without summary implementation
  - summary: per-module summary blocks

## Students
- GET /api/students/summary/
- Response:
  - students_active
  - enrollments_active

## Academics
- GET /api/academics/summary/
- Response:
  - academic_years_active
  - terms_active
  - classes_active

## Human Resources
- GET /api/hr/summary/
- Response:
  - staff_active

## Communication
- GET /api/communication/summary/
- Response:
  - messages_sent

## Core Administration
- GET /api/core/summary/
- Response:
  - roles
  - users
  - module_assignments

## Reporting
- GET /api/reporting/summary/
- Response:
  - audit_logs
  - invoices_pending

## Finance
- GET /api/finance/summary/
- Response:
  - revenue_billed
  - cash_collected
  - total_expenses
  - net_profit
  - outstanding_receivables
  - active_students_count
