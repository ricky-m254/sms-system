# Academics Implementation Matrix (vs Spec v1.0, Feb 2026)

## Scope
This matrix compares the provided Academics technical specification against what is currently implemented in this repository.

## Current Status by Submodule

1. Academic Structure
- Status: Implemented (Phase 1 baseline)
- Backend: `/api/academics/years`, `/terms`, `/grade-levels`, `/classes`, plus `/ref/*`
- Frontend: `/modules/academics/structure`

2. Subjects & Curriculum
- Status: Implemented (Phase 1)
- Backend models/endpoints: Implemented under `/api/academics/departments|subjects|subject-mappings|syllabus|syllabus/progress`
- Frontend pages: Implemented at `/modules/academics/subjects`

3. Class Management
- Status: Implemented (Phase 2 baseline)
- Academics-native endpoints:
  - `/api/academics/enrollments/`
  - `/api/academics/enrollments/bulk-promote/`
  - `/api/academics/teacher-assignments/`
- Frontend pages: Implemented at `/modules/academics/class-management`

4. Gradebook
- Status: Implemented (Phase 3 baseline)
- Backend models/endpoints: Implemented under `/api/academics/grading-schemes|grade-bands|assessments|grades|term-results`
- Frontend page: Implemented at `/modules/academics/gradebook`

5. Report Cards
- Status: Implemented (Phase 4 baseline)
- Backend models/endpoints: Implemented under `/api/academics/report-cards`
- Frontend page: Implemented at `/modules/academics/report-cards`

6. Homework & Assignments
- Status: Implemented (Phase 5 baseline)
- Backend models/endpoints: Implemented under `/api/academics/assignments|submissions`
- Frontend page: Implemented at `/modules/academics/assignments`

7. Academic Calendar
- Status: Implemented (Phase 5 baseline)
- Backend models/endpoints: Implemented under `/api/academics/calendar`
- Frontend page: Implemented at `/modules/academics/calendar`

8. Academic Analytics
- Status: Implemented (Phase 6 baseline)
- Backend analytics endpoints implemented under `/api/academics/analytics/*`
- Frontend:
  - Dashboard submodule at `/modules/academics/dashboard` (default Academics landing route)
  - Analytics deep-dive page at `/modules/academics/analytics`

## Data Model Coverage

Implemented:
- `AcademicYear`
- `Term`
- `GradeLevel`
- `SchoolClass`

Missing from spec:
- Analytics materialized/reporting models (if needed)

## Endpoint Coverage Summary

Implemented:
- `/api/academics/years/`
- `/api/academics/terms/`
- `/api/academics/grade-levels/`
- `/api/academics/classes/`
- `/api/academics/ref/academic-years/`
- `/api/academics/ref/terms/`
- `/api/academics/ref/classes/`

## Phased Delivery Plan

Phase 0 (Completed)
- Academic Structure baseline (years, terms, grade levels, classes, ref endpoints)

Phase 1 (Completed)
- Subjects & Curriculum
- Deliverables:
  - Models: Department, Subject, SubjectMapping, SyllabusTopic
  - Endpoints: departments, subjects, subject-mappings, syllabus, syllabus progress
  - Frontend page: replace `/modules/academics/subjects` placeholder with CRUD UI

Phase 2 (Completed baseline)
- Class Management
- Deliverables:
  - Models: AcademicEnrollment, TeacherAssignment
  - Endpoints: academics/enrollments, bulk-promote, teacher-assignments
  - Frontend page: replace `/modules/academics/class-management` placeholder
  - Integration: align with Students enrollments and class capacity constraints

Phase 3 (Completed baseline)
- Gradebook
- Deliverables:
  - Models: GradingScheme, GradeBand, Assessment, AssessmentGrade, TermResult
  - Endpoints: grading-schemes, grade-bands, assessments, grades, term-results, publish/compute
  - Frontend page: implemented at `/modules/academics/gradebook`

Phase 4 (Completed baseline)
- Report Cards
- Deliverables:
  - Model: ReportCard
  - Endpoints: generate, approve, publish, distribute, pdf download
  - Frontend page: implemented at `/modules/academics/report-cards`

Phase 5 (Completed baseline)
- Homework & Assignments + Academic Calendar
- Deliverables:
  - Models: Assignment, AssignmentSubmission, CalendarEvent
  - Endpoints: assignments/submissions and calendar/export
  - Frontend pages: implemented at `/modules/academics/assignments` and `/modules/academics/calendar`

Phase 6 (Completed baseline)
- Academic Analytics
- Deliverables:
  - Endpoints: analytics summary, class-performance, subject-performance, at-risk, trends, student/teacher profiles
  - Frontend pages:
    - `/modules/academics/dashboard` (main module landing dashboard)
    - `/modules/academics/analytics` (student/teacher profile deep-dive)
  - Reports: CSV/PDF export parity with existing module export pattern

## Cross-Module Constraints

- Finance compatibility: continue using shared `AcademicYear` and `Term` IDs.
- Tenant isolation: all new endpoints must enforce module access + tenant schema.
- Documentation rule: update `docs/API_CONTRACTS.md`, `docs/MODULE_CONTRACTS.md`, and `sms_frontend/PROJECT_STATUS.md` in each phase PR.
