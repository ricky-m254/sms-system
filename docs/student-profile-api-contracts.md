# Student Profile API Contracts (Frontend Stub)

These endpoints are referenced by the frontend Student Profile page. Backend can implement them as described below; pagination may use either DRF style (`count` + `results`) or return a plain array.

## 1) Attendance Summary

**GET** `/api/attendance/summary/?student_id=:id`

Example response:
```
{
  "attendance_rate": 94,
  "present": 24,
  "absent": 2,
  "late": 1,
  "period_label": "Last 30 days"
}
```

## 2) Attendance Records

**GET** `/api/attendance/?student_id=:id`

Example response:
```
{
  "count": 30,
  "results": [
    { "id": 1, "date": "2026-02-01", "status": "Present", "notes": "" },
    { "id": 2, "date": "2026-02-02", "status": "Late", "notes": "Traffic" }
  ]
}
```

## 3) Behavior Incidents

**GET** `/api/behavior/incidents/?student_id=:id`

Example response:
```
{
  "count": 2,
  "results": [
    {
      "id": 10,
      "incident_type": "Negative",
      "category": "Uniform Violation",
      "incident_date": "2026-02-05",
      "severity": "Low"
    }
  ]
}
```

## 4) Academic Records

**GET** `/api/academics/records/?student_id=:id`

Example response:
```
{
  "count": 3,
  "results": [
    { "id": 21, "subject": "Math", "score": 85, "grade": "B", "term": "Term 2" }
  ]
}
```
