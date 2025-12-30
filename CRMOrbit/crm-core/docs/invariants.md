# Invariants

These invariants must hold across all reducers, tests, and persistence.

- Events are the source of intent; state changes only via reducers.
- Event type must be registered and validated before reducer execution.
- Event payloads are locale-neutral and JSON-serializable.
- Entity ids are unique per collection and never reused.
- Account must reference an existing organization.
- AccountContact links require existing account and contact.
- AccountContact enforces at most one primary per account+role.
- NoteLink requires existing note and existing target entity.
- No implicit ownership; relationships are explicit links only.
- Timestamps are stored as locale-neutral strings.
- Persistence stores snapshots and event log only; no business logic.
