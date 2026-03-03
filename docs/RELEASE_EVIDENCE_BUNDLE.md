# Release Evidence Bundle

Date: 2026-02-27 02:16:06 +03:00
Commit: `2351102`
Scope: Item 5 execution record

## Command Evidence

1. Backend consolidated gate matrix
- Command:
  - `python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 -v 1 --keepdb --noinput`
- Result:
  - `Found 69 test(s).`
  - `Ran 69 tests in 300.448s`
  - `OK`

2. Frontend production build
- Command:
  - `npm run build` (from `sms_frontend`)
- Result:
  - `vite v7.3.1 building client environment for production...`
  - `1139 modules transformed.`
  - `built in 48.59s`

3. Migration hygiene
- Command:
  - `python manage.py makemigrations --check --dry-run`
- Result:
  - `No changes detected`

## Strict Gate Matrix (Pass/Fail with Test Evidence)

1. PASS - Setup-order enforcement
- Evidence:
  - `test_setup_order_enforcement_invoice_requires_complete_dependencies`
  - `test_setup_order_enforced_before_enrollment`

2. PASS - Object-level access per role
- Evidence:
  - `test_role_boundary_teacher_cannot_access_finance`
  - `test_role_boundary_accountant_cannot_access_behavior`
  - `test_parent_scope_children_access_is_explicit_child_only`
  - `test_teacher_only_assigned_class_scope_for_assessments`
  - `test_admin_and_tenant_super_admin_finance_access_allowed`
  - `test_accountant_denied_academics_write`

3. PASS - Cross-module trigger-only boundary guard
- Evidence:
  - `test_critical_modules_do_not_directly_write_foreign_module_data`

4. PASS - Closed-period finance mutation denial
- Evidence:
  - `test_closed_accounting_period_denies_invoice_posting`
  - `test_closed_period_denies_payment_posting`
  - `test_closed_period_denies_adjustment_approval`

5. PASS - Promotion and graduation constraints
- Evidence:
  - `test_promotion_constraints_no_grade_skip`
  - `test_graduated_student_becomes_inactive_and_read_only`

6. PASS - Multi-tenant isolation (same IDs, no cross-read/write)
- Evidence:
  - `test_multi_tenant_isolation_same_identifier_no_cross_leakage`
  - `test_cross_tenant_write_isolation`
  - `test_platform_admin_without_tenant_role_cannot_access_tenant_data`

7. PASS - Finance integrity lifecycle
- Evidence:
  - `test_invoice_immutability_update_denied`
  - `test_auto_allocate_oldest_outstanding_invoice_first`
  - `test_payment_reversal_approval_rolls_back_allocations`

8. PASS - Integrated lifecycle scenario
- Evidence:
  - `test_integrated_lifecycle_admissions_to_finance_to_promotion`

## Residual Risk Signoff

1. Closed risk: Presentation screenshot pack captured and validated.
- Evidence:
  - `docs/presentation_evidence/screenshots/*` (10 required files)
  - `powershell -ExecutionPolicy Bypass -File docs/validate_presentation_evidence.ps1` => `STATUS: PASS`

2. Open risk: Full penetration testing beyond automated suites is not included in this execution artifact.
- Impact: Security assurance is strong for covered invariants, but not equivalent to a dedicated security test engagement.
- Mitigation: run separate penetration test cycle if production security certification is required.
