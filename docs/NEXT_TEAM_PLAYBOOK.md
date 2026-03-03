# Next Team Playbook

This is the preferred operational guide for continuing development with minimal avoidable errors.

## 1. Read Order (Do Not Skip)

1. `docs/INDEX.md`
2. `docs/NEXT_DEV_TEAM_MASTER_HANDOFF.md`
3. `docs/GO_LIVE_HANDOFF_2026-03-03.md`
4. `ARCHITECTURE.md`
5. `MODULE_BOUNDARIES.md`
6. `docs/API_CONTRACTS.md`
7. `docs/PRODUCTION_ENV_LOCK_CHECKLIST.md`
8. `docs/SECRET_ROTATION_AND_STORAGE_RUNBOOK.md`
9. `sms_frontend/PROJECT_STATUS.md`
10. `docs/PLATFORM_SUPER_ADMIN_RUNBOOK.md`

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

Platform/public APIs:
- Login and platform endpoints are served from `config.public_urls`.
- Do not force tenant header for `/api/platform/*` calls.
- Before production deployment, complete `docs/PRODUCTION_ENV_LOCK_CHECKLIST.md`.
- Complete secret rotation and secure storage cutover using `docs/SECRET_ROTATION_AND_STORAGE_RUNBOOK.md`.

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
- Production-handoff status updates: `docs/GO_LIVE_HANDOFF_2026-03-03.md` (or dated successor)

## 6. Pre-Handoff Checklist

- Backend and frontend run with tenant context.
- Changed endpoints verified manually (request + response shape).
- Project status updated with what changed and what remains.
- Risks and assumptions explicitly listed (no hidden tribal knowledge).

## 7. Platform Operations Baseline

- Step 4 support/impersonation/monitoring scaffolds are active in public schema.
- Action persistence is DB-backed via `clients.PlatformActionLog`.
- Query logs with `GET /api/platform/action-logs/` during verification and incident response.
- Super Admin UI routes are available at:
  - `/platform/login`
  - `/platform`, `/platform/tenants`, `/platform/support`, `/platform/impersonation`, `/platform/monitoring`, `/platform/action-logs`
