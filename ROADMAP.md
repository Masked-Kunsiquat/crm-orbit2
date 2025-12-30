## Phase 0 — Repo & Guardrails (DO FIRST)

### 0.1 Create base folder structure

Create empty directories only:


/crm-core
/domains
/relations
/events
/reducers
/automerge
/views
/tests
/i18n

No logic yet.

---

### 0.2 Add `backend-agents.md`

- Place the finalized `backend-agents.md` at repo root
- This is authoritative
- Codex must be instructed to follow it strictly

---

### 0.3 Define shared primitives

Create a single file:


/crm-core/shared/types.ts

Include:
- `EntityId` type
- `Timestamp` type
- `DeviceId` type
- base `Entity` interface (id, createdAt, updatedAt)

**Nothing domain-specific yet.**

---

## Phase 1 — Event System (Foundation)

> Everything depends on this. Do not touch domains or persistence first.

### 1.1 Define Event type

File:

/crm-core/events/event.ts

Define:
```ts
Event {
  id
  type
  entityId?
  payload
  timestamp
  deviceId
}

No logic. Types only.

1.2 Define event registry
File:
/crm-core/events/eventTypes.ts


Export a union of allowed event type strings
No reducers yet
No localization yet


1.3 Add i18n event key mapping
File:
/crm-core/i18n/events.ts


Map event types → translation keys
No Weblate wiring, just structure


1.4 Write event validation helper
File:
/crm-core/events/validateEvent.ts


Ensure:

event type is known
timestamp exists
payload is serializable


Throw on invalid input


Phase 2 — Automerge Core (Before Any Domain)

State engine must exist before defining what lives in it.

2.1 Define Automerge document shape (empty)
File:
/crm-core/automerge/schema.ts

Define:
AutomergeDoc {
  organizations: {}
  accounts: {}
  contacts: {}
  notes: {}
  interactions: {}
  relations: {
    accountContacts: {}
    noteLinks: {}
  }
}

Use maps keyed by ID.

2.2 Initialize Automerge document
File:
/crm-core/automerge/init.ts


Create new doc with empty collections
No persistence
No sync


2.3 Apply reducer wrapper
File:
/crm-core/automerge/applyEvent.ts

Responsibilities:

Accept (doc, event)
Route to correct reducer
Return updated doc

No side effects.

Phase 3 — Domain Definitions (Types Only)

No reducers yet. No persistence yet.

3.1 Organizations
File:
/crm-core/domains/organization.ts

Define:

Organization interface
allowed statuses (as i18n keys)


3.2 Accounts
File:
/crm-core/domains/account.ts

Define:

Account
organizationId reference


3.3 Contacts
File:
/crm-core/domains/contact.ts

Define:

contact types (keys)
email/phone method structures


3.4 Notes
File:
/crm-core/domains/note.ts

Define:

user-entered text fields
createdAt


3.5 Interactions
File:
/crm-core/domains/interaction.ts

Define:

interaction types (keys)
summary


3.6 Relations
Files:
/crm-core/relations/accountContact.ts
/crm-core/relations/noteLink.ts

Define only interfaces.

Phase 4 — Reducers (Ordered by Dependency)

Reducers mutate Automerge state.
Write tests immediately for each reducer.


4.1 Organization reducers
Events:

organization.created
organization.status.updated

Files:
/crm-core/reducers/organization.reducer.ts
/tests/organization.reducer.test.ts

Organizations must exist before accounts.

4.2 Account reducers
Events:

account.created
account.status.updated

Validate:

organization exists

Files:
/crm-core/reducers/account.reducer.ts
/tests/account.reducer.test.ts


4.3 Contact reducers
Events:

contact.created
contact.method.added
contact.method.updated

Files:
/crm-core/reducers/contact.reducer.ts
/tests/contact.reducer.test.ts


4.4 Account ↔ Contact relation reducers
Events:

account.contact.linked
account.contact.setPrimary
account.contact.unsetPrimary

Validate:

account exists
contact exists
single primary per role if enforced

Files:
/crm-core/reducers/accountContact.reducer.ts
/tests/accountContact.reducer.test.ts


4.5 Note reducers
Events:

note.created
note.updated

Files:
/crm-core/reducers/note.reducer.ts
/tests/note.reducer.test.ts


4.6 Note link reducers
Events:

note.linked
note.unlinked

Validate:

entity exists

Files:
/crm-core/reducers/noteLink.reducer.ts
/tests/noteLink.reducer.test.ts


4.7 Interaction reducers
Events:

interaction.logged

Files:
/crm-core/reducers/interaction.reducer.ts
/tests/interaction.reducer.test.ts


Phase 5 — Persistence (Drizzle)

Persistence comes AFTER reducers are stable.

5.1 Drizzle schema
Tables:

automerge_snapshots
event_log

File:
/crm-core/persistence/schema.ts

Order matters:

event_log first
snapshots second


5.2 Persistence adapter
File:
/crm-core/persistence/store.ts

Responsibilities:

save snapshot
load snapshot
append events

No business logic.

Phase 6 — Views / Selectors

Read-only projections. No mutation.

6.1 Timeline views
Files:
/crm-core/views/timeline.ts

Implement:

timeline by entity
includes events + notes + interactions


6.2 Convenience selectors
Examples:

getPrimaryContacts(accountId)
getNotesForEntity(entityType, entityId)


Phase 7 — Sync Prep (Local Only)

No networking yet.

7.1 Merge testing utilities

Simulate divergent docs
Merge via Automerge
Assert invariants


Phase 8 — Hardening & Documentation

Add invariant documentation
Add reducer behavior notes
Add “how to add a new domain” guide


Codex Usage Guidance
Feed Codex:

One phase at a time
Include relevant folder context
Include backend-agents.md
Reject any output that:

skips events
stores localized strings
mutates state outside reducers




Final Reminder

If you feel tempted to “just store it” or “infer it later”,
stop and redesign.

This backend exists so the UI never has to.

---
