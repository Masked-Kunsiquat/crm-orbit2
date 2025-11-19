# Agent Handbook

> Start here before making any changes. This summarizes the repo state and the key reference docs you should use while working in this project.

## Project orientation
- **App root**: `test-fresh/` (React Native + Expo).
- **Primary references**: `CLAUDE.md` (full technical overview), `docs/` (migration plans, audits, localization notes), `README.md` (setup + scripts).
- **Other agent guides**: `test-fresh/src/services/AGENTS.md` (services), `test-fresh/src/database/AGENTS.md` (database schema/order).
- **Status**: All helper migrations completed; services layer marked production-ready.

## Architecture snapshot (from `CLAUDE.md`)
- Layered stack: UI (screens/components) → Hooks/Context → Services → Database → SQLite adapter.
- Major tech: React Native 0.81, Expo SDK 54, React 19.1, React Navigation 7, TanStack Query 5, React Native Paper (MD3), expo-sqlite async API, i18next with 5 locales, SecureStore/AsyncStorage, LocalAuthentication.
- Core modules: 31 database files (factory pattern + migrations), 8 services (auth/file/notification ready; backup optional), rich error handling utilities, helper libraries for validation, strings, SQL building, arrays, permissions, files, contacts.

## Error handling & logging
- Prefer centralized utilities in `test-fresh/src/errors`:
  - `logger` replaces `console.*`.
  - `withErrorHandling()` to wrap async logic; `handleError`/`showAlert` for UI-safe messaging.
  - Use `DatabaseError` / `ServiceError` / `UIError` / `ValidationError` as appropriate.
- Migration guidance and patterns: `docs/ERROR-MIGRATION-PLAN.md`.

## Helper patterns (audit complete)
- Duplicate patterns have helpers; do not reintroduce manual implementations.
- Key helpers (see `docs/AUDIT-RESULTS.md` for impact):
  - Validation: `src/utils/validators.js` (type checks + `validateRequired`, etc.).
  - Strings: `src/utils/stringHelpers.js` (normalize/safe trim, capitalize, truncate).
  - SQL: `src/database/sqlHelpers.js` (placeholders, pick, buildUpdateSet/Insert).
  - Contacts: `src/utils/contactHelpers.js` (display names, initials, phone normalize/format).
  - Arrays: `src/utils/arrayHelpers.js` (chunk, unique, uniqueBy).
  - Files & permissions: `src/utils/fileHelpers.js`, `src/utils/permissionHelpers.js`.
  - Query helpers: `src/hooks/queries/queryHelpers.js` (invalidateQueries, createMutationHandlers).

## Services layer notes
- See `test-fresh/src/services/AGENTS.md` for module-by-module status and expected behaviors.
- Auth: PIN + biometric with brute-force protections and auto-lock.
- File: attachment lifecycle, thumbnailing, MIME validation, orphan cleanup.
- Notification: reminders, quiet hours, recurring support, normalized datetimes.
- Backup: optional/not implemented for MVP.

## Database layer notes
- Uses async expo-sqlite adapter with execute/batch/transaction helpers.
- Migrations live in `src/database/migrations/` with registry/runner helpers.
- Entity modules follow factory pattern; prefer existing CRUD helpers and validation utilities.

## UI & i18n
- UI built with React Native Paper (MD3); screens and components under `src/screens` and `src/components`.
- Localization via i18next; locales in `src/locales/` (en, es, fr, de, zh-Hans). Check `docs/LOCALIZATION-*` for coverage/analysis.
- When adding text, wire into i18n keys rather than hardcoding strings.

## Testing & QA
- Primary commands (run from `test-fresh/`): `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run i18n:check`.
- Use existing Jest setup (`jest.setup.js`); tests colocated in `__tests__` directories or alongside modules.

## Working guidelines for agents
- Operate inside `test-fresh/` unless explicitly needed elsewhere.
- Prefer existing helpers/utilities before adding new ones; maintain consistency with migration patterns.
- Keep error handling centralized; avoid raw `console.*` or ad-hoc try/catch unless wrapped with helpers.
- Align with MD3 UI patterns and TanStack Query conventions already in hooks.
- Reference the docs in `docs/` and `CLAUDE.md` for context, and update this file if project-wide conventions change.
