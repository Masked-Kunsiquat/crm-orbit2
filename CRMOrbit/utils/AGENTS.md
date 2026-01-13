# Agent instructions (scope: CRMOrbit/utils/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/utils/` and subdirectories.
- **Key areas:** shared helpers, logging, encryption, formatting utilities.

## Conventions
- **Pure helpers by default:** avoid side effects unless the utility is explicitly for that purpose (e.g., logging, crypto).
- **Locale-neutral outputs:** do not return localized strings; UI handles localization.
- **No domain mutations:** utilities should not mutate Automerge state or emit events.

## Do not
- Bypass logging conventions; use the shared logger utility.
