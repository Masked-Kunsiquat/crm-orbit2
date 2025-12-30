# Backend Agents Guide — Offline-First CRM

## Role of the Agent

You are acting as a **backend implementation agent** for an offline-first CRM.

Your job is **not** to design product features or UI.
Your job is to implement a **deterministic, testable, event-driven backend core**
that makes future UI development boring and fast.

You must follow this document exactly.

---

## Non-Negotiable Principles

1. **Automerge is the source of truth**
2. **Events express intent, not UI gestures**
3. **Reducers are pure and deterministic**
4. **Persistence is dumb**
5. **Views are read-only**
6. **No implicit ownership**
7. **History must be human-readable**
8. **All persisted data is locale-neutral**

If a shortcut violates any of the above, do not take it.

---

## Technology Stack (Authoritative)

- Expo (runtime only)
- **Automerge** — canonical state engine
- **Event log** — semantic history
- **Drizzle ORM** — persistence only
- **Zustand** — read-only projections (later)
- SQLite (local)
- Weblate (localization tooling; UI-only)

---

## Layer Responsibilities (DO NOT BLUR THESE)

### Automerge
- Owns canonical state
- Handles merges across devices
- Receives mutations only via reducers

Automerge does **not**:
- Explain meaning
- Provide audit history
- Interpret user intent
- Store translated strings

---

### Event Log
- Append-only
- Human-readable semantics
- Locale-neutral
- Emitted before reducer execution
- Never inferred from state diffs

Events explain **why** something changed — not how it was displayed.

---

### Reducers
- Pure functions
- `(state, event) → newState`
- Deterministic
- Side-effect free
- Enforce invariants

Reducers:
- Apply Automerge changes
- Never emit events
- Never touch persistence
- Never depend on UI or language

---

### Drizzle ORM
- Stores Automerge snapshots
- Stores event log
- Handles migrations

Drizzle must **never**:
- Enforce business rules
- Mutate domain state
- Infer history
- Generate meaning
- Store translated strings

Think of it as a filing cabinet.

---

### Zustand (Future)
- Subscribes to Automerge changes
- Exposes selectors/views
- Memoizes derived data

Zustand must **never**:
- Mutate domain state
- Apply business logic
- Emit events directly
- Localize strings

---

## Repository Structure (Must Match)


/crm-core
/domains
/relations
/events
/reducers
/automerge
/views
/tests
/i18n

Do not collapse folders.  
Do not cross-import improperly.

---

## Domain Model (v1 — MVP Scope)

### Organization
```ts
Organization {
  id
  name
  status   // i18n key
  metadata
}
```
### Account
```ts
Account {
  id
  organizationId
  name
  status   // i18n key
  metadata
}
```

### Contact
```ts
Contact {
  id
  type    // i18n key ("contact.type.internal", etc)
  name
  methods: {
    emails: [{ value, label, status }]   // label/status are keys
    phones: [{ value, label, status }]
  }
}
```

### Note
```ts
Note {
  id
  title        // user-entered or generated once
  body         // user-entered
  createdAt
}
```

### Interaction
```ts 
Interaction {
  id
  type        // i18n key
  occurredAt
  summary     // user-entered
}
```

### Relationships (Explicit Only)
```ts
Account ↔ Contact
AccountContact {
  accountId
  contactId
  role        // i18n key
  isPrimary
}
```
```ts
Note Links (Generic)
NoteLink {
  noteId
  entityType
  entityId
}
```

No nesting.
No implicit ownership.
Everything is linked.

### Event System (Critical)
Event Shape
```ts
Event {
  id
  type        // semantic identifier, NOT text
  entityId?
  payload     // raw data only
  timestamp
  deviceId
}
```

Rules

Append-only
Never edited
Never deleted
Must be meaningful to humans after localization

Examples
```
contact.created
contact.method.added
account.contact.setPrimary
note.created
note.linked
interaction.logged
```

🚫 Do not emit:
```
field.updated
state.changed
localized messages
```

Reducer Rules (Strict)
Reducers must:

Validate invariants
Fail loudly on invalid events
Be independently unit-testable

Reducers must not:

Read from persistence
Write to persistence
Access UI state
Access i18n
Generate localized output


History & Undo Model

History is rendered from events
Events are locale-neutral
Undo = compensating event
No state rewinds
No time travel hacks

Example:
account.contact.primaryUnset


Internationalization (Weblate)
Core Rules

All persisted data must be locale-neutral
No translated strings may appear in:

Automerge documents
Event logs
Reducers
Persistence layer



Translation Keys

Statuses, roles, types, enums, and system states are stored as keys
Keys are resolved in UI via i18n/Weblate
Keys must be stable once released

Example (correct):
status: "account.status.active"

Example (incorrect):
status: "Active"


Events & Localization
Events must be semantic, not textual.
❌ Incorrect:
payload: { message: "Primary contact updated" }

✅ Correct:
type: "account.contact.setPrimary"
payload: { accountId, contactId }

UI responsibility:
t("events.account.contact.setPrimary", { contactName })


User-Entered Content

Notes, names, summaries are never translated
Weblate must never touch user data
Stored text remains unchanged forever


i18n Mapping Layer
An explicit mapping must exist:
/i18n
  enums.ts
  events.ts

Example:
export const EVENT_I18N_KEYS = {
  "account.contact.setPrimary": "events.account.contact.setPrimary"
}


Sync Assumptions (v1)

Single user
Multiple devices
No server required
Automerge handles merges
Events merged by (timestamp + deviceId)

Do not assume:

Real-time presence
Permissions
Multi-user conflict UI


Testing Requirements
Mandatory

Reducer unit tests
Invariant enforcement tests
Event → state snapshot tests

Optional

Merge simulations
Divergent device tests

If logic is not testable without UI or i18n, it is wrong.

Explicit Non-Goals (Do Not Implement)

Floors / tenants / spatial modeling
Multi-user permissions
Server APIs
Role-based access
AI summaries
Localization of stored data

Design must allow these later — but do not implement now.

Architectural Smells (Stop If You See These)

“Let’s just store this string”
“We can localize it later”
“We can infer this from the DB”
“Let’s skip the event”
“We’ll clean it up after UI”

These are project killers.

Final Rule

The backend exists to make the UI boring.

If a design choice makes backend stricter but UI faster,
that is correct.
If a design choice leaks UI or localization concerns into backend state,
it is wrong.
Implement accordingly.

