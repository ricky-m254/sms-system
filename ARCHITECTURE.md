# Student Management System (SMS) – Architectural Vision & System Behavior

## 1. System Overview

The system is designed as a cloud-based, multi-tenant School Management System (SMS) built using a modular architecture. Each functional area of the system operates as a standalone module, while a central dashboard layer provides aggregated visibility based on user permissions.

The system prioritizes:
- Scalability
- Clear separation of concerns
- Role-based access control
- Future extensibility without refactoring core logic

## 2. High-Level Architectural Philosophy

### Core Principle

Each module owns its data and business logic. Modules never directly depend on each other’s internal logic.

Inter-module interaction is achieved through:
- Shared identifiers (e.g. tenant_id, student_id, user_id)
- Controlled data exposure (read-only summaries or events)

This prevents tight coupling and allows modules to evolve independently.

## 3. Tenant-Based Multi-Tenancy Model

The system is strictly tenant-isolated.

### Global Layer (System Owner)

A single Global Super Admin (platform owner).

Responsibilities:
- Manually create tenants (schools)
- Issue tenant-level super admin credentials
- Enable or disable tenants

No access to tenant operational data.

### Tenant Layer (School)

Each tenant represents one school and contains:
- School identity and branding
- Academic configuration
- Users, roles, and permissions
- All operational modules

All data is scoped by tenant_id at every level.

## 4. Module Architecture

Each module is implemented as an independent Django app with:
- Its own models
- Its own business rules
- Its own API endpoints
- Its own dashboard UI

Core modules in the initial scope:
- Core Administration
- Students
- Finance
- Academics
- Human Resources
- Assets and Inventory
- Communication
- Reporting and Analytics

Modules do not import models from each other.

## 5. Dashboard Design and User Experience

### Main Dashboard (Aggregation Layer)

The Main Dashboard exists purely as a visibility and summary layer.

It:
- Displays high-level metrics across modules
- Reflects only the modules a user is permitted to access
- Contains no CRUD operations
- Contains no business logic

It functions by requesting summary data from each permitted module.

### Module Dashboards

Each module provides:
- Its own dedicated dashboard
- Full control of workflows within that module
- Independent navigation and permissions

Users interact with module dashboards, not the main dashboard, for actual work.

## 6. Login and Dashboard Routing Logic

On user authentication:
1. The system identifies assigned modules and permission level.
2. Routing decision:
- Single-module user is redirected directly to that module’s dashboard.
- Multi-module user is shown the main dashboard with aggregated summaries.

This ensures:
- Focused UX for operational users
- Executive-level visibility for supervisory users

## 7. Finance Module – Scope and Dependencies

The Finance Module is designed as a self-contained financial system responsible for all school financial operations.

Finance responsibilities:
- Fee structures
- Student billing
- Payments and receipting
- Reconciliation
- Expense tracking
- Financial reporting and audit trails

### Finance Dependencies (Data Only)

Required:
- Core Administration: tenant identity, academic year and terms, currency and policies
- Students Module: student_id, enrollment status, class or grade reference

Optional or future:
- Academics (fee mapping by class or stream)
- Human Resources (staff payments, payroll)
- Assets and Inventory (expense linkage)

Finance never:
- Admits students
- Modifies student academic data
- Manages authentication

## 8. Student to Finance Workflow

Student admission occurs strictly within the Students Module.

Workflow:
1. Student is admitted in Students Module.
2. A unique student_id is created.
3. Finance module becomes aware of the student via reference.
4. A finance-authorized user applies fee structures and billing rules.

This separation ensures:
- Proper financial controls
- No accidental billing
- Real-world workflow alignment

## 9. User Roles and Permissions

### Role Hierarchy

- Global Super Admin
- Tenant Super Admin
- Module-Level Users

### Tenant Super Admin Capabilities

- Full system visibility
- Manage users, roles, and permissions
- Configure school settings
- Upload branding assets
- Access main dashboard across all modules

### Module Users

- Access only assigned modules
- See only module-specific dashboards
- No access to global summaries unless explicitly permitted

## 10. Permissions and Access Control

Permissions are enforced at:
- API level
- Module level
- Dashboard level

No user can:
- Access a module they are not assigned
- View cross-module data without permission
- Bypass tenant isolation

## 11. Extensibility and Future Safety

This architecture supports:
- Adding new modules without breaking existing ones
- Replacing or upgrading modules independently
- Introducing event-based communication later (e.g., signals, message queues)
- Frontend redesign without backend refactor

## 12. System Look and Feel (UX Intent)

The system should feel:
- Professional
- Clear
- Purpose-driven

Users should:
- Land exactly where they are meant to work
- Never be overwhelmed by irrelevant data
- Clearly understand boundaries of responsibility

## Final Note

This system is intentionally designed to mirror real institutional workflows, not just CRUD screens. The architecture emphasizes control, accountability, and long-term scalability over shortcuts.
