# Student Module API Contracts (Frontend Fixed Contracts)

These endpoints are the fixed contracts the frontend uses for Students submodules. Backend should implement these shapes. Pagination may be DRF-style (`count` + `results`) or a plain array.

## A) Admissions

### 1) List Applications
**GET** `/api/admissions/applications/`

Query params:
- `page` (number)
- `search` (string)
- `status` (string)
- `grade` (string or id)

Response:
```
{
  "count": 42,
  "results": [
    {
      "id": 1,
      "application_number": "APP-2026-001",
      "student_first_name": "Chipo",
      "student_last_name": "M.",
      "student_dob": "2015-03-12",
      "student_gender": "Female",
      "previous_school": "Sunrise Primary",
      "applying_for_grade": "Grade 7",
      "application_date": "2026-02-01",
      "status": "Interview Scheduled",
      "interview_date": "2026-02-10",
      "assessment_score": 78,
      "decision": "Pending",
      "decision_date": null,
      "student": null,
      "documents": [
        { "type": "Birth Certificate", "received": true },
        { "type": "Previous Report", "received": false }
      ]
    }
  ]
}
```

### 2) Create Application
**POST** `/api/admissions/applications/`
```
{
  "student_first_name": "Chipo",
  "student_last_name": "M.",
  "student_dob": "2015-03-12",
  "student_gender": "Female",
  "previous_school": "Sunrise Primary",
  "applying_for_grade": "Grade 7",
  "application_date": "2026-02-01",
  "guardian_name": "John M.",
  "guardian_phone": "+255700000001",
  "guardian_email": "john@example.com",
  "notes": "Sibling currently enrolled"
}
```

### 3) Update Application Status
**PATCH** `/api/admissions/applications/:id/`
```
{
  "status": "Admitted",
  "decision": "Admitted",
  "decision_date": "2026-02-15",
  "decision_notes": "Strong assessment"
}
```

### 4) Convert to Student
**POST** `/api/admissions/applications/:id/enroll/`
```
{
  "assign_admission_number": true,
  "school_class": 3,
  "term": 2,
  "enrollment_date": "2026-02-20"
}
```

## B) Attendance

### 1) Attendance Summary
**GET** `/api/attendance/summary/`

Query params:
- `student_id` (optional)

Response:
```
{
  "attendance_rate": 92.5,
  "present": 74,
  "absent": 4,
  "late": 3,
  "period_label": "All time"
}
```

### 2) Attendance Records
**GET** `/api/attendance/`

Query params:
- `page` (number)
- `student_id` (optional)
- `status` (optional)
- `date_from` (optional, YYYY-MM-DD)
- `date_to` (optional, YYYY-MM-DD)

Response:
```
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "student": 10,
      "student_name": "Amara N.",
      "date": "2026-02-10",
      "status": "Present",
      "notes": ""
    }
  ]
}
```

### 3) Record Attendance
**POST** `/api/attendance/`
```
{
  "student": 10,
  "date": "2026-02-10",
  "status": "Present",
  "notes": ""
}
```

## C) Behavior & Discipline

### 1) Behavior Incidents
**GET** `/api/behavior/incidents/`

Query params:
- `page` (number)
- `student_id` (optional)
- `incident_type` (optional: Positive | Negative)
- `date_from` (optional, YYYY-MM-DD)
- `date_to` (optional, YYYY-MM-DD)

Response:
```
{
  "count": 5,
  "results": [
    {
      "id": 7,
      "student": 10,
      "student_name": "Amara N.",
      "incident_type": "Negative",
      "category": "Tardiness",
      "incident_date": "2026-02-08",
      "severity": "Low",
      "description": "Late to class"
    }
  ]
}
```

### 2) Create Incident
**POST** `/api/behavior/incidents/`
```
{
  "student": 10,
  "incident_type": "Negative",
  "category": "Tardiness",
  "incident_date": "2026-02-08",
  "severity": "Low",
  "description": "Late to class"
}
```
