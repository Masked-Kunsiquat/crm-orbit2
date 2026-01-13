# Agent instructions (scope: CRMOrbit/types/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/types/` and subdirectories.
- **Key concern:** shared TypeScript types across domains, events, reducers, and views.

## Conventions
- **No runtime logic:** keep this directory type-only.
- **Prefer domain types:** reuse `CRMOrbit/domains/` types before adding new ones.
- **Stable exports:** avoid churn in shared types; update consumers deliberately.
