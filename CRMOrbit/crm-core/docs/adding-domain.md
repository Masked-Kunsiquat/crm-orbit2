# Adding a Domain

Follow these steps to add a new domain without breaking invariants.

1) Define types
- Add the domain interface in `crm-core/domains/`.
- Use locale-neutral i18n keys for statuses, roles, and types.
- Extend the base Entity when appropriate.

2) Add relationships (if needed)
- Define explicit relation interfaces in `crm-core/relations/`.
- Avoid implicit ownership or nesting.

3) Update Automerge schema
- Add an ID-keyed map for the new domain in `crm-core/automerge/schema.ts`.

4) Define events
- Add event type strings to `crm-core/events/eventTypes.ts`.
- Add i18n keys in `crm-core/i18n/events.ts`.
- Keep payloads raw and locale-neutral.

5) Implement reducers
- Create a reducer in `crm-core/reducers/`.
- Enforce invariants and throw on invalid events.
- Do not emit events or touch persistence.

6) Register reducers
- Call `registerReducer` or `registerReducers` during app initialization.
- Ensure registration happens before any `applyEvent` calls.

7) Add tests
- Add unit tests in `tests/` for success and failure cases.
- Include invariant enforcement tests.

8) Add views/selectors (optional)
- Add read-only projections in `crm-core/views/`.
- No mutation, no localization, no UI state.
