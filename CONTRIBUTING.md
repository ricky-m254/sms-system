# Contributing (Architectural Guardrails)

These rules protect Phase 0 stability while we evolve the system.

## Non-Breaking Policy
- Additive changes only.
- Do not remove or rename existing endpoints without an explicit deprecation plan.
- Do not delete or rename existing models or fields.
 - Treat docs/API_CONTRACTS.md as frozen unless versioned.

## Module Isolation Rules
- New modules must be standalone Django apps.
- Do not import models across modules.
- Inter-module interaction must use IDs and read-only summary endpoints.

## Tenant Safety
- Do not bypass or weaken django_tenants schema routing.

## Auth Stability
- Keep JWT login flow stable.
- New roles and assignments must be additive.

## Migration Safety
- Only forward-safe migrations.
- No destructive schema changes.

## Documentation Safety (Mandatory)
- Every behavior change PR must update documentation in the same PR.
- API changes: `docs/API_CONTRACTS.md`
- Module contract changes: `docs/MODULE_CONTRACTS.md`
- Runtime status/risks: `sms_frontend/PROJECT_STATUS.md`
- Handoff/read-order updates: `docs/INDEX.md` and `docs/GO_LIVE_HANDOFF_2026-03-03.md` (or dated successor)
