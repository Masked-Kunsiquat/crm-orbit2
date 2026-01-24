# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRM Orbit is a mobile-first, offline-first CRM application built with React Native/Expo. It uses Automerge as the canonical state engine for multi-device sync without a server.

## Commands

All commands run from `CRMOrbit/`:

```bash
npm install              # Install dependencies
npm run start            # Start Expo dev server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in browser
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Run ESLint
npx tsc -p tsconfig.json --noEmit  # Type check
```

Run a single test file:
```bash
npm run test -- tests/account.reducer.test.ts
```

## Architecture

### Layer Responsibilities (Do Not Blur)

| Layer | Owns | Must Never |
|-------|------|------------|
| **Automerge** (`automerge/`) | Canonical state, merges across devices | Store translated strings, interpret intent |
| **Events** (`events/`) | Append-only semantic history, emitted before reducers | Contain localized messages, be edited/deleted |
| **Reducers** (`reducers/`) | Pure `(state, event) → newState` transformations | Touch persistence, emit events, access i18n |
| **Domains** (`domains/`) | Type definitions, business logic utilities | Import from views or reducers |
| **Views** (`views/`) | UI components, read-only projections | Mutate domain state, import reducers directly |
| **Zustand** (`views/store/`) | Read-only state subscriptions, selectors | Mutate state, apply business logic |

### Import Restrictions (ESLint Enforced)

- **Views cannot import reducers** — use action hooks from `views/hooks/` (e.g., `useContactActions`, `useAccountActions`)
- **Domains cannot import from views or reducers**
- **Reducers cannot import from views**

### Data Flow

```
User Action → Event emitted → Reducer applies to Automerge → Zustand notifies views
```

Events express semantic intent (`contact.created`, `account.contact.setPrimary`), not UI gestures.

### Path Aliases (tsconfig.json)

```
@views/*      → views/*
@domains/*    → domains/*
@events/*     → events/*
@reducers/*   → reducers/*
@automerge/*  → automerge/*
@i18n/*       → i18n/*
@utils/*      → utils/*
@tests/*      → tests/*
```

## Key Conventions

### Locale-Neutral Persistence

All persisted data (Automerge, events) stores i18n keys, never translated strings:
- ✅ `status: "account.status.active"`
- ❌ `status: "Active"`

When adding new enums or events, update:
- `i18n/enums.ts` — enum key mappings
- `i18n/events.ts` — event type i18n keys

### Theme Colors

No hardcoded colors in views. Use theme tokens via `useTheme` hook or `@domains/shared/theme/colors`.

### Custom ESLint Rules

Located in `eslint-rules/`, configured in `eslint.config.mjs`:
- `local/no-duplicate-helpers` — prevents duplicated utility functions
- `local/enforce-i18n-validation` — ensures i18n compliance
- `local/enforce-form-screen-pattern` — form screen consistency
- `local/enforce-action-hook-pattern` — action hook usage patterns

## Testing

Tests live in `CRMOrbit/tests/`. Focus areas:
- Reducer unit tests (pure function testing)
- Invariant enforcement tests
- Event → state snapshot tests

## Scoped AGENTS.md Files

Subdirectories have their own `AGENTS.md` with specific instructions:
- `CRMOrbit/AGENTS.md` — app-level conventions
- `CRMOrbit/automerge/AGENTS.md`
- `CRMOrbit/domains/AGENTS.md`
- `CRMOrbit/events/AGENTS.md`
- `CRMOrbit/reducers/AGENTS.md`
- `CRMOrbit/views/AGENTS.md`
- `CRMOrbit/i18n/AGENTS.md`
- `CRMOrbit/tests/AGENTS.md`
- `CRMOrbit/eslint-rules/AGENTS.md`
