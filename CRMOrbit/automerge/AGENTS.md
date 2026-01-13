# Agent instructions (scope: CRMOrbit/automerge/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/automerge/` and subdirectories.
- **Key concern:** canonical document state and merge behavior.

## Conventions
- **Automerge is source of truth:** mutations only via reducers.
- **Locale-neutral data:** no translated strings in documents.
- **Deterministic updates:** avoid side effects and non-deterministic merges.

## Do not
- Emit events or apply business rules here.
