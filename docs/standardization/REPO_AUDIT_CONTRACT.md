# Repo Audit Contract: CRMOrbit (expo-crm)

## Document Authority
This contract defines the **observed patterns, conventions, and boundaries** in the CRMOrbit codebase. All audit findings MUST be evaluated against these standards. This is a living document derived from:
- Active code patterns (as of commit 9bb169b)
- Configuration files (tsconfig.json, eslint.config.mjs, package.json, app.json)
- Custom ESLint rules (enforce-form-screen-pattern, enforce-action-hook-pattern, enforce-i18n-validation, no-duplicate-helpers)
- Documentation (domains/actions/README.md, utils/LOGGING.md)

---

## A) NAMING CONVENTIONS

### Files & Directories

#### File Naming Patterns (OBSERVED)

**Components (React/TSX):**
- Pattern: `PascalCase.tsx`
- Examples: `FormScreenLayout.tsx`, `TimelineSection.tsx`, `ContactCardRow.tsx`, `FloatingActionButton.tsx`
- Location: `views/components/`

**Screens (React/TSX):**
- Pattern: `EntityNameScreen.tsx` or `EntityNameOperationScreen.tsx`
- Examples: `AccountFormScreen.tsx`, `ContactDetailScreen.tsx`, `OrganizationsLandingScreen.tsx`, `BackupSettingsScreen.tsx`
- Location: `views/screens/{domain}/`
- Sub-pattern: Screens are organized in domain folders (accounts/, contacts/, settings/, etc.)

**Hooks:**
- Pattern: `use{Purpose}.ts` or `use{Entity}Actions.ts`
- Examples: `useDispatch.ts`, `useAccountActions.ts`, `useContactImport.ts`, `useTheme.ts`
- Location: `views/hooks/`
- Action hooks MUST follow pattern: `use{Entity}Actions.ts`

**Domain Models:**
- Pattern: `entityName.ts` (lowercase with optional `.utils.ts` suffix)
- Examples: `account.ts`, `contact.ts`, `organization.ts`, `account.utils.ts`, `contact.utils.ts`
- Location: `domains/`

**Reducers:**
- Pattern: `entityName.reducer.ts` or `relationName.reducer.ts`
- Examples: `account.reducer.ts`, `contact.reducer.ts`, `accountContact.reducer.ts`, `entityLink.reducer.ts`
- Location: `reducers/`
- Registry: `reducers/registry.ts` (central registration)

**Events:**
- Pattern: `descriptiveName.ts`
- Examples: `event.ts`, `dispatcher.ts`, `validateEvent.ts`, `eventTypes.ts`
- Location: `events/`

**Utilities:**
- Pattern: `descriptiveName.ts`
- Examples: `logger.ts`, `encryption.ts`, `imageStorage.ts`
- Location: `utils/`

**i18n:**
- Pattern: `{locale}.json` for translations, `descriptiveName.ts` for helpers
- Examples: `en.json`, `de.json`, `es.json`, `fr.json`, `zh-Hans.json`, `backupLabels.ts`, `events.ts`
- Location: `i18n/`

**Tests:**
- Pattern: `entityName.test.ts` or `featureName.test.ts`
- Examples: `accountContact.reducer.test.ts`
- Location: `tests/` or `__tests__/`

**Configuration:**
- Pattern: `descriptiveName.config.{js,mjs,ts}` or standard names
- Examples: `eslint.config.mjs`, `tsconfig.json`, `package.json`, `app.json`
- Location: Root of CRMOrbit/

#### Folder Structure (OBSERVED)

```
CRMOrbit/
├── views/                      # View layer (UI components, screens, hooks)
│   ├── components/            # Reusable UI components (PascalCase.tsx)
│   ├── hooks/                 # React hooks (useSomething.ts)
│   ├── navigation/            # Navigation config & stacks
│   ├── screens/               # Screen components organized by domain
│   │   ├── accounts/
│   │   ├── contacts/
│   │   ├── organizations/
│   │   ├── notes/
│   │   ├── audits/
│   │   ├── interactions/
│   │   ├── codes/
│   │   ├── settings/
│   │   ├── calendar/
│   │   ├── events/
│   │   └── misc/
│   ├── store/                 # Zustand store (store.ts)
│   ├── timeline/              # Timeline utilities
│   └── utils/                 # View-specific utilities
│
├── domains/                   # Domain layer (business logic, models)
│   ├── {entity}.ts           # Domain models (account.ts, contact.ts, etc.)
│   ├── {entity}.utils.ts     # Domain utilities
│   ├── actions/              # Event builder utilities
│   ├── migrations/           # Data migrations
│   ├── persistence/          # Database, storage, backups
│   ├── relations/            # Relation models (accountContact, entityLink)
│   ├── shared/               # Shared domain utilities
│   │   ├── types.ts
│   │   ├── idGenerator.ts
│   │   └── theme/
│   └── sync/                 # Sync orchestration (WebRTC, QR, etc.)
│
├── reducers/                  # Reducer layer (event handlers)
│   ├── {entity}.reducer.ts   # Entity reducers
│   ├── registry.ts           # Reducer registration map
│   └── shared.ts             # Shared reducer utilities
│
├── events/                    # Event infrastructure
│   ├── event.ts              # Event type definition
│   ├── eventTypes.ts         # EventType union
│   ├── dispatcher.ts         # Event dispatch & registration
│   └── validateEvent.ts      # Event validation
│
├── automerge/                 # Automerge/CRDT integration
│   ├── schema.ts             # AutomergeDoc schema
│   ├── applyEvent.ts         # Event application logic
│   └── init.ts
│
├── i18n/                      # Internationalization
│   ├── {locale}.json         # Translation files
│   ├── index.ts              # i18n API
│   ├── backupLabels.ts
│   ├── events.ts
│   └── glossary/             # Translation glossaries (.tbx)
│
├── utils/                     # Cross-cutting utilities
│   ├── logger.ts             # Logging utility
│   ├── encryption.ts
│   ├── imageStorage.ts
│   └── LOGGING.md
│
├── tests/                     # Test files
│   └── {feature}.test.ts
│
├── eslint-rules/              # Custom ESLint rules
│   ├── index.js
│   └── rules/
│       ├── enforce-action-hook-pattern.js
│       ├── enforce-form-screen-pattern.js
│       ├── enforce-i18n-validation.js
│       └── no-duplicate-helpers.js
│
├── assets/                    # Static assets (icons, images)
│   └── icons/
│
├── App.tsx                    # Root component
├── index.ts                   # Entry point
├── tsconfig.json
├── eslint.config.mjs
├── package.json
└── app.json                   # Expo configuration
```

### Code Naming Patterns (OBSERVED)

#### Types & Interfaces

**Interfaces:**
- Pattern: `PascalCase` with descriptive names
- Examples: `Account`, `Contact`, `Organization`, `Note`, `Interaction`, `Audit`, `Code`
- Entity interfaces extend `Entity` base: `export interface Account extends Entity`
- Complex structures: `AccountAddresses`, `ContactMethods`, `SocialMediaLinks`

**Type Aliases:**
- Pattern: `PascalCase` for branded strings, unions
- Examples: `EntityId`, `Timestamp`, `DeviceId`, `AccountStatus`, `ContactType`
- Enums are string literal unions: `type AccountStatus = "account.status.active" | "account.status.inactive"`

**Generic Types:**
- Pattern: Single capital letter or descriptive `PascalCase`
- Examples: `T`, `TEntity`, `BuildEventInput`, `DispatchResult<T>`

#### Constants

**All-caps constants:**
- Pattern: `SCREAMING_SNAKE_CASE`
- Examples: `REDUCER_MAP`, `DEFAULT_SETTINGS`, `DEFAULT_ACCOUNT_AUDIT_FREQUENCY`
- Location: Typically at module level or in `.utils.ts` files

**Configuration objects:**
- Pattern: `camelCase` for mutable, `SCREAMING_SNAKE_CASE` for frozen
- Examples: `globalConfig` (mutable), `LOG_LEVEL_PRIORITY` (frozen map)

#### Functions & Methods

**Functions:**
- Pattern: `camelCase`, verb-first for actions
- Examples: `createLogger`, `buildEvent`, `applyEvents`, `nextId`, `formatMessage`
- Pure functions: `resolveEntityId`, `serializeArgs`, `shouldLog`

**Hook functions:**
- Pattern: `use{Purpose}` in PascalCase
- Examples: `useDispatch`, `useAccountActions`, `useTheme`, `useOrganizations`
- Action hooks: `use{Entity}Actions` (MUST accept `deviceId: string` parameter per ESLint rule)

**Event handlers (React):**
- Pattern: `handle{Action}` in camelCase
- Examples: `handleSave`, `handleDelete`, `handleOrganizationPress`

**Reducer functions:**
- Pattern: `apply{EventName}` for internal helpers, `{entity}Reducer` for exported
- Examples: `applyAccountCreated`, `applyContactDeleted`, `accountReducer`, `contactReducer`

#### Variables

**Local variables:**
- Pattern: `camelCase`
- Examples: `deviceId`, `accountId`, `organizations`, `isLoading`

**Private/internal:**
- Pattern: Prefix with `__internal_` for export boundary control
- Examples: `__internal_getCrmStore`, `__internal_updateCrmDoc`
- Purpose: Signals "trusted internal use only, not part of public API"

**Unused parameters:**
- Pattern: Prefix with `_` to indicate intentionally unused
- Examples: `_previousAccount`, `_isDirty`
- ESLint configured: `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_" }]`

**Boolean flags:**
- Pattern: `is{State}`, `has{Property}`, `should{Action}`
- Examples: `isLoading`, `hasDeviceIdParam`, `shouldLog`, `useSameForParking`

---

## B) LAYERING & ARCHITECTURE EXPECTATIONS

### Layer Definitions (EXPLICIT)

The codebase enforces a **4-layer architecture** with strict import boundaries:

```
┌──────────────────────────────────────────────────────────┐
│ VIEWS LAYER (views/)                                      │
│ - React components, screens, hooks                        │
│ - Navigation                                              │
│ - UI state management (Zustand store)                    │
│ - CANNOT import from: reducers/                          │
│ - CAN import from: domains/, events/, i18n/, utils/      │
└──────────────────────────────────────────────────────────┘
                           │
                           ├───> Dispatches events
                           │
┌──────────────────────────────────────────────────────────┐
│ EVENTS LAYER (events/)                                    │
│ - Event definitions & types                               │
│ - Event dispatcher & builder                              │
│ - Event validation                                        │
│ - CANNOT import from: views/, reducers/                  │
│ - CAN import from: domains/, utils/                      │
└──────────────────────────────────────────────────────────┘
                           │
                           ├───> Applies to doc via reducers
                           │
┌──────────────────────────────────────────────────────────┐
│ REDUCERS LAYER (reducers/)                               │
│ - Pure event handlers                                     │
│ - State transformation logic                              │
│ - CANNOT import from: views/                             │
│ - CAN import from: domains/, events/, automerge/, utils/ │
└──────────────────────────────────────────────────────────┘
                           │
                           ├───> Modifies
                           │
┌──────────────────────────────────────────────────────────┐
│ DOMAINS LAYER (domains/)                                  │
│ - Business models & types                                 │
│ - Domain logic & utilities                                │
│ - Persistence (database, backup, migrations)              │
│ - CANNOT import from: views/, reducers/                  │
│ - CAN import from: events/ (only types), utils/          │
│ - Framework-agnostic (no React dependencies)              │
└──────────────────────────────────────────────────────────┘
```

### Import Rules (ENFORCED BY ESLINT)

**Rule 1: Views CANNOT import from Reducers**
```typescript
// ❌ VIOLATION
// File: views/screens/AccountFormScreen.tsx
import { accountReducer } from "../../reducers/account.reducer";

// ✅ CORRECT
// File: views/screens/AccountFormScreen.tsx
import { useAccountActions } from "../../hooks/useAccountActions";
```
*Rationale: Views should use hooks (e.g., useContactActions) instead of directly importing reducers. This maintains proper separation of concerns.*

**Rule 2: Domains CANNOT import from Views or Reducers**
```typescript
// ❌ VIOLATION
// File: domains/account.utils.ts
import { useAccount } from "../views/store/store";
import { accountReducer } from "../reducers/account.reducer";

// ✅ CORRECT
// File: domains/account.utils.ts
import type { Account } from "./account";
import { DEFAULT_ACCOUNT_AUDIT_FREQUENCY } from "./account.utils";
```
*Rationale: Domain layer cannot import from views or reducers layers. Keep domain logic pure and framework-agnostic.*

**Rule 3: Reducers CANNOT import from Views**
```typescript
// ❌ VIOLATION
// File: reducers/contact.reducer.ts
import { useContact } from "../views/store/store";

// ✅ CORRECT
// File: reducers/contact.reducer.ts
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { Contact } from "../domains/contact";
```
*Rationale: Reducers cannot import from views layer. Reducers should be pure functions that only depend on domain models and events.*

### Cross-Layer Communication Patterns (OBSERVED)

**Pattern 1: View → Reducer (via Events)**
```typescript
// File: views/hooks/useAccountActions.ts
export const useAccountActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createAccount = useCallback((/* params */): DispatchResult => {
    const event = buildEvent({
      type: "account.created",
      entityId: id,
      payload: { /* ... */ },
      deviceId,
    });
    return dispatch([event]); // Event flows to reducer
  }, [deviceId, dispatch]);

  return { createAccount, /* ... */ };
};
```

**Pattern 2: View reads from Store (via Zustand selectors)**
```typescript
// File: views/store/store.ts
export const useAccount = (id: EntityId): Account | undefined =>
  crmStore(useShallow((state) => state.doc.accounts[id]));

// Usage in view:
const account = useAccount(accountId);
```

**Pattern 3: Domain utilities are pure**
```typescript
// File: domains/account.utils.ts
export const DEFAULT_ACCOUNT_AUDIT_FREQUENCY: AccountAuditFrequency =
  "account.auditFrequency.monthly";

export const calculateNextAuditDate = (
  lastAuditDate: Timestamp,
  frequency: AccountAuditFrequency
): Timestamp => {
  // Pure calculation, no side effects
};
```

### Module Boundaries (OBSERVED)

**Automerge Layer (automerge/):**
- Contains: CRDT schema, event application logic
- Purpose: Bridge between events and document state
- Imports from: domains/, events/, reducers/
- Special status: Not a "layer" per se, but infrastructure for event sourcing

**i18n Layer (i18n/):**
- Contains: Translation files, i18n API
- Purpose: Internationalization support
- Can be imported by: Any layer (views/, domains/, reducers/)
- Pattern: All user-facing strings MUST use `t()` function

**Utils Layer (utils/):**
- Contains: Cross-cutting utilities (logger, encryption, imageStorage)
- Purpose: Shared infrastructure
- Can be imported by: Any layer
- Special: `utils/logger.ts` is EXEMPT from no-console rule

---

## C) VIOLATION DEFINITIONS

### Severity Levels (DEFINED)

**P0: Correctness/Safety Issues**
- Security vulnerabilities (encryption, authentication, data exposure)
- Data loss risk (missing validation, unsafe deletions)
- Crash-inducing code (null pointer, type errors, unhandled exceptions)
- Import boundary violations caught by ESLint (views importing reducers, domains importing views)
- Missing i18n for user-facing validation messages (enforced by custom ESLint rule)

**P1: High-Leverage Maintainability Issues**
- Architecture violations not caught by ESLint (e.g., side effects in reducers)
- Duplication of domain logic across layers
- Missing type safety (explicit `any` usage when types are available)
- Inconsistent error handling patterns
- Direct console.log usage (violates ESLint rule, should use logger)
- Action hooks missing `deviceId` parameter (violates custom ESLint rule)
- Action hooks not returning `DispatchResult` (violates custom ESLint rule)
- Action functions not using `useCallback` (violates custom ESLint rule)

**P2: Opportunistic Improvements**
- Naming inconsistencies that don't affect functionality
- Missing JSDoc on public APIs
- Formatting violations (handled by Prettier)
- Unused variables not prefixed with `_` (handled by ESLint)
- Unused `_isDirty` state in form screens (violates custom ESLint rule)

### Violation Patterns (EXPLICIT)

**VIOLATION: Cross-layer leakage**
```typescript
// ❌ P0: View importing reducer directly
// File: views/screens/ContactFormScreen.tsx
import { contactReducer } from "../../reducers/contact.reducer";

// ❌ P0: Domain importing view logic
// File: domains/account.utils.ts
import { useAccount } from "../views/store/store";

// ❌ P0: Reducer importing view hook
// File: reducers/note.reducer.ts
import { useNote } from "../views/store/store";
```

**VIOLATION: Side effects in reducers**
```typescript
// ❌ P1: Reducer with side effects
export const accountReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AccountCreatedPayload;

  // ❌ Side effect: logging should be for debugging only, not business logic
  console.log("Creating account:", payload);

  // ❌ Side effect: should not make API calls
  await fetch("/api/accounts", { method: "POST", body: JSON.stringify(payload) });

  return { ...doc, accounts: { ...doc.accounts, [payload.id]: payload } };
};

// ✅ Correct: Pure reducer
export const accountReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AccountCreatedPayload;
  logger.debug("Creating account", { id: payload.id }); // Debug logging is acceptable
  return { ...doc, accounts: { ...doc.accounts, [payload.id]: payload } };
};
```

**VIOLATION: Hardcoded strings instead of i18n**
```typescript
// ❌ P1: Validation message not using i18n
Alert.alert("Error", "Name is required");

// ✅ Correct
Alert.alert(t("common.error"), t("contacts.validation.nameRequired"));
```

**VIOLATION: Direct console usage**
```typescript
// ❌ P1: Direct console.log (violates ESLint "no-console" rule)
console.log("User created:", userId);

// ✅ Correct: Use logger
const logger = createLogger("UserActions");
logger.info("User created", { userId });
```

**VIOLATION: Action hook missing deviceId parameter**
```typescript
// ❌ P1: Action hook hardcodes deviceId (violates custom ESLint rule)
export const useAccountActions = () => {
  const deviceId = "hardcoded-device-id"; // ❌
  const { dispatch } = useDispatch();
  // ...
};

// ✅ Correct
export const useAccountActions = (deviceId: string) => {
  const { dispatch } = useDispatch();
  // ...
};
```

**VIOLATION: Explicit `any` usage**
```typescript
// ❌ P1: Explicit any when type is available (violates ESLint "@typescript-eslint/no-explicit-any")
const payload: any = event.payload;

// ✅ Correct: Use proper typing
const payload = event.payload as AccountCreatedPayload;
// or
type AccountCreatedPayload = {
  id: EntityId;
  name: string;
  organizationId: EntityId;
};
const payload = event.payload as AccountCreatedPayload;
```

### Acceptable Variance (DEFINED)

**NOT A VIOLATION: Component organization preferences**
- Placing multiple related components in one file (e.g., `TextField` and `TextFieldProps` in `TextField.tsx`)
- Using index.ts for re-exports (e.g., `views/screens/accounts/index.ts`)
- Organizing screens by domain vs. flat structure (current: by domain, acceptable variance if consistent)

**NOT A VIOLATION: Styling approaches**
- Inline styles vs. StyleSheet.create() (both used in codebase)
- Different prop patterns for theme colors (e.g., `{ backgroundColor: colors.canvas }` vs. using styled components)

**NOT A VIOLATION: Comment density**
- Files with extensive JSDoc (e.g., `utils/logger.ts`) vs. minimal comments
- Rationale: Complexity warrants different levels of documentation

**NOT A VIOLATION: State management patterns**
- Using `useState` vs. `useReducer` in form screens (both acceptable)
- Using `useRef` for optimization (e.g., `cacheRef` in `views/store/store.ts`)

---

## D) CODE QUALITY STANDARDS

### Formatting & Linting (AUTOMATED)

**Prettier:**
- Configured: `eslint-plugin-prettier` with `eslint-config-prettier`
- Rule level: `"prettier/prettier": "warn"`
- Applies to: `**/*.{ts,tsx,js,jsx}`
- Scope: Formatting only (spaces, line breaks, quotes)

**ESLint:**
- Config: `eslint.config.mjs` (flat config format)
- Base: `@eslint/js` recommended + `@typescript-eslint` recommended
- Plugins: `eslint-plugin-react`, `eslint-plugin-react-native`, `eslint-plugin-react-hooks`, custom local rules
- Key rules:
  - `react/react-in-jsx-scope`: off (not needed in React 19)
  - `react/prop-types`: off (using TypeScript)
  - `@typescript-eslint/no-unused-vars`: error (with `argsIgnorePattern: "^_"`)
  - `@typescript-eslint/explicit-module-boundary-types`: off
  - `@typescript-eslint/no-explicit-any`: **error** (strict enforcement)
  - `no-console`: `["error", { allow: ["warn", "error"] }]` (allow warn/error, disallow log/info)
  - `react-hooks/rules-of-hooks`: error
  - `react-hooks/exhaustive-deps`: warn
  - Custom rules: `local/no-duplicate-helpers`, `local/enforce-i18n-validation`, `local/enforce-form-screen-pattern`, `local/enforce-action-hook-pattern`

**TypeScript:**
- Config: `tsconfig.json` extending `expo/tsconfig.base`
- `strict: true` (full strictness enabled)
- Path aliases:
  - `@views/*` → `views/*`
  - `@domains/*` → `domains/*`
  - `@events/*` → `events/*`
  - `@reducers/*` → `reducers/*`
  - `@automerge/*` → `automerge/*`
  - `@i18n/*` → `i18n/*`
  - `@utils/*` → `utils/*`
  - `@tests/*` → `tests/*`

### Error Handling Patterns (OBSERVED)

**Pattern 1: Try-catch with logging**
```typescript
// File: App.tsx
try {
  const persistenceDb = await initializeDatabase();
  // ... operations ...
} catch (err) {
  console.error("Failed to load data:", err);
  setError(err instanceof Error ? err.message : "Failed to load data");
}
```

**Pattern 2: Throwing with descriptive messages**
```typescript
// File: reducers/accountContact.reducer.ts
if (!doc.accounts[payload.accountId]) {
  logger.error("Account not found for linking", { accountId: payload.accountId });
  throw new Error(`Account not found: ${payload.accountId}`);
}
```

**Pattern 3: DispatchResult return type**
```typescript
// File: views/hooks/useDispatch.ts
export type DispatchResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Usage:
const result = dispatch(events);
if (result.success) {
  // Handle success
} else {
  Alert.alert(t("common.error"), result.error);
}
```

**Pattern 4: Alert for user-facing errors**
```typescript
// File: views/screens/ContactFormScreen.tsx
if (!firstName.trim() && !lastName.trim()) {
  Alert.alert(t("contacts.validation.nameRequired"));
  return;
}
```

### Logging Conventions (DOCUMENTED)

**Logger creation:**
```typescript
import { createLogger } from "@utils/logger";
const logger = createLogger("ModuleName");
```

**Log levels:**
- `logger.debug()`: Detailed debugging (only shown when `__DEV__` is true)
- `logger.info()`: General informational messages
- `logger.warn()`: Warnings about potential issues
- `logger.error()`: Errors that need attention

**Module naming:**
- Reducers: `"ContactReducer"`, `"AccountReducer"`
- Action hooks: `"ContactActions"`, `"NoteActions"`
- Screens: `"ContactFormScreen"`, `"NoteDetailScreen"`
- Services: `"DatabaseService"`, `"SyncService"`

**DO:**
- Create module-specific loggers: `const logger = createLogger("ModuleName");`
- Include context: `logger.info("User created", { userId, email });`
- Log errors with stack traces: `logger.error("Operation failed", error);`

**DON'T:**
- Use `console.log()` directly (violates ESLint rule)
- Log sensitive information (passwords, tokens)
- Log in tight loops
- Log every function call

### Type Safety Requirements (ENFORCED)

**Requirement 1: No explicit `any`**
```typescript
// ❌ Violation
const payload: any = event.payload;

// ✅ Correct
const payload = event.payload as AccountCreatedPayload;
```

**Requirement 2: Type event handlers**
```typescript
// File: reducers/account.reducer.ts
type AccountCreatedPayload = {
  id: EntityId;
  name: string;
  organizationId: EntityId;
  status: AccountStatus;
};

const applyAccountCreated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountCreatedPayload;
  // ...
};
```

**Requirement 3: Use type guards for discriminated unions**
```typescript
// File: views/store/store.ts
const selector = (state: CrmStoreState) =>
  Object.values(state.doc.audits).filter(
    (audit): audit is Audit => audit.accountId === accountId,
  );
```

**Requirement 4: Return types for action hooks**
```typescript
// File: views/hooks/useAccountActions.ts
export const useAccountActions = (deviceId: string) => {
  const createAccount = useCallback(
    (/* params */): DispatchResult => { // ✅ Explicit return type
      // ...
    },
    [deviceId, dispatch],
  );

  return { createAccount, /* ... */ };
};
```

---

## E) WORKFLOW & PROCESS

### Commit Message Structure (OBSERVED)

**Pattern analysis from recent commits:**
```
9bb169b Merge pull request #191 from Masked-Kunsiquat/patch-4
be8b0ee refactor(backup): move backup orchestration to domain layer
39c5ebe refactor(backup): return restored state to view layer
c45ba3c fix(contacts): harden contact import editing
40a80d6 refactor(backup): centralize backup I/O and error handling
```

**Observed convention:**
- Format: `<type>(<scope>): <description>`
- Types: `refactor`, `fix`, `feat`, `chore`, `docs`, `test`
- Scope: Feature/domain area (`backup`, `contacts`, `accounts`, `persistence`, etc.)
- Description: Imperative mood, lowercase, no period

**Expected patterns:**
```
feat(accounts): add audit frequency configuration
fix(contacts): prevent duplicate email entries
refactor(domains): extract account validation logic
docs(logging): update best practices guide
test(reducers): add accountContact link/unlink tests
chore(deps): update expo to 54.0.31
```

### Migration Patterns (OBSERVED)

**Pattern 1: Data migrations in `domains/migrations/`**
```typescript
// File: domains/migrations/codeEncryption.ts
export const buildCodeEncryptionEvents = async (
  doc: AutomergeDoc,
  deviceId: DeviceId,
): Promise<Event[]> => {
  // Check if migration needed
  // Generate events for migration
  // Return events to be applied
};
```

**Safety requirements:**
- Migrations MUST be idempotent (can be run multiple times safely)
- Migrations MUST be backward compatible with existing data
- Migrations MUST generate events (not mutate doc directly)
- Migrations MUST be applied via event sourcing flow

**Pattern 2: Schema migrations in `domains/persistence/migrations.ts`**
```typescript
// File: domains/persistence/migrations.ts
export const migrations = [
  {
    version: 1,
    up: (db: SQLiteDatabase) => {
      db.execSync(`CREATE TABLE IF NOT EXISTS events (...);`);
    },
  },
  {
    version: 2,
    up: (db: SQLiteDatabase) => {
      db.execSync(`CREATE TABLE IF NOT EXISTS device_state (...);`);
    },
  },
];
```

### i18n/Translation Workflow (OBSERVED)

**Translation file structure:**
- Primary: `i18n/en.json` (English - source of truth)
- Additional: `i18n/de.json`, `i18n/es.json`, `i18n/fr.json`, `i18n/zh-Hans.json`
- Glossaries: `i18n/glossary/{locale}.tbx` (TBX format for translation tools)

**Translation key structure (from `en.json`):**
```json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "accounts.title": "Accounts",
  "accounts.validation.nameRequired": "Account name is required",
  "contacts.type.internal": "Internal",
  "contacts.type.external": "External"
}
```

**Key naming pattern:**
- Format: `{domain}.{component}.{key}` or `{domain}.{key}`
- Examples: `accounts.validation.nameRequired`, `contacts.type.internal`, `common.save`
- Enum-like values use dotted paths: `account.status.active`, `contact.method.label.work`

**Usage pattern:**
```typescript
import { t } from "@i18n/index";

// Simple key
const title = t("accounts.title");

// With parameters
const message = t("accounts.validation.minLength", { min: 3 });
```

**Validation (enforced by ESLint):**
- Custom rule: `enforce-i18n-validation`
- Requirement: Validation messages in `Alert.alert` MUST use `t()`, not hardcoded strings
- Keywords triggering rule: "required", "invalid", "must", "cannot", "error", "failed", "missing"

### Testing Expectations (OBSERVED)

**Test framework:**
- Jest with `jest-expo` preset
- Config in `package.json` (lines 14-28)
- Test files: `**/__tests__/**/*.(test|spec).(ts|tsx|js)` or `**/*.(test|spec).(ts|tsx|js)`

**Test structure (from `tests/accountContact.reducer.test.ts`):**
```typescript
import { /* ... */ } from "@domains/...";
import { accountContactReducer } from "@reducers/accountContact.reducer";

describe("accountContact.reducer", () => {
  describe("account.contact.linked", () => {
    it("should create a new account-contact relation", () => {
      // Arrange
      const event = buildEvent({ /* ... */ });
      const initialDoc = { /* ... */ };

      // Act
      const result = accountContactReducer(initialDoc, event);

      // Assert
      expect(result.relations.accountContacts[relationId]).toBeDefined();
    });
  });
});
```

**Test expectations:**
- Unit tests for reducers (pure functions)
- Integration tests for complex flows (backup/restore, migrations)
- No tests required for simple view components (discretionary)
- Critical business logic MUST have tests (reducers, domain utils)

---

## F) EVIDENCE REQUIREMENTS

### What Proof is Needed to Flag a Finding?

**P0 findings require:**
1. **Concrete example**: File path + line number(s)
2. **Actual code snippet**: Copy-paste of violating code
3. **Impact statement**: What could go wrong (security, data loss, crash)
4. **Contract reference**: Which rule in this document is violated

**Example P0 finding:**
```
FINDING: P0 - Cross-layer import violation
FILE: views/screens/ContactFormScreen.tsx:12
CODE:
    import { contactReducer } from "../../reducers/contact.reducer";

IMPACT: Views layer importing reducer directly bypasses event-sourcing architecture,
        risks state inconsistency, violates separation of concerns.

CONTRACT: Section B, Rule 1: "Views CANNOT import from Reducers"
ESLint enforces this via no-restricted-imports pattern.
```

**P1 findings require:**
1. **Concrete example**: File path + line number(s)
2. **Actual code snippet**: Copy-paste of violating code
3. **Maintenance burden statement**: Why this makes the codebase harder to maintain

**Example P1 finding:**
```
FINDING: P1 - Direct console.log usage
FILE: views/hooks/useContactActions.ts:47
CODE:
    console.log("Creating contact:", firstName, lastName);

MAINTENANCE: Inconsistent logging, bypasses centralized logger config,
             can't be filtered by module, violates ESLint no-console rule.

CONTRACT: Section D, "Logging Conventions": "DON'T use console.log() directly"
```

**P2 findings require:**
1. **Pattern observation**: Multiple examples OR single low-impact example
2. **Consistency rationale**: Why uniformity here improves codebase quality

### How to Distinguish Intentional Exceptions?

**Exception indicators (NOT violations):**

1. **ESLint disable comments with rationale:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const payload: any = event.payload; // Type depends on runtime event.type
```

2. **File-level ESLint overrides:**
```javascript
// File: utils/logger.ts
// Allowed by eslint.config.mjs lines 82-87:
{
  files: ["utils/logger.ts"],
  rules: { "no-console": "off" } // Logger is allowed to use console methods
}
```

3. **Documented architectural decisions:**
```typescript
// File: views/store/store.ts:132
/**
 * Internal API for trusted hooks (useDispatch, App initialization, etc.)
 * This allows mutation through the proper event-sourcing flow only.
 * DO NOT export this - it's intentionally kept internal.
 */
export const __internal_getCrmStore = () => crmStore;
```

4. **Legacy compatibility markers:**
```typescript
// File: domains/contact.ts:33
export interface Contact extends Entity {
  // Legacy name field for backwards compatibility
  name?: string;
  firstName: string;
  lastName: string;
}
```

5. **Intentional unused parameters (prefixed with `_`):**
```typescript
// File: views/hooks/useAccountActions.ts:88
_previousAccount?: Account, // Kept for backwards compatibility, unused since change detection moved to view layer
```

**When in doubt:**
- Check ESLint config for explicit exceptions
- Check README.md or inline comments for architectural rationale
- Look for `_` prefix (intentional unused) or `__internal_` prefix (controlled boundary)
- If no documentation exists, flag as P2 ("may be intentional, but undocumented")

---

## REVISION HISTORY

| Version | Date       | Author          | Changes                                    |
|---------|------------|-----------------|--------------------------------------------|
| 1.0     | 2026-01-10 | context-manager | Initial contract based on commit 9bb169b   |

---

## USAGE GUIDELINES FOR AUDITORS

1. **This contract is authoritative**: All findings MUST reference specific sections
2. **Report structure**: Use format "FINDING: {Severity} - {Brief description}" with FILE, CODE, IMPACT/MAINTENANCE, CONTRACT references
3. **When contract is silent**: Flag as "Pattern inconsistency" (P2) and recommend updating contract
4. **When contract conflicts with code**: Code wins (contract reflects observed reality, not ideals)
5. **Before reporting P0/P1**: Search for ESLint disables, architectural docs, or `__internal_`/`_` prefixes

---

**Contract Status**: ACTIVE
**Last Verified Against**: Commit 9bb169b (2026-01-10)
**Next Review**: After major architectural changes or on request
