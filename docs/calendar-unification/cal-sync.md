# Calendar Sync (Phase 7) — Expo Calendar Integration

## Summary
This document defines the Phase 7 calendar sync model for CRMOrbit. It covers a single external calendar selection, audit-focused import, two-way sync for linked events, account matching rules, and the required data model + event changes. It is designed to keep Automerge as the source of truth while allowing the device calendar to be the user’s day-to-day UI.

## Audience
Backend and app engineers working on Phase 7 calendar sync, plus reviewers who need to validate scope and invariants.

## Goals
- Allow the user to select **one external calendar** for sync.
- Import **audit events** from the external calendar using exact title matching.
- Support **two-way sync for linked events** (external edits reflect in CRM, CRM edits reflect externally).
- Keep internal state and event logs locale-neutral and deterministic.

## Non-goals (Phase 7)
- Multiple external calendars
- Regex-based matching
- Automatic import of non-audit events (meetings, calls, etc.)
- Multi-user conflict UI

---

## Phase 7 Implementation Plan

### Phase 7.1 — Permissions + Single Calendar Selection
- Request calendar permissions and enforce a single selected calendar.
- Store `selectedExternalCalendarId` in device-local settings (not Automerge).
- UI: selection screen + state restore on app start.
 - Code: `views/utils` AsyncStorage helpers, `views/hooks` selection hook, settings UI wiring.

### Phase 7.2 — Account Match Schema + Migration (Option B)
- Add `Account.calendarMatch` typed field.
- Migration: default to undefined, optionally backfill aliases from account name.
- Reducers + events to update match aliases (if exposed in UI).
 - Code: Automerge schema + reducer updates + migration tests.

### Phase 7.3 — External Link Model + Events
- Add `CalendarEventExternalLink` persistence + (optional) Automerge mirror.
- Introduce new semantic events: `calendarEvent.externalLinked`, `externalImported`, `externalUpdated`, `externalUnlinked` (optional).
- Update i18n mappings for new events.
 - Code: Drizzle schema + event builders + reducers + i18n mapping.

### Phase 7.4 — Import Scan + Audit Matching Flow
- Scan selected calendar for candidates (60 past / 180 future).
- Exact-title match against account aliases; infer and prefill repeat audits.
- Batch import UI with confirmation; append `crmOrbitId:<calendarEventId>` marker on import.
 - Code: import service + review UI + alias inference helper.

### Phase 7.5 — Two-Way Sync for Linked Events
- External → CRM: translate edits to semantic events (reschedule/update).
- CRM → External: update title/time/notes and append audit completion details.
- Sync only for linked events; avoid touching unrelated external events.
 - Code: sync worker + external event diffing + audit completion formatter.

### Phase 7.6 — Test + Verification
- Reducer tests for new events + link behaviors.
- Import mapping tests (exact match, alias inference).
- Sync tests for external edits → CRM updates.
- Snapshot tests for migration compatibility.
 - Code: tests in `CRMOrbit/tests` + migration fixture updates.

---

## Core Principles (Must Hold)
- Automerge is the source of truth.
- Event log is append-only and semantic.
- No localized strings persisted in Automerge or event logs.
- External calendar identifiers are **device-local** and must not be merged across devices.

---

## UX Flow Overview

### 1) Permissions + Single Calendar Selection
- Request calendar permissions using `expo-calendar`.
- Present a list of calendars from `getCalendarsAsync` and require selection of **exactly one**.
- Store `selectedExternalCalendarId` in **device-local settings** (not Automerge).

### 2) Initial Scan (Audits Only)
- Scan a time window: **60 days past, 180 days future**.
- Filter external events by **exact title match** to account names or account aliases (see Account Matching below).

### 3) Import Review (Batch)
- Present candidates in a review flow (one by one or batched list).
- Auto-prefill account if a previous import already mapped that title.
- On confirm, create an internal calendar event and link it to the external event.
- Add a marker to the external event description for future linkage:
  - `crmOrbitId:<calendarEventId>`

### 4) Ongoing Sync
- Two-way sync **only for linked events**.
- External edits update CRM (emit semantic events).
- CRM edits update the external event title/time/notes.

---

## Account Matching (Option B — Typed Field)

### Account schema addition
```ts
Account {
  ...
  calendarMatch?: {
    mode: "exact";
    aliases: string[]; // exact title matches
  };
}
```

### Matching rules
- Exact string equality only.
- Default aliases list includes:
  - `account.name`
  - `Audit - ${account.name}`
- When a user confirms an import for a new title, append that title to `aliases`.

This avoids regex complexity while still covering naming variants.

---

## External Link Model

### Purpose
Track linked external events so two-way sync can be deterministic.

### Proposed structure (relation or table)
```ts
CalendarEventExternalLink {
  calendarEventId: EntityId;
  provider: "expo-calendar";
  calendarId: string; // device calendar id
  externalEventId: string;
  lastSyncedAt?: Timestamp;
  lastExternalModifiedAt?: Timestamp;
}
```

### Storage rules
- Link records are persisted via Drizzle and mirrored in Automerge as needed for app views.
- `calendarId` and `externalEventId` are device-local; merging across devices should be handled by conflict-aware sync logic.
- External identifiers stay in the local link table (not the event log) to avoid cross-device leakage.

---

## Event Model (New Events)
Events must remain semantic and locale-neutral. Example new event types:

- `calendarEvent.externalLinked`
  - payload: `{ linkId, calendarEventId, provider }`
- `calendarEvent.externalImported`
  - payload: `{ linkId, calendarEventId, provider }`
- `calendarEvent.externalUpdated`
  - payload: `{ calendarEventId, provider }`
- `calendarEvent.externalUnlinked` (optional)
  - payload: `{ linkId, calendarEventId?, provider? }`

Add to `CRMOrbit/i18n/events.ts` for display mapping.

---

## Sync Rules

### External → CRM
- Only apply to **linked events**.
- If the external event contains `crmOrbitId:<calendarEventId>`, it is eligible.
- Compare external event data to CRM event:
  - Time changes → emit `calendarEvent.rescheduled` or equivalent.
  - Summary/description/location changes → emit `calendarEvent.updated`.
- If both sides changed since last sync, prefer **CRM** or require manual review (tbd).

### CRM → External
- Only for linked events.
- Updates title/time/notes on the external event.
- For audit completion, append audit details to external description (score/floors). This is a sync-layer format, not persisted internally.

---

## Import Inference (Repeat Audits)
To reduce clicks for recurring audits:
- When a title match already maps to an account, prefill that account in the import UI.
- Use prior imports from the scan window or existing link records.
- User confirms once; the alias is saved for future exact matches.

---

## Device Calendar Selection (Single Calendar)
- Single calendar selection is enforced in Phase 7.
- Sync/import operate **only** on that selected calendar.
- Future support for multiple calendars should be additive, not implicit.

---

## Permissions and Platform Notes (expo-calendar)
- Use `expo-calendar` for permissions and calendar/event access.
- iOS requires `NSCalendarsUsageDescription` (and optional reminders if needed).
- Android requires `READ_CALENDAR` and `WRITE_CALENDAR` permissions.
- See `expo-calendar.md` for API details and config plugin options.

---

## Migration Plan (Option B)
1) Add `Account.calendarMatch` to Automerge schema.
2) Update persistence loader to default missing `calendarMatch` to `undefined`.
3) Add reducer support for new account updates.
4) Backfill aliases for existing accounts (optional, via migration event or on first sync).

---

## Testing Requirements
- Reducer tests for new external link events.
- Import mapping tests (exact title match + alias behavior).
- Sync tests for external edits → CRM updates.
- Snapshot tests for migration compatibility.

---

## Open Questions
- Conflict resolution when both external and CRM change between syncs.
- Whether import flow should allow non-audit event types in Phase 7.
- Whether to expose alias management in UI or keep it implicit from imports.
