# Module Boundaries (Target Map)

## Current Reality
The school app is a monolith containing Students, Academics, Finance, HR, Communication, Roles, and Audit models.
Evidence: sms_backend/school/models.py

## Target Module Boundaries

1. Core Administration
- SchoolProfile
- Role
- UserProfile

2. Students
- Student
- Guardian
- Enrollment

3. Academics
- AcademicYear
- Term
- SchoolClass

4. Finance
- FeeStructure
- Invoice
- InvoiceLineItem
- Payment
- PaymentAllocation
- Expense
- FeeAssignment
- InvoiceAdjustment
- AuditLog

5. Human Resources
- Staff

6. Communication
- Message

## Migration Strategy (Non-Breaking)

1. Do not move existing models yet.
2. Introduce new module apps for new functionality.
3. Keep existing endpoints stable.
4. Add module-level summary endpoints for dashboard aggregation.
5. Gradually route new features into their correct module apps.
