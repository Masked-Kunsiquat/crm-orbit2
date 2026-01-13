# Agent instructions (scope: CRMOrbit/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/` and all subdirectories.
- **Key directories:** `automerge/`, `domains/`, `events/`, `reducers/`, `relations/`, `views/`, `i18n/`, `tests/`, `utils/`, `types/`, `scripts/`, `eslint-rules/`.
- **Backend core:** `domains/`, `events/`, `reducers/`, `automerge/`.

## Commands
- **Install:** `npm install`
- **Dev:** `npm run start`, `npm run ios`, `npm run android`, `npm run web`
- **Test:** `npm run test`, `npm run test:watch`
- **Lint:** `npm run lint`
- **Typecheck:** `npx tsc -p tsconfig.json --noEmit`

## Conventions (Audit Pass A + backend contract)
- **Views do not import reducers:** use action hooks from `views/hooks/` (see `standardization/AUDIT_PASS_A_CONVENTIONS.md`).
- **No explicit `any`:** use navigation types from `views/navigation/types.ts`.
- **Locale-neutral persistence:** store i18n keys in state and events; update `i18n/enums.ts` and `i18n/events.ts` for new enums/events.
- **Reducers are pure:** no persistence, no i18n, no event emission.
- **Events are semantic:** append-only, emitted before reducers, never inferred from state diffs.

## Common pitfalls
- Do not store localized strings in Automerge or event payloads.
- Do not bypass ESLint restrictions; update `eslint-rules/` if the rule set needs to change.

## Links to scoped instructions
- `CRMOrbit/domains/AGENTS.md`
- `CRMOrbit/events/AGENTS.md`
- `CRMOrbit/reducers/AGENTS.md`
- `CRMOrbit/views/AGENTS.md`
- `CRMOrbit/i18n/AGENTS.md`
- `CRMOrbit/eslint-rules/AGENTS.md`
