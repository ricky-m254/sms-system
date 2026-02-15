## System Invariants (Must Never Break)

- Multi-tenant SaaS (schema-based)
- Finance data is immutable once posted
- No silent fallbacks in production
- Backend is source of truth
- Frontend NEVER invents business rules
- IDs are never client-generated
- All writes are validated server-side

## Technology Stack

Backend:
- Django + DRF
- PostgreSQL (schema per tenant)
- JWT auth

Frontend:
- React + TypeScript
- Axios
- API adapter layer

## Forbidden Actions

- Adding fields to frontend without backend support
- Adding backend fields without migration
- Writing directly to finance tables
- Mocking production endpoints
