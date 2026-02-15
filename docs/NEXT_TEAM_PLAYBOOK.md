# Next Team Playbook

This is the preferred operational guide for continuing development with minimal avoidable errors.

## 1. Read Order (Do Not Skip)

1. `docs/INDEX.md`
2. `ARCHITECTURE.md`
3. `MODULE_BOUNDARIES.md`
4. `docs/API_CONTRACTS.md`
5. `sms_frontend/PROJECT_STATUS.md`

## 2. Current Priority Module

Primary active module: **Finance**

Key integration dependencies:
- Students profile and guardian context
- Enrollment class/term context
- Academics reference endpoints

## 3. Environment Guardrails

- Use tenant-aligned local setup:
  - Domain: `demo.localhost`
  - Schema: `demo_school`
  - Admin: `admin/admin123`
- For authenticated API calls, always include:
  - `Authorization: Bearer <token>`
  - `X-Tenant-ID: <schema_name>`

## 4. Known High-Risk Areas

1. Finance endpoint mutability assumptions
- Invoices are create-only by design.
- Payments do not expose edit endpoints.

2. Documentation/implementation drift
- Some status docs may become stale after rapid iteration.

3. Limited test coverage outside `school`
- Most app-level tests in module apps are placeholders.

## 5. Required Documentation Updates Per Change

Update these files in the same PR whenever relevant:
- Endpoint contract changes: `docs/API_CONTRACTS.md`
- Module ref contract changes: `docs/MODULE_CONTRACTS.md`
- Implementation status and risk notes: `sms_frontend/PROJECT_STATUS.md`
- New docs or file moves: `docs/INDEX.md`

## 6. Pre-Handoff Checklist

- Backend and frontend run with tenant context.
- Changed endpoints verified manually (request + response shape).
- Project status updated with what changed and what remains.
- Risks and assumptions explicitly listed (no hidden tribal knowledge).
