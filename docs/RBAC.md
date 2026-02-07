# RBAC Specification (Phase 1)

## Role Hierarchy
- Global Super Admin (platform owner, public schema)
- Tenant Super Admin (tenant owner, full access within tenant)
- Module Users (module-scoped access)

## Global Super Admin (Public Schema)
- Manages tenants and domains
- Issues tenant super admin credentials
- No access to tenant operational data

## Tenant Super Admin (Tenant Schema)
- Full system visibility within tenant
- Manages users, roles, and module assignments
- Can access main dashboard across all modules

## Module Users
- Access only assigned modules
- See only module-specific dashboards
- No access to cross-module summaries unless explicitly assigned

## Module Assignment (Per-User)
- Assignments are stored per user per tenant
- A user can have multiple module assignments
- Assignments are additive and do not change role

### User-Facing Endpoints
- GET /api/modules/mine/ returns the current user's active modules
- GET /api/module-assignments/mine/ returns the current user's assignments with metadata
- GET /api/dashboard/routing/ returns routing instructions after login
- GET /api/dashboard/summary/ returns aggregated, read-only module summaries

### Response Examples

GET /api/dashboard/routing/
```json
{
  "user": "john",
  "role": "ACCOUNTANT",
  "module_count": 1,
  "modules": [{"key": "FINANCE", "name": "Finance"}],
  "target": "MODULE",
  "target_module": "FINANCE"
}
```

GET /api/dashboard/summary/
```json
{
  "modules": ["FINANCE", "STUDENTS"],
  "modules_detail": [
    {"key": "FINANCE", "name": "Finance"},
    {"key": "STUDENTS", "name": "Students"}
  ],
  "unavailable_modules": ["ASSETS"],
  "summary": {
    "students": { "active": 420, "enrollments": 395 },
    "finance": {
      "revenue_billed": 1250000.0,
      "cash_collected": 980000.0,
      "total_expenses": 430000.0,
      "net_profit": 550000.0,
      "outstanding_receivables": 270000.0
    }
  }
}
```

### Module Key Map
- CORE: Core Administration
- STUDENTS: Students
- FINANCE: Finance
- ACADEMICS: Academics
- HR: Human Resources
- ASSETS: Assets and Inventory
- COMMUNICATION: Communication
- REPORTING: Reporting and Analytics

## Module Access Enforcement
- ViewSets declare a module_key (e.g., FINANCE, STUDENTS)
- Users must have active module assignment for that module
- ADMIN and TENANT_SUPER_ADMIN bypass module checks

## Permission Matrix (Initial)
- Global Super Admin: tenant management only
- Tenant Super Admin: all tenant modules
- ADMIN: full tenant access (current behavior)
- ACCOUNTANT: Finance module
- TEACHER: Students and Academics modules

## Permission Matrix (Quick Table)

Role | Core | Students | Finance | Academics | HR | Assets | Communication | Reporting
--- | --- | --- | --- | --- | --- | --- | --- | ---
Global Super Admin | No | No | No | No | No | No | No | No
Tenant Super Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes
ADMIN | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes
ACCOUNTANT | No | No | Yes | No | No | No | No | Yes
TEACHER | No | Yes | No | Yes | No | No | No | No

Note: This document defines intent. Enforcement is incremental and additive.
