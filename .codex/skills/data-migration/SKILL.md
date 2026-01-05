---
name: data-migration
description: Plan and implement CRM Orbit data migrations for Automerge snapshots and Drizzle persistence, including schema additions, event payload changes, and backfills. Use when adding/removing fields, changing persisted structures, or introducing new events that require compatibility or data backfill.
---

# Data Migration

## Overview

Implement safe, deterministic migrations for CRM Orbit local persistence
(Drizzle/SQLite) and Automerge snapshots while preserving event-log semantics.

## Workflow

1) Classify the change
- Schema-only (Drizzle table changes, snapshot fields)
- Event payload change (new fields required)
- Backfill required (existing data needs derived values)

2) Update persistence
- Add Drizzle migrations for new columns/tables.
- Update persistence loader/serializer to accept old shapes and default new fields.

3) Preserve snapshot compatibility
- If snapshot format changes, add versioned handling in load path.
- Keep encoding/decoding boundary locale-neutral.

4) Backfill via events
- Emit migration events or deterministic backfill logic in reducers.
- Never mutate state directly or infer history from diffs.

5) Verify
- Add/update reducer tests and persistence loader tests.
- Add event->state snapshot tests for migration paths.

## Guardrails

- Automerge is source of truth.
- Event log is append-only and human-readable.
- Reducers remain pure and deterministic.
- Persistence remains dumb (no business rules).
- Persisted data stays locale-neutral.

## Common files

- `CRMOrbit/automerge/schema.ts`
- `CRMOrbit/domains/persistence/*`
- `CRMOrbit/events/*`, `CRMOrbit/reducers/*`
- `CRMOrbit/tests/*`
