# Model Relocation Plan (Phase 5+)

This plan migrates models from `school` into their dedicated module apps without breaking APIs.

## Principles
- Additive only
- Preserve old endpoints
- Keep data in place during pilot (unmanaged wrappers)
- Migrate one module at a time

## Steps (Per Module)
1. Add unmanaged wrapper models in target app (done for Academics, HR, Communication, Reporting)
2. Move read-only endpoints to target app (done)
3. Create serializers in target app (done for HR, Communication, Reporting)
4. Add CRUD endpoints in target app (done for HR, Communication, Reporting)
5. Deprecate school-level endpoints (future)
6. Move model definitions into the module app and create migrations
7. Swap db_table to new module table names (optional if table renaming desired)
8. Remove school-level model usage and update imports

## Full Relocation (Beyond Safe Alias)
When we are ready to move beyond safe-alias:
1. Create new module tables (e.g., academics_academicyear)
2. Add data migration scripts per tenant schema
3. Switch code to new module tables
4. Freeze old tables or keep read-only for rollback

## Current Status
- Academics: wrappers + ref endpoints + safe-alias (imports moved)
- HR: wrappers + ref + CRUD + safe-alias (imports moved)
- Communication: wrappers + ref + CRUD + safe-alias (imports moved)
- Reporting: wrappers + ref + read-only + safe-alias (imports moved)
- Assets: placeholder only

## Safe-Alias Completion Checklist
1. Unmanaged wrapper models in module app
2. Module app endpoints wired (ref + CRUD as needed)
3. Imports in codebase updated to module app models
4. Tests updated to use module app models
5. Docs updated to mark module as source of truth

## Risks
- Migration ordering across tenant schemas
- Admin site registrations
- Third-party integrations depending on old endpoints
