# Agent instructions (scope: CRMOrbit/tests/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/tests/` and subdirectories.
- **Key focus:** reducer unit tests, invariants, and event -> state snapshots.

## Conventions
- **Deterministic tests:** avoid time/network dependencies; prefer fixed timestamps/IDs.
- **Event-driven coverage:** test by emitting events and validating resulting state.
- **Invariants first:** add failure-case tests alongside happy paths.

## Do not
- Depend on UI or i18n resolution inside tests.
