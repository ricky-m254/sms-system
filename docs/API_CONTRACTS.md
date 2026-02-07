# API Contracts (Frozen)

These APIs are stable for frontend integration. Changes require versioning.

## Authentication

### POST /api/auth/login/
Request:
```json
{"username": "admin", "password": "admin123"}
```
Response:
```json
{"refresh": "...", "access": "..."}
```

## Routing & Dashboard

Note:
- `modules_detail` contains key/name pairs in the order returned by the backend.
- `unavailable_modules` lists assigned modules without summary implementation.

### GET /api/dashboard/routing/
Response:
```json
{
  "user": "admin",
  "role": "TENANT_SUPER_ADMIN",
  "module_count": 2,
  "modules": [{"key": "FINANCE", "name": "Finance"}, {"key": "STUDENTS", "name": "Students"}],
  "target": "MAIN",
  "target_module": null
}
```

### GET /api/dashboard/summary/
Response:
```json
{
  "modules": ["FINANCE", "STUDENTS"],
  "modules_detail": [{"key": "FINANCE", "name": "Finance"}, {"key": "STUDENTS", "name": "Students"}],
  "unavailable_modules": [],
  "summary": {
    "students": {"active": 120, "enrollments": 110},
    "finance": {"revenue_billed": 1500.0, "cash_collected": 500.0, "total_expenses": 200.0, "net_profit": 300.0, "outstanding_receivables": 1000.0}
  }
}
```

## Students (Legacy)

Note:
- `guardians` is always present as an array (empty if none).

### GET /api/students/
Response:
```json
[{"id": 1, "admission_number": "ST001", "first_name": "Alice", "last_name": "Zephyr", "date_of_birth": "2010-01-01", "gender": "F", "is_active": true, "created_at": "2026-02-03 10:00:00", "guardians": []}]
```

### POST /api/students/
Request:
```json
{"admission_number": "ST003", "first_name": "Chris", "last_name": "Green", "gender": "M", "date_of_birth": "2010-02-01"}
```
Response:
```json
{"id": 3, "admission_number": "ST003", "first_name": "Chris", "last_name": "Green", "gender": "M", "date_of_birth": "2010-02-01", "is_active": true, "created_at": "2026-02-03 10:10:00", "guardians": []}
```

### GET /api/enrollments/
Response:
```json
[{"id": 1, "student": 1, "student_name": "ST001 - Alice Zephyr", "school_class": 1, "class_name": "Grade 1 - A", "term": 1, "enrollment_date": "2026-02-03"}]
```

### POST /api/enrollments/
Request:
```json
{"student": 1, "school_class": 1, "term": 1}
```
Response:
```json
{"id": 2, "student": 1, "student_name": "ST001 - Alice Zephyr", "school_class": 1, "class_name": "Grade 1 - A", "term": 1, "enrollment_date": "2026-02-03"}
```

## Finance

Note:
- `InvoiceSerializer` uses `depth=1`, so `student` and `term` objects are nested.
- `balance_due` is derived and read-only.
- `invoice_date` and `total_amount` are read-only.
- `invoices` and `payments` are immutable (no PUT/PATCH in API).
- `Invoice.status` values: `DRAFT`, `CONFIRMED`, `VOID`.
- Decimal fields are serialized as strings by default (e.g., `"1500.00"`).
- `depth=1` may include additional fields beyond the minimal examples shown.

### GET /api/finance/invoices/
Response:
```json
[{"id": 1, "student": {"id": 1, "admission_number": "ST001"}, "term": {"id": 1, "name": "Term 1"}, "invoice_date": "2026-02-03", "due_date": "2026-03-04", "total_amount": "1500.00", "status": "CONFIRMED", "balance_due": "1000.00", "line_items": [{"id": 1, "fee_structure": 1, "description": "Tuition", "amount": "1500.00"}]}]
```

### POST /api/finance/invoices/
Request:
```json
{
  "student": 1,
  "term": 1,
  "due_date": "2026-03-04",
  "line_items": [{"fee_structure": 1, "amount": 1500.0, "description": "Tuition"}]
}
```
Response:
```json
{"id": 2, "student": {"id": 1, "admission_number": "ST001"}, "term": {"id": 1, "name": "Term 1"}, "invoice_date": "2026-02-03", "due_date": "2026-03-04", "total_amount": "1500.00", "status": "CONFIRMED", "balance_due": "1500.00", "line_items": [{"id": 2, "fee_structure": 1, "description": "Tuition", "amount": "1500.00"}]}
```

### GET /api/finance/payments/
Response:
```json
[{"id": 1, "student": 1, "payment_date": "2026-02-03 10:00:00", "amount": "500.00", "payment_method": "Cash", "reference_number": "RCPT-1001", "notes": "Initial deposit", "is_active": true, "allocations": []}]
```

### POST /api/finance/payments/
Request:
```json
{"student": 1, "amount": 500.0, "payment_method": "Cash", "reference_number": "RCPT-1002", "notes": "Deposit"}
```
Response:
```json
{"id": 2, "student": 1, "payment_date": "2026-02-03 10:20:00", "amount": "500.00", "payment_method": "Cash", "reference_number": "RCPT-1002", "notes": "Deposit", "is_active": true, "allocations": []}
```

### POST /api/finance/payments/{id}/allocate/
Request:
```json
{"invoice_id": 1, "amount": 500.0}
```
Response:
```json
{"message": "Allocation successful"}
```

### GET /api/finance/expenses/
Response:
```json
[{"id": 1, "category": "Utilities", "amount": "200.00", "expense_date": "2026-02-03", "description": "Electricity bill", "created_at": "2026-02-03 10:00:00"}]
```

### POST /api/finance/expenses/
Request:
```json
{"category": "Supplies", "amount": 100.0, "expense_date": "2026-02-03", "description": "Stationery"}
```
Response:
```json
{"id": 2, "category": "Supplies", "amount": "100.00", "expense_date": "2026-02-03", "description": "Stationery", "created_at": "2026-02-03 10:30:00"}
```

### GET /api/finance/summary/
Response:
```json
{"revenue_billed": 1500.0, "cash_collected": 500.0, "total_expenses": 200.0, "net_profit": 300.0, "outstanding_receivables": 1000.0, "active_students_count": 2}
```

### GET /api/finance/ref/students/
Response:
```json
[{"id": 1, "admission_number": "ST001", "first_name": "Alice", "last_name": "Zephyr", "gender": "F", "is_active": true}]
```

Note:
- Supports pagination with `limit` and `offset`.
- Response is either a list (no pagination) or an object with `count`, `next_offset`, `results`.
- `limit` is capped at 200.

### GET /api/finance/ref/enrollments/
Response:
```json
[{"id": 1, "student": 1, "student_admission_number": "ST001", "student_name": "Alice Zephyr", "school_class": 1, "class_name": "Grade 1 - A", "term": 1, "term_name": "Term 1", "is_active": true}]
```

Note:
- `class_name` and `term_name` are derived from related models.
- Supports pagination with `limit` and `offset`.
- Response is either a list (no pagination) or an object with `count`, `next_offset`, `results`.
- `limit` is capped at 200.

## Academics

### GET /api/academics/ref/academic-years/
Response:
```json
[{"id": 1, "name": "2025-2026", "start_date": "2025-01-01", "end_date": "2025-12-31", "is_active": true}]
```

### GET /api/academics/ref/terms/
Response:
```json
[{"id": 1, "name": "Term 1", "start_date": "2025-01-01", "end_date": "2025-04-30", "academic_year_id": 1, "is_active": true}]
```

### GET /api/academics/ref/classes/
Response:
```json
[{"id": 1, "name": "Grade 1", "stream": "A", "academic_year_id": 1, "is_active": true}]
```

## HR

Note:
- `/api/hr/staff/` supports soft-delete (DELETE sets `is_active=false`).
- `/api/hr/ref/staff/` is read-only.

### GET /api/hr/ref/staff/
Response:
```json
[{"id": 1, "employee_id": "EMP001", "first_name": "Jane", "last_name": "Doe", "role": "Teacher", "phone": "0710000001", "is_active": true}]
```

### GET /api/hr/staff/
Response:
```json
[{"id": 1, "employee_id": "EMP001", "first_name": "Jane", "last_name": "Doe", "role": "Teacher", "phone": "0710000001", "is_active": true, "created_at": "2026-02-03 10:00:00"}]
```

### POST /api/hr/staff/
Request:
```json
{"employee_id": "EMP002", "first_name": "Sam", "last_name": "Hill", "role": "Accountant", "phone": "0710000002"}
```
Response:
```json
{"id": 2, "employee_id": "EMP002", "first_name": "Sam", "last_name": "Hill", "role": "Accountant", "phone": "0710000002", "is_active": true, "created_at": "2026-02-03 10:40:00"}
```

## Communication

Note:
- `/api/communication/messages/` is read/write.
- `/api/communication/ref/messages/` is read-only.

### GET /api/communication/ref/messages/
Response:
```json
[{"id": 1, "recipient_type": "STUDENT", "recipient_id": 1, "subject": "Welcome", "sent_at": "2026-02-03 10:00:00", "status": "SENT"}]
```

### GET /api/communication/messages/
Response:
```json
[{"id": 1, "recipient_type": "STUDENT", "recipient_id": 1, "subject": "Welcome", "body": "Welcome to the new term!", "sent_at": "2026-02-03 10:00:00", "status": "SENT"}]
```

### POST /api/communication/messages/
Request:
```json
{"recipient_type": "STUDENT", "recipient_id": 1, "subject": "Reminder", "body": "Please return the form."}
```
Response:
```json
{"id": 2, "recipient_type": "STUDENT", "recipient_id": 1, "subject": "Reminder", "body": "Please return the form.", "sent_at": "2026-02-03 10:50:00", "status": "SENT"}
```

## Reporting

Note:
- `/api/reporting/audit-logs/` is read-only.
- `/api/reporting/ref/audit-logs/` is read-only.

### GET /api/reporting/ref/audit-logs/
Response:
```json
[{"id": 1, "timestamp": "2026-02-03 10:00:00", "action": "CREATE", "model_name": "Student", "object_id": "1", "user_id": 1}]
```

### GET /api/reporting/audit-logs/
Response:
```json
[{"id": 1, "timestamp": "2026-02-03 10:00:00", "action": "CREATE", "model_name": "Student", "object_id": "1", "user_id": 1, "details": "Seeded student record"}]
```

## Deprecations
- /api/staff/ → use /api/hr/staff/
- /api/messages/ → use /api/communication/messages/
