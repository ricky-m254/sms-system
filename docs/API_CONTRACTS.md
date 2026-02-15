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

### GET /api/students/documents/
Query params:
- `student_id` or `student` (optional)
- `search` (optional)

Response:
```json
{
  "count": 1,
  "results": [
    {
      "id": 10,
      "student_id": 1,
      "student_name": "Alice Zephyr",
      "admission_number": "ST001",
      "file_name": "birth_cert.pdf",
      "url": "http://demo.localhost:8000/media/student_documents/birth_cert.pdf",
      "uploaded_at": "2026-02-15T09:20:00Z"
    }
  ]
}
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

### GET /api/finance/budgets/
Query params (optional):
- `academic_year` (id or year name)
- `term` (term id)

Response:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "academic_year": 1,
      "academic_year_name": "2025-2026",
      "term": 1,
      "term_name": "Term 1",
      "monthly_budget": "15000.00",
      "quarterly_budget": "45000.00",
      "annual_budget": "180000.00",
      "categories": [],
      "is_active": true,
      "created_at": "2026-02-11T12:00:00Z",
      "updated_at": "2026-02-11T12:00:00Z"
    }
  ]
}
```

### POST /api/finance/budgets/
Request:
```json
{
  "academic_year": 1,
  "term": 1,
  "monthly_budget": 15000,
  "quarterly_budget": 45000,
  "annual_budget": 180000,
  "categories": [],
  "is_active": true
}
```
Response:
```json
{
  "id": 1,
  "academic_year": 1,
  "academic_year_name": "2025-2026",
  "term": 1,
  "term_name": "Term 1",
  "monthly_budget": "15000.00",
  "quarterly_budget": "45000.00",
  "annual_budget": "180000.00",
  "categories": [],
  "is_active": true,
  "created_at": "2026-02-11T12:00:00Z",
  "updated_at": "2026-02-11T12:00:00Z"
}
```

### PUT /api/finance/budgets/{id}/
Request:
```json
{
  "academic_year": 1,
  "term": 1,
  "monthly_budget": 16000,
  "quarterly_budget": 48000,
  "annual_budget": 192000,
  "categories": [],
  "is_active": true
}
```
Response:
```json
{
  "id": 1,
  "academic_year": 1,
  "term": 1,
  "monthly_budget": "16000.00",
  "quarterly_budget": "48000.00",
  "annual_budget": "192000.00",
  "categories": [],
  "is_active": true
}
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

### GET /api/academics/departments/
Response:
```json
[{"id": 1, "name": "Sciences", "head": null, "head_name": "", "description": "Science department", "is_active": true}]
```

### POST /api/academics/departments/
Request:
```json
{"name": "Sciences", "description": "Science department", "is_active": true}
```

### GET /api/academics/subjects/
Response:
```json
[{"id": 1, "name": "Biology", "code": "BIO", "department": 1, "department_name": "Sciences", "subject_type": "Compulsory", "periods_week": 4, "is_active": true}]
```

### POST /api/academics/subjects/
Request:
```json
{"name": "Biology", "code": "BIO", "department": 1, "subject_type": "Compulsory", "periods_week": 4, "is_active": true}
```

### GET /api/academics/subject-mappings/
Response:
```json
[{"id": 1, "subject": 1, "subject_name": "Biology", "grade_level": 3, "grade_level_name": "Grade 8", "academic_year": 2, "academic_year_name": "2026-2027", "is_compulsory": true, "is_active": true}]
```

### POST /api/academics/subject-mappings/
Request:
```json
{"subject": 1, "grade_level": 3, "academic_year": 2, "is_compulsory": true, "is_active": true}
```

### GET /api/academics/syllabus/
Response:
```json
[{"id": 1, "subject": 1, "subject_name": "Biology", "grade_level": 3, "grade_level_name": "Grade 8", "term": 4, "term_name": "Term 1", "topic_name": "Cell Structure", "order": 1, "is_completed": false}]
```

### PATCH /api/academics/syllabus/{id}/complete/
Request:
```json
{"completed_date": "2026-02-01"}
```

### GET /api/academics/syllabus/progress/
Response:
```json
[{"subject_id": 1, "subject_name": "Biology", "grade_level_name": "Grade 8", "term_name": "Term 1", "total_topics": 1, "completed_topics": 1, "completion_percent": 100.0}]
```

### GET /api/academics/enrollments/
Response:
```json
[{"id": 1, "student": 9, "student_name": "Lina Kai", "school_class": 8, "class_section_name": "Grade 7 A", "academic_year": 2, "term": 4, "term_name": "Term 1", "status": "Active", "is_active": true}]
```

### POST /api/academics/enrollments/
Request:
```json
{"student": 9, "school_class": 8, "term": 4, "status": "Active", "is_active": true}
```

### POST /api/academics/enrollments/bulk-promote/
Request:
```json
{"from_academic_year": 2, "to_academic_year": 3, "from_term": 4, "to_term": 7}
```
Response:
```json
{"message": "Bulk promotion completed.", "promoted": 25, "skipped": 3}
```

### GET /api/academics/teacher-assignments/
Response:
```json
[{"id": 1, "teacher": 12, "teacher_name": "teacher_a", "subject": 1, "subject_name": "Biology", "class_section": 8, "class_section_name": "Grade 7 A", "academic_year": 2, "academic_year_name": "2026-2027", "term": 4, "term_name": "Term 1", "is_primary": true, "is_active": true}]
```

### POST /api/academics/teacher-assignments/
Request:
```json
{"teacher": 12, "subject": 1, "class_section": 8, "academic_year": 2, "term": 4, "is_primary": true, "is_active": true}
```

### GET /api/academics/grading-schemes/
Response:
```json
[{"id": 1, "name": "Default Scheme", "is_default": true, "is_active": true}]
```

### POST /api/academics/grading-schemes/
Request:
```json
{"name": "Default Scheme", "is_default": true, "is_active": true}
```

### GET /api/academics/grade-bands/?scheme=1
Response:
```json
[{"id": 1, "scheme": 1, "scheme_name": "Default Scheme", "label": "A", "min_score": "80.00", "max_score": "100.00", "grade_point": null, "remark": "Excellent", "is_active": true}]
```

### POST /api/academics/grade-bands/
Request:
```json
{"scheme": 1, "label": "A", "min_score": 80, "max_score": 100, "grade_point": null, "remark": "Excellent", "is_active": true}
```

### GET /api/academics/assessments/?class_section=8&term=4
Response:
```json
[{"id": 1, "name": "Mid Term Test", "category": "Test", "subject": 1, "subject_name": "Mathematics", "class_section": 8, "class_section_name": "Grade 9 A", "term": 4, "term_name": "Term 1", "max_score": "100.00", "weight_percent": "100.00", "date": "2026-02-01", "is_published": false, "is_active": true}]
```

### POST /api/academics/assessments/
Request:
```json
{"name": "Mid Term Test", "category": "Test", "subject": 1, "class_section": 8, "term": 4, "max_score": 100, "weight_percent": 100, "date": "2026-02-01", "is_active": true}
```

### POST /api/academics/assessments/{id}/publish/
Request:
```json
{}
```
Response:
```json
{"message": "Assessment published."}
```

### GET /api/academics/grades/?assessment=1
Response:
```json
[{"id": 1, "assessment": 1, "assessment_name": "Mid Term Test", "student": 9, "student_name": "Ana West", "raw_score": "85.00", "percentage": "85.00", "grade_band": 1, "grade_band_label": "A", "remarks": "", "is_active": true}]
```

### POST /api/academics/grades/bulk/
Request:
```json
{"assessment": 1, "grades": [{"student": 9, "raw_score": 85, "remarks": ""}, {"student": 10, "raw_score": 65, "remarks": ""}]}
```
Response:
```json
{"message": "Bulk grades saved.", "created": 2, "updated": 0}
```

### GET /api/academics/grades/import-template/
Response:
- CSV download with columns: `student,raw_score,remarks`

### POST /api/academics/grades/import/
Request:
```json
{"assessment": 1, "rows": [{"student": 9, "raw_score": 85, "remarks": ""}]}
```

### GET /api/academics/term-results/?class_section=8&term=4
Response:
```json
[{"id": 1, "student": 9, "student_name": "Ana West", "class_section": 8, "class_section_name": "Grade 9 A", "term": 4, "term_name": "Term 1", "subject": 1, "subject_name": "Mathematics", "total_score": "85.00", "grade_band": 1, "grade_band_label": "A", "class_rank": 1, "is_pass": true, "is_active": true}]
```

### POST /api/academics/term-results/compute/
Request:
```json
{"class_section": 8, "term": 4, "grading_scheme": 1}
```
Response:
```json
{"message": "Term results computed.", "computed": 2}
```

### GET /api/academics/report-cards/?class_section=8&term=4
Response:
```json
[{"id": 1, "student": 9, "student_name": "Ana West", "class_section": 8, "class_section_name": "Grade 9 A", "term": 4, "term_name": "Term 1", "academic_year": 2, "academic_year_name": "2026-2027", "status": "Draft", "teacher_remarks": "", "principal_remarks": "", "class_rank": 1, "overall_grade": "85.00", "attendance_days": 52, "pdf_url": "/media/report_cards/report_card_9_4_8.pdf"}]
```

### POST /api/academics/report-cards/generate/
Request:
```json
{"class_section": 8, "term": 4}
```
Response:
```json
{"message": "Report cards generated.", "generated": 2, "created": 2, "updated": 0}
```

### PATCH /api/academics/report-cards/{id}/
Request:
```json
{"teacher_remarks": "Steady progress.", "principal_remarks": "Keep improving."}
```

### POST /api/academics/report-cards/{id}/approve/
Request:
```json
{}
```
Response:
```json
{"message": "Report card approved."}
```

### POST /api/academics/report-cards/{id}/publish/
Request:
```json
{}
```
Response:
```json
{"message": "Report card published."}
```

### POST /api/academics/report-cards/distribute/
Request:
```json
{"report_card_ids": [1, 2, 3]}
```
Response:
```json
{"message": "Report cards distributed.", "count": 3}
```

### GET /api/academics/report-cards/{id}/pdf/
Response:
- `application/pdf` download
- filename pattern: `report_card_{student_id}_{term_id}_{class_section_id}.pdf`

### GET /api/academics/assignments/?class_section=8&subject=1
Response:
```json
[{"id": 1, "title": "Chemistry Homework 1", "subject": 1, "subject_name": "Chemistry", "class_section": 8, "class_section_name": "Grade 11 A", "teacher": 5, "teacher_name": "teacher_a", "description": "Complete chapters 1-2", "due_date": "2026-06-10T12:00:00Z", "max_score": "20.00", "status": "Published", "is_active": true}]
```

### POST /api/academics/assignments/
Request:
```json
{"title": "Chemistry Homework 1", "subject": 1, "class_section": 8, "description": "Complete chapters 1-2", "due_date": "2026-06-10T12:00:00Z", "max_score": 20, "publish_date": "2026-06-01T08:00:00Z", "status": "Published", "is_active": true}
```

### PATCH /api/academics/assignments/{id}/
Request:
```json
{"status": "Closed"}
```

### GET /api/academics/assignments/{id}/submissions/
Response:
```json
[{"id": 1, "assignment": 1, "student": 9, "student_name": "Ria Stone", "submitted_at": "2026-06-05T09:00:00Z", "is_late": false, "notes": "Completed", "score": "18.00", "feedback": "Good work"}]
```

### GET /api/academics/assignments/{id}/stats/
Response:
```json
{"assignment_id": 1, "submitted_count": 24, "graded_count": 20, "class_size": 30, "submission_rate_percent": 80.0, "average_score": "15.40"}
```

### POST /api/academics/submissions/
Request:
```json
{"assignment": 1, "student": 9, "notes": "Completed"}
```

### PATCH /api/academics/submissions/{id}/grade/
Request:
```json
{"score": 18, "feedback": "Good work"}
```

### GET /api/academics/calendar/?academic_year=2&term=4
Response:
```json
[{"id": 1, "title": "Science Fair", "event_type": "Other", "start_date": "2026-06-20", "end_date": "2026-06-20", "academic_year": 2, "academic_year_name": "2026-2027", "term": 4, "term_name": "Term 2", "scope": "School-wide", "class_section": null, "is_public": true, "is_active": true}]
```

### POST /api/academics/calendar/
Request:
```json
{"title": "Science Fair", "event_type": "Other", "start_date": "2026-06-20", "end_date": "2026-06-20", "description": "Annual fair", "academic_year": 2, "term": 4, "scope": "School-wide", "is_public": true, "is_active": true}
```

### PATCH /api/academics/calendar/{id}/
Request:
```json
{"title": "Science Fair - Updated"}
```

### DELETE /api/academics/calendar/{id}/
Response:
- `204 No Content` (soft-delete via `is_active=false`)

### GET /api/academics/calendar/export/
Response:
- `text/calendar` iCal download (`academic_calendar.ics`)

### GET /api/academics/analytics/summary/
Response:
```json
{"average_score": "62.40", "pass_rate_percent": 58.3, "total_results": 240, "at_risk_students": 18, "grade_distribution": [{"grade_band": "A", "count": 32}, {"grade_band": "B", "count": 54}]}
```

### GET /api/academics/analytics/class-performance/
Response:
```json
[{"class_section_id": 8, "class_name": "Grade 11 A", "average_score": "64.20", "pass_rate_percent": 61.7, "total_results": 60}]
```

### GET /api/academics/analytics/subject-performance/
Response:
```json
[{"subject_id": 1, "subject_name": "Chemistry", "subject_code": "CHEM", "average_score": "59.10", "pass_rate_percent": 52.0, "total_results": 50}]
```

### GET /api/academics/analytics/at-risk/
Response:
```json
[{"student_id": 9, "admission_number": "ST950", "student_name": "Alex Ray", "failing_subjects": 2, "average_score": "39.50"}]
```

### GET /api/academics/analytics/student/{id}/
Response:
```json
{"student_id": 9, "average_score": "57.50", "attendance_rate_percent": 83.3, "results": [{"term": "Term 1", "class_section": "Grade 12 A", "subject": "Mathematics", "total_score": "70.00", "grade_band": "B", "class_rank": 4, "is_pass": true}]}
```

### GET /api/academics/analytics/teacher/{id}/
Response:
```json
{"teacher_id": 12, "assignment_count": 2, "performance": [{"class_section_id": 8, "class_name": "Grade 12 A", "subject_id": 1, "subject_name": "Mathematics", "average_score": "60.00", "pass_rate_percent": 55.0, "total_results": 40}]}
```

### GET /api/academics/analytics/trend/
Response:
```json
[{"term_id": 4, "term_name": "Term 1", "average_score": "58.20", "pass_rate_percent": 52.1, "total_results": 120}, {"term_id": 5, "term_name": "Term 2", "average_score": "63.40", "pass_rate_percent": 61.0, "total_results": 130}]
```

### POST /api/academics/years/{id}/clone-structure/
Request:
```json
{
  "name": "2026-2027",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "copy_terms": true,
  "copy_classes": true,
  "set_current": false
}
```
Response:
```json
{
  "message": "Academic structure cloned successfully.",
  "source_year_id": 1,
  "target_year_id": 2,
  "cloned_terms": 3,
  "cloned_classes": 8
}
```

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
- Legacy compatibility endpoint remains active:
  - `/api/hr/staff/` (soft-delete, backed by `school_staff`)
- New HR baseline endpoints are now active under `/api/hr/`:
  - Employee Directory
  - Departments & Positions
  - Attendance & Schedules
  - Documents + Expiry Alerts
  - HR Analytics Summary

### GET /api/hr/ref/staff/
Response:
```json
[{"id": 1, "employee_id": "EMP001", "first_name": "Jane", "last_name": "Doe", "role": "Teacher", "phone": "0710000001", "is_active": true}]
```

### GET /api/hr/employees/
Response:
```json
[{"id": 1, "employee_id": "EMP-2026-001", "first_name": "Jane", "middle_name": "", "last_name": "Doe", "full_name": "Jane Doe", "department": 1, "department_name": "Academic", "position": 2, "position_title": "Teacher", "employment_type": "Full-time", "status": "Active", "join_date": "2026-01-10"}]
```

### POST /api/hr/employees/
Request:
```json
{"first_name": "Sam", "middle_name": "", "last_name": "Hill", "date_of_birth": "1990-01-01", "gender": "Male", "marital_status": "Single", "department": 1, "position": 2, "employment_type": "Full-time", "status": "Active", "join_date": "2026-01-10", "notice_period_days": 30}
```

### POST /api/hr/employees/{id}/confirm/
Request:
```json
{"confirmation_date": "2026-04-01"}
```

### POST /api/hr/employees/{id}/exit/
Request:
```json
{"exit_date": "2026-07-31", "exit_reason": "Resignation", "exit_notes": "Left by request"}
```

### GET /api/hr/departments/
Response:
```json
[{"id": 1, "name": "Academic", "code": "ACAD", "parent": null, "parent_name": "", "head": null, "head_name": "", "description": "", "budget": null, "is_active": true, "created_at": "2026-02-12 05:00:00"}]
```

### GET /api/hr/departments/org-chart/
Response:
```json
[{"id": 1, "name": "Academic", "code": "ACAD", "parent_id": null, "head": "", "employee_count": 12}]
```

### GET /api/hr/positions/
Response:
```json
[{"id": 2, "title": "Teacher", "department": 1, "department_name": "Academic", "headcount": 20, "is_active": true}]
```

### GET /api/hr/positions/{id}/vacancies/
Response:
```json
{"position_id": 2, "headcount": 20, "filled": 17, "vacancies": 3}
```

### POST /api/hr/attendance/clock-in/
Request:
```json
{"employee": 1, "date": "2026-02-01", "clock_in": "08:00:00"}
```

### POST /api/hr/attendance/clock-out/
Request:
```json
{"employee": 1, "date": "2026-02-01", "clock_out": "17:30:00"}
```

### GET /api/hr/attendance/summary/
Response:
```json
{"month": 2, "year": 2026, "total_records": 100, "present_count": 84, "late_count": 9, "absent_count": 7, "average_overtime_hours": 1.2}
```

### GET /api/hr/documents/expiring/?days=30
Response:
```json
[{"id": 3, "employee": 1, "employee_name": "Jane Doe", "document_type": "Contract", "file_name": "contract.pdf", "expiry_date": "2026-03-01"}]
```

### GET /api/hr/analytics/summary/
Response:
```json
{"headcount": 80, "attendance_rate_percent": 92.4, "departments": 6, "positions": 18, "headcount_by_status": [{"status": "Active", "count": 73}], "headcount_by_department": [{"department": "Academic", "count": 40}], "headcount_by_employment_type": [{"employment_type": "Full-time", "count": 68}]}
```

### GET /api/hr/leave-types/
Response:
```json
[{"id": 1, "name": "Annual Leave", "code": "ANNUAL", "is_paid": true, "requires_approval": true, "requires_document": false, "max_days_year": 30, "notice_days": 7, "color": "#16A34A", "is_active": true}]
```

### POST /api/hr/leave-types/
Request:
```json
{"name": "Annual Leave", "code": "ANNUAL", "is_paid": true, "requires_approval": true, "requires_document": false, "max_days_year": 30, "notice_days": 7, "color": "#16A34A", "is_active": true}
```

### GET /api/hr/leave-policies/
Response:
```json
[{"id": 1, "leave_type": 1, "leave_type_name": "Annual Leave", "employment_type": "Full-time", "entitlement_days": "24.00", "accrual_method": "Annual", "carry_forward_max": 5, "effective_from": "2026-01-01", "is_active": true}]
```

### GET /api/hr/leave-balance/{employee_id}/
Response:
```json
[{"id": 1, "employee": 3, "employee_name": "Liam Moe", "leave_type": 1, "leave_type_name": "Annual Leave", "year": 2026, "opening_balance": "0.00", "accrued": "24.00", "used": "5.00", "pending": "0.00", "available": "19.00"}]
```

### GET /api/hr/leave-requests/
Response:
```json
[{"id": 1, "employee": 3, "employee_name": "Liam Moe", "leave_type": 1, "leave_type_name": "Annual Leave", "start_date": "2026-03-02", "end_date": "2026-03-06", "days_requested": "5.00", "reason": "Family trip", "status": "Pending"}]
```

### POST /api/hr/leave-requests/
Request:
```json
{"employee": 3, "leave_type": 1, "start_date": "2026-03-02", "end_date": "2026-03-06", "reason": "Family trip"}
```

### POST /api/hr/leave-requests/{id}/approve/
Request:
```json
{}
```

### POST /api/hr/leave-requests/{id}/reject/
Request:
```json
{"rejection_reason": "Insufficient coverage for this period"}
```

### POST /api/hr/leave-requests/{id}/cancel/
Request:
```json
{}
```

### GET /api/hr/leave-calendar/
Response:
```json
[{"id": 1, "employee_id": 3, "employee_name": "Liam Moe", "department": "HR", "leave_type": "Annual Leave", "start_date": "2026-03-02", "end_date": "2026-03-06", "days_requested": "5.00", "status": "Approved"}]
```

### GET /api/hr/salary-structures/
Response:
```json
[{"id": 1, "employee": 3, "employee_name": "Liam Moe", "basic_salary": "1200.00", "currency": "USD", "pay_frequency": "Monthly", "effective_from": "2026-01-01", "effective_to": null, "is_active": true, "components": []}]
```

### POST /api/hr/salary-structures/
Request:
```json
{"employee": 3, "basic_salary": 1200, "currency": "USD", "pay_frequency": "Monthly", "effective_from": "2026-01-01", "effective_to": null}
```

### GET /api/hr/salary-components/
Response:
```json
[{"id": 5, "structure": 1, "component_type": "Allowance", "name": "Housing", "amount_type": "Fixed", "amount": "100.00", "is_taxable": true, "is_statutory": false, "is_active": true}]
```

### POST /api/hr/salary-components/
Request:
```json
{"structure": 1, "component_type": "Deduction", "name": "Tax", "amount_type": "Percentage", "amount": 10.0, "is_taxable": true, "is_statutory": true}
```

### POST /api/hr/payrolls/process/
Request:
```json
{"month": 4, "year": 2026, "payment_date": "2026-04-30"}
```
Response:
```json
{"id": 2, "month": 4, "year": 2026, "status": "Draft", "total_gross": "1300.00", "total_deductions": "450.00", "total_net": "850.00", "items": [{"id": 12, "employee": 3, "employee_name": "Liam Moe", "net_salary": "850.00"}]}
```

### POST /api/hr/payrolls/{id}/approve/
Request:
```json
{}
```

### POST /api/hr/payrolls/{id}/reprocess/
Request:
```json
{}
```

### GET /api/hr/payrolls/{id}/bank-file/
Response:
```text
employee_id,employee_name,net_salary
EMP-PR-001,Pia Ray,850.00
```

### GET /api/hr/payrolls/tax-report/?month=4&year=2026
Response:
```text
employee_id,employee_name,gross_salary,total_deductions,net_salary,estimated_tax
EMP-PR-001,Pia Ray,1300.00,450.00,850.00,130.00
```

### GET /api/hr/payslips/?payroll={id}
Response:
```json
[{"id": 12, "payroll": 2, "employee": 3, "employee_name": "Liam Moe", "basic_salary": "1200.00", "total_allowances": "100.00", "total_deductions": "450.00", "gross_salary": "1300.00", "net_salary": "850.00", "sent_at": null}]
```

### GET /api/hr/payslips/{id}/pdf/
Response:
```text
Payslip download (file or text fallback)
```

### POST /api/hr/payslips/email/
Request:
```json
{"payslip_ids": [12, 13]}
```
Response:
```json
{"message": "Payslips marked as sent.", "count": 2}
```

### GET /api/hr/job-postings/
Response:
```json
[{"id": 1, "title": "Biology Teacher", "department": 1, "department_name": "Academic", "position": 2, "position_title": "Science Teacher", "employment_type": "Full-time", "status": "Draft", "deadline": "2026-06-30"}]
```

### POST /api/hr/job-postings/
Request:
```json
{"position": 2, "department": 1, "title": "Biology Teacher", "description": "Teach senior classes", "requirements": "B.Ed + 3 years", "responsibilities": "Lesson planning", "employment_type": "Full-time", "deadline": "2026-06-30"}
```

### POST /api/hr/job-postings/{id}/publish/
Request:
```json
{}
```

### GET /api/hr/applications/
Response:
```json
[{"id": 5, "job_posting": 1, "job_title": "Biology Teacher", "first_name": "Nora", "last_name": "Lane", "applicant_name": "Nora Lane", "email": "nora@example.com", "status": "New"}]
```

### POST /api/hr/applications/
Request:
```json
{"job_posting": 1, "first_name": "Nora", "last_name": "Lane", "email": "nora@example.com", "phone": "0700000999", "cover_letter": "Experienced teacher"}
```

### PATCH /api/hr/applications/{id}/
Request:
```json
{"status": "Screening", "rating": 4, "notes": "Good initial profile"}
```

### POST /api/hr/applications/{id}/shortlist/
Request:
```json
{}
```

### POST /api/hr/applications/{id}/reject/
Request:
```json
{"notes": "Not selected in this cycle"}
```

### POST /api/hr/applications/{id}/hire/
Request:
```json
{"join_date": "2026-07-01", "gender": "Female", "marital_status": "Single"}
```
Response:
```json
{"message": "Applicant hired and onboarding initialized.", "employee_id": 9}
```

### GET /api/hr/interviews/
Response:
```json
[{"id": 3, "application": 5, "applicant_name": "Nora Lane", "job_title": "Biology Teacher", "interview_date": "2026-06-10T10:00:00Z", "interview_type": "Video", "status": "Scheduled"}]
```

### POST /api/hr/interviews/
Request:
```json
{"application": 5, "interview_date": "2026-06-10T10:00:00Z", "interview_type": "Video", "location": "https://meet.example.com/abc", "interviewers": [1, 2]}
```

### POST /api/hr/interviews/{id}/feedback/
Request:
```json
{"feedback": "Strong communication skills", "score": 4.5, "status": "Completed"}
```

### GET /api/hr/onboarding/{employee_id}/
Response:
```json
[{"id": 11, "employee": 9, "employee_name": "Nora Lane", "task": "Collect signed contract", "assigned_to_name": "hr_recruit", "due_date": "2026-07-01", "status": "Pending"}]
```

### POST /api/hr/onboarding/
Request:
```json
{"employee": 9, "task": "Issue staff ID card", "due_date": "2026-07-03", "status": "Pending", "notes": ""}
```

### PATCH /api/hr/onboarding/{id}/complete/
Request:
```json
{"notes": "Completed on day one"}
```

### GET /api/hr/performance-goals/
Response:
```json
[{"id": 1, "employee": 3, "employee_name": "Ava Mills", "title": "Improve class average by 8%", "target_date": "2026-09-01", "status": "In Progress", "weight": "40.00"}]
```

### POST /api/hr/performance-goals/
Request:
```json
{"employee": 3, "title": "Improve class average by 8%", "description": "Term target", "target_date": "2026-09-01", "status": "In Progress", "weight": 40}
```

### GET /api/hr/performance-reviews/
Response:
```json
[{"id": 2, "employee": 3, "employee_name": "Ava Mills", "reviewer": 4, "reviewer_name": "Ken Ray", "review_period": "Q3 2026", "overall_rating": "4.20", "status": "Draft"}]
```

### POST /api/hr/performance-reviews/
Request:
```json
{"employee": 3, "reviewer": 4, "review_period": "Q3 2026", "overall_rating": 4.2, "strengths": "Strong lesson delivery", "areas_improvement": "Assessment turnaround", "status": "Draft"}
```

### POST /api/hr/performance-reviews/{id}/submit/
Request:
```json
{}
```

### GET /api/hr/training-programs/
Response:
```json
[{"id": 1, "title": "STEM Pedagogy Workshop", "trainer": "Dr. Labs", "start_date": "2026-08-01", "end_date": "2026-08-03", "capacity": 30, "cost": "120.00"}]
```

### POST /api/hr/training-programs/
Request:
```json
{"title": "STEM Pedagogy Workshop", "description": "Instructional coaching", "trainer": "Dr. Labs", "start_date": "2026-08-01", "end_date": "2026-08-03", "capacity": 30, "cost": 120}
```

### GET /api/hr/training-enrollments/
Response:
```json
[{"id": 1, "program": 1, "program_title": "STEM Pedagogy Workshop", "employee": 3, "employee_name": "Ava Mills", "status": "Completed", "completion_date": "2026-08-03"}]
```

### POST /api/hr/training-enrollments/
Request:
```json
{"program": 1, "employee": 3, "status": "Completed", "completion_date": "2026-08-03"}
```

### GET /api/hr/analytics/headcount/
Response:
```json
{"total": 25, "by_department": [{"department": "Academic", "count": 12}], "by_position": [{"position": "Teacher", "count": 10}], "by_employment_type": [{"employment_type": "Full-time", "count": 20}]}
```

### GET /api/hr/analytics/turnover/
Response:
```json
{"year": 2026, "headcount_base": 25, "exits": 2, "turnover_rate_percent": 8.0, "by_reason": [{"reason": "Resignation", "count": 2}]}
```

### GET /api/hr/analytics/attendance/
Response:
```json
{"month": 8, "year": 2026, "total_records": 120, "present_records": 109, "absent_records": 8, "late_records": 3, "attendance_rate_percent": 90.83, "overtime_hours_total": "75.00"}
```

### GET /api/hr/analytics/leave/
Response:
```json
{"year": 2026, "opening_balance_total": "0.00", "accrued_total": "240.00", "used_total": "56.00", "pending_total": "12.00", "available_total": "172.00"}
```

### GET /api/hr/analytics/diversity/
Response:
```json
{"total": 25, "by_gender": [{"gender": "Female", "count": 14, "percent": 56.0}, {"gender": "Male", "count": 11, "percent": 44.0}]}
```

### GET /api/hr/analytics/payroll-costs/
Response:
```json
{"year": 2026, "total_gross": "150000.00", "total_deductions": "35000.00", "total_net": "115000.00", "by_month": [{"month": 8, "gross": "12500.00", "deductions": "2900.00", "net": "9600.00"}]}
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
- /api/messages/ → use /api/communication/messages/

## Library

### GET /api/library/resources/
Response:
```json
[{"id": 1, "resource_type": "Book", "title": "Algebra Basics", "authors": "A. Author", "isbn": "9780000000001", "total_copies": 2, "available_copies": 1}]
```

### POST /api/library/resources/
Request:
```json
{"resource_type": "Book", "title": "Physics 101", "authors": "B. Author"}
```

### POST /api/library/circulation/issue/
Request:
```json
{"member": 1, "copy": 3}
```
Response:
```json
{"id": 12, "transaction_type": "Issue", "member": 1, "copy": 3, "due_date": "2026-03-01", "return_date": null}
```

### POST /api/library/circulation/return/
Request:
```json
{"transaction": 12, "condition_at_return": "Good"}
```
Response:
```json
{"id": 12, "transaction_type": "Return", "is_overdue": false, "overdue_days": 0, "fine_amount": "0.00"}
```

### GET /api/library/circulation/overdue/
Response:
```json
[{"id": 17, "member_member_id": "LIB-001", "copy_accession_number": "ACC-100", "due_date": "2026-01-15"}]
```

### POST /api/library/reservations/
Request:
```json
{"resource": 1, "member": 2}
```
Response:
```json
{"id": 4, "resource": 1, "member": 2, "status": "Waiting", "queue_position": 1}
```

### POST /api/library/fines/{id}/pay/
Request:
```json
{"amount": "50.00"}
```
Response:
```json
{"id": 3, "status": "Paid", "amount": "50.00", "amount_paid": "50.00"}
```
