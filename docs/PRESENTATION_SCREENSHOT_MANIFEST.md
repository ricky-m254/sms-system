# Presentation Screenshot Manifest

Date: 2026-02-27
Purpose: Final closure artifact for presentation screenshot evidence.
Evidence directory: `docs/presentation_evidence/screenshots`

## Required Files (Strict)

1. `01-login-tenant-context.png`
- Proof: Login with tenant context visible.

2. `02-dashboard-role-routing.png`
- Proof: Role-scoped dashboard module routing.

3. `03-academics-structure-backbone.png`
- Proof: Academic year -> term -> grade -> class setup state.

4. `04-student-lifecycle-linkage.png`
- Proof: Admissions to enrollment/student profile linkage.

5. `05-teacher-finance-denied.png`
- Proof: Teacher blocked from finance access.

6. `06-accountant-academics-denied.png`
- Proof: Accountant blocked from academics write.

7. `07-invoice-immutability.png`
- Proof: Issued invoice immutable behavior.

8. `08-closed-period-mutation-denied.png`
- Proof: Closed accounting period mutation denial.

9. `09-parent-child-scope.png`
- Proof: Parent portal restricted to own child.

10. `10-test-evidence-summary.png`
- Proof: Test pass summary (`69/69 OK` or latest valid run).

## Capture Status

- [ ] `01-login-tenant-context.png`
- [ ] `02-dashboard-role-routing.png`
- [ ] `03-academics-structure-backbone.png`
- [ ] `04-student-lifecycle-linkage.png`
- [ ] `05-teacher-finance-denied.png`
- [ ] `06-accountant-academics-denied.png`
- [ ] `07-invoice-immutability.png`
- [ ] `08-closed-period-mutation-denied.png`
- [ ] `09-parent-child-scope.png`
- [ ] `10-test-evidence-summary.png`

## Validation Command

Run:

`powershell -ExecutionPolicy Bypass -File docs/validate_presentation_evidence.ps1`

Exit code:
- `0` => all required screenshots present
- `1` => one or more required screenshots missing
