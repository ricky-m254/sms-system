# Presentation Demo Runbook

Date: 2026-02-27
Owner: Engineering
Scope: Item 4 finalization gate

## Objective

Run a deterministic live demo that proves tenant isolation, RBAC boundaries, academic lifecycle controls, and finance integrity with clear fallback behavior if an environment issue appears during presentation.

## Pre-Demo Readiness Checklist

- [ ] Backend starts successfully in tenant-aware mode.
- [ ] Frontend builds and serves.
- [ ] Demo tenant exists and is active (`demo_school`).
- [ ] Demo users exist for required roles:
  - Tenant Super Admin
  - Admin/Deputy
  - Teacher
  - Accountant
  - Parent
- [ ] Seed data exists for:
  - Academic year and terms
  - Grade levels and classes
  - At least one enrolled student with guardian
  - At least one fee structure, invoice, payment, and expense

## Live Demo Script (Strict Order)

1. Tenant Resolution + Auth
- Log in as Tenant Super Admin using tenant context (`X-Tenant-ID` or tenant domain).
- Show that module routing and data are tenant-scoped.

2. Academic Backbone Enforcement
- Open academics structure.
- Verify order dependency: year -> term -> grade -> class.
- Attempt a downstream action before dependency exists and show explicit rejection.

3. Student Lifecycle Control
- Walk one student from admissions decision to enrollment and class assignment.
- Confirm single student identity is reused across modules.

4. RBAC Boundary Proof
- Teacher role:
  - Allowed: attendance/grade actions in assigned class.
  - Denied: finance pages/actions.
- Accountant role:
  - Allowed: finance operations.
  - Denied: academic write actions.
- Parent role:
  - Allowed: own-child records and fee view/payment.
  - Denied: other-student access.

5. Finance Integrity Proof
- Create invoice and show immutable behavior after issuance.
- Record payment and show allocation order (oldest outstanding first).
- Close accounting period and demonstrate blocked finance mutation.
- Show reversal/approval flow with proper approver role.

6. Promotion/Graduation Constraints
- Attempt invalid promotion path (skip grade) and show rejection.
- Show valid year-end progression behavior.
- Show graduation marks student inactive while preserving history.

## Required Screenshots for Deck

Capture and attach these before presentation:

1. Login with tenant context visible.
2. Dashboard module cards for role-specific routing.
3. Academics structure page with year/term/grade/class configured.
4. Student profile showing admissions/enrollment linkage.
5. Teacher denied finance access response.
6. Accountant denied academics write response.
7. Invoice detail with immutable status.
8. Closed-period mutation denial message.
9. Parent portal child-scoped view.
10. Test evidence summary (pass counts).

## Fallback Plan (If Live Environment Fails)

1. Use pre-captured screenshots in the exact script order.
2. Use recorded command outputs from evidence bundle to prove gate checks.
3. If API temporarily unavailable:
- show latest successful test matrix output
- show architecture audit output
- continue explanation from screenshots
4. Do not bypass controls or use mocked permission responses.

## Pass/Fail Exit Criteria

- PASS only if all demo script steps execute or are backed by pre-captured evidence from latest validated build.
- FAIL if any RBAC denial, tenant isolation assertion, or finance closure rule cannot be demonstrated.
