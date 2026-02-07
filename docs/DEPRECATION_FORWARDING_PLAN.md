# Deprecation and Forwarding Plan

This plan explains how we will keep legacy endpoints stable while transitioning to module apps.

## Goals
- No breaking changes for clients
- Provide clear replacement endpoints
- Allow gradual migration

## Strategy
1. Keep legacy endpoints in `school` active
2. Add module endpoints in new apps
3. Document preferred endpoints in contracts
4. Add deprecation warnings in responses (in place)
5. Remove legacy endpoints only after a long deprecation window

## Current Preferred Endpoints

### HR
- Preferred: /api/hr/staff/
- Legacy: /api/staff/

### Communication
- Preferred: /api/communication/messages/
- Legacy: /api/messages/

### Reporting
- Preferred: /api/reporting/audit-logs/
- Legacy: N/A (no legacy list endpoint exposed)

### Academics
- Preferred: /api/academics/ref/...
- Legacy: /api/finance/terms/ and other school endpoints still exist

## Forwarding (Future)
- Optional HTTP 301 or 308 responses for GET-only legacy endpoints
- Server-side proxy forwarding (read-only) when needed

## Current Warnings
- /api/staff/ returns `Warning: 299 - Deprecated; use /api/hr/staff/`
- /api/messages/ returns `Warning: 299 - Deprecated; use /api/communication/messages/`
