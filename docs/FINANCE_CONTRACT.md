# Finance Data Contracts

This document defines read-only reference data that Finance may consume from other modules.

## Student Reference (Read-Only)
Endpoint:
- GET /api/finance/ref/students/

Query parameters (optional):
- active: true | false (default true)
- class_id: filter by SchoolClass
- term_id: filter by Term (via Enrollment)
- order_by: id | admission_number | first_name | last_name
- order_dir: asc | desc (default asc)
- limit: integer (enables pagination)
- offset: integer (default 0)
- limit cap: max 200

Response fields:
- id
- admission_number
- first_name
- last_name
- gender
- is_active

Pagination response (when limit/offset provided):
- count
- next_offset
- results: list of student refs

## Enrollment Reference (Read-Only)
Endpoint:
- GET /api/finance/ref/enrollments/

Query parameters (optional):
- active: true | false (default true)
- class_id: filter by SchoolClass
- term_id: filter by Term
- student_id: filter by Student
- order_by: id | student_id | school_class_id | term_id
- order_dir: asc | desc (default asc)
- limit: integer (enables pagination)
- offset: integer (default 0)
- limit cap: max 200

Response fields:
- id
- student
- student_admission_number
- student_name
- school_class
- class_name
- term
- term_name
- is_active

Pagination response (when limit/offset provided):
- count
- next_offset
- results: list of enrollment refs

## Boundary Rules
- Finance does not write to Student or Enrollment.
- Finance consumes only the above reference contracts.
- Any expansion of Finance data requirements should be added to this contract.
