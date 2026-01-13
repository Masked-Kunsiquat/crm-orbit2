# Agent instructions (scope: CRMOrbit/reducers/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/reducers/` and subdirectories.
- **Key files:** `*.reducer.ts`, `registry.ts`, `shared.ts`.

## Conventions
- **Pure reducers:** `(state, event) -> newState`, deterministic and side-effect free.
- **Validate invariants:** fail loudly on invalid events.
- **No persistence or i18n:** reducers do not emit events, touch storage, or localize strings.
- **Use domain types:** prefer types from `CRMOrbit/domains/`.

## Testing
- Add/update reducer unit tests in `CRMOrbit/tests/` (e.g. `*.reducer.test.ts`).
- Prefer event -> state snapshot tests for new event coverage.
