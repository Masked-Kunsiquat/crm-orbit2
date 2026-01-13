# Agent instructions (scope: CRMOrbit/events/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/events/` and subdirectories.
- **Key files:** `event.ts`, `eventTypes.ts`, `dispatcher.ts`, `ordering.ts`, `validateEvent.ts`.

## Conventions
- **Semantic events only:** type is intent-focused, payload is raw data only.
- **Locale-neutral:** no translated strings in types or payloads.
- **Append-only history:** events are emitted before reducers and never inferred from state diffs.
- **Ordering rule:** timestamp + deviceId; do not change without migration/testing.
- **i18n mapping:** add new event types to `CRMOrbit/i18n/events.ts`.

## Do not
- Add reducer logic or persistence concerns here.
