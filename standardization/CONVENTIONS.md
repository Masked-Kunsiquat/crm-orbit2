# CRMOrbit Coding Conventions

**Status**: Living Document
**Version**: 1.0
**Last Updated**: 2026-01-10
**Authority**: Derived from [REPO_AUDIT_CONTRACT.md](./REPO_AUDIT_CONTRACT.md)

> **Purpose**: This document provides quick-reference guidelines for contributors. For the complete authoritative specification with evidence and examples, see [REPO_AUDIT_CONTRACT.md](./REPO_AUDIT_CONTRACT.md).

---

## Table of Contents

1. [File & Folder Naming](#file--folder-naming)
2. [Code Naming Patterns](#code-naming-patterns)
3. [Architecture & Layering](#architecture--layering)
4. [Import Rules](#import-rules)
5. [Type Safety](#type-safety)
6. [Error Handling](#error-handling)
7. [Logging](#logging)
8. [i18n (Internationalization)](#i18n-internationalization)
9. [Testing](#testing)
10. [Git Workflow](#git-workflow)
11. [Quick Reference Commands](#quick-reference-commands)

---

## File & Folder Naming

### Components (React/TSX)
- **Pattern**: `PascalCase.tsx`
- **Location**: `views/components/`
- **Examples**: `FormScreenLayout.tsx`, `TimelineSection.tsx`, `ContactCardRow.tsx`

### Screens
- **Pattern**: `EntityNameScreen.tsx` or `EntityNameOperationScreen.tsx`
- **Location**: `views/screens/{domain}/`
- **Examples**: `AccountFormScreen.tsx`, `ContactDetailScreen.tsx`, `OrganizationsLandingScreen.tsx`

### Hooks
- **Pattern**: `use{Purpose}.ts` or `use{Entity}Actions.ts`
- **Location**: `views/hooks/`
- **Examples**: `useDispatch.ts`, `useAccountActions.ts`, `useContactImport.ts`
- **Rule**: Action hooks MUST accept `deviceId: string` parameter

### Domain Models
- **Pattern**: `entityName.ts` (lowercase)
- **Location**: `domains/`
- **Examples**: `account.ts`, `contact.ts`, `organization.ts`
- **Utilities**: `entityName.utils.ts` for domain-specific helpers

### Reducers
- **Pattern**: `entityName.reducer.ts`
- **Location**: `reducers/`
- **Examples**: `account.reducer.ts`, `contact.reducer.ts`, `accountContact.reducer.ts`
- **Registry**: All reducers must be registered in `reducers/registry.ts`

### Utilities
- **Pattern**: `descriptiveName.ts`
- **Location**: `utils/`
- **Examples**: `logger.ts`, `encryption.ts`, `imageStorage.ts`

### Tests
- **Pattern**: `entityName.test.ts` or `featureName.test.ts`
- **Location**: `tests/`
- **Examples**: `accountContact.reducer.test.ts`, `codeEncryptionMigration.test.ts`

---

## Code Naming Patterns

### Types & Interfaces
```typescript
// Interfaces: PascalCase
interface Account extends Entity { /* ... */ }
interface ContactMethods { /* ... */ }

// Type aliases: PascalCase
type EntityId = string & { readonly __brand: "EntityId" };
type AccountStatus = "account.status.active" | "account.status.inactive";

// Generic types
type DispatchResult<T = void> = { success: boolean; data?: T; error?: string };
```

### Constants
```typescript
// All-caps for frozen values
const DEFAULT_ACCOUNT_AUDIT_FREQUENCY: AccountAuditFrequency =
  "account.auditFrequency.monthly";

const LOG_LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 } as const;

// camelCase for mutable config
let globalConfig = { theme: "light" };
```

### Functions
```typescript
// camelCase, verb-first for actions
function createLogger(moduleName: string): Logger { /* ... */ }
function buildEvent(input: BuildEventInput): Event { /* ... */ }
function applyEvents(doc: AutomergeDoc, events: Event[]): void { /* ... */ }

// Hook functions: use{Purpose}
export function useDispatch(): { dispatch: DispatchFn } { /* ... */ }
export function useAccountActions(deviceId: string) { /* ... */ }

// Event handlers: handle{Action}
const handleSave = useCallback(() => { /* ... */ }, []);
const handleDelete = useCallback(() => { /* ... */ }, []);

// Reducer helpers: apply{EventName}
function applyAccountCreated(doc: AutomergeDoc, event: Event): AutomergeDoc { /* ... */ }
```

### Variables
```typescript
// camelCase for local variables
const deviceId = "device-123";
const accountId = "account-456";
const isLoading = false;

// Prefix with _ for intentionally unused
const { [id]: _removed, ...remainingAccounts } = doc.accounts;
function updateAccount(_previousAccount?: Account) { /* ... */ }

// Prefix with __internal_ for controlled exports
export const __internal_getCrmStore = () => crmStore;

// Boolean flags: is/has/should prefix
const isLoading = false;
const hasDeviceIdParam = true;
const shouldLog = level >= threshold;
```

---

## Architecture & Layering

CRMOrbit uses a **strict 4-layer architecture**:

```
┌─────────────────────────────────────┐
│ VIEWS (views/)                      │  React components, screens, hooks
│ ↓ dispatches events                 │  CAN import: domains/, events/, i18n/, utils/
└─────────────────────────────────────┘  CANNOT import: reducers/

┌─────────────────────────────────────┐
│ EVENTS (events/)                    │  Event definitions, dispatcher
│ ↓ applies via reducers              │  CAN import: domains/, utils/
└─────────────────────────────────────┘  CANNOT import: views/, reducers/

┌─────────────────────────────────────┐
│ REDUCERS (reducers/)                │  Pure event handlers
│ ↓ modifies                          │  CAN import: domains/, events/, automerge/, utils/
└─────────────────────────────────────┘  CANNOT import: views/

┌─────────────────────────────────────┐
│ DOMAINS (domains/)                  │  Business models, domain logic
│                                     │  CAN import: events/ (types only), utils/
└─────────────────────────────────────┘  CANNOT import: views/, reducers/
```

### Key Principles

1. **Views dispatch events, never call reducers directly**
2. **Reducers are pure functions** (no side effects, no async, no API calls)
3. **Domains are framework-agnostic** (no React dependencies)
4. **Business logic lives in domains**, not views
5. **Event sourcing is the single source of truth**

---

## Import Rules

### ✅ Allowed Imports

```typescript
// Views can import from domains, events, i18n, utils
// File: views/hooks/useAccountActions.ts
import { buildEvent } from "@events/dispatcher";
import type { Account } from "@domains/account";
import { t } from "@i18n/index";
import { createLogger } from "@utils/logger";

// Reducers can import from domains, events, automerge, utils
// File: reducers/account.reducer.ts
import type { AutomergeDoc } from "@automerge/schema";
import type { Event } from "@events/event";
import type { Account } from "@domains/account";
import { createLogger } from "@utils/logger";

// Domains can import from utils and events (types only)
// File: domains/account.utils.ts
import type { Event } from "@events/event";
import { createLogger } from "@utils/logger";
```

### ❌ Forbidden Imports

```typescript
// ❌ Views CANNOT import from reducers
// File: views/components/TimelineSection.tsx
import { accountReducer } from "@reducers/account.reducer"; // VIOLATION

// ❌ Domains CANNOT import from views or reducers
// File: domains/account.utils.ts
import { useAccount } from "../views/store/store"; // VIOLATION
import { accountReducer } from "../reducers/account.reducer"; // VIOLATION

// ❌ Reducers CANNOT import from views
// File: reducers/contact.reducer.ts
import { useContact } from "../views/store/store"; // VIOLATION
```

**Enforcement**: ESLint rule `no-restricted-imports` enforces these boundaries.

---

## Type Safety

### Rules

1. **No explicit `any`** - Use proper types or `unknown`
2. **Type event payloads** - Define payload types for all events
3. **Use type guards** - For discriminated unions and filters
4. **Return types for action hooks** - Always return `DispatchResult`

### Examples

```typescript
// ❌ Bad: explicit any
const payload: any = event.payload;

// ✅ Good: proper typing
type AccountCreatedPayload = {
  id: EntityId;
  name: string;
  organizationId: EntityId;
  status: AccountStatus;
};
const payload = event.payload as AccountCreatedPayload;

// ✅ Good: type guard
const selector = (state: CrmStoreState) =>
  Object.values(state.doc.audits).filter(
    (audit): audit is Audit => audit.accountId === accountId,
  );

// ✅ Good: explicit return type
const createAccount = useCallback(
  (/* params */): DispatchResult => {
    const event = buildEvent({ /* ... */ });
    return dispatch([event]);
  },
  [deviceId, dispatch],
);
```

---

## Error Handling

### Pattern 1: Try-catch with logging
```typescript
try {
  const persistenceDb = await initializeDatabase();
  // ... operations ...
} catch (err) {
  logger.error("Failed to load data", err);
  setError(err instanceof Error ? err.message : "Failed to load data");
}
```

### Pattern 2: Throwing with descriptive messages
```typescript
if (!doc.accounts[payload.accountId]) {
  logger.error("Account not found for linking", { accountId: payload.accountId });
  throw new Error(`Account not found: ${payload.accountId}`);
}
```

### Pattern 3: DispatchResult return type
```typescript
export type DispatchResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Usage:
const result = dispatch(events);
if (result.success) {
  navigation.goBack();
} else {
  Alert.alert(t("common.error"), result.error);
}
```

### Pattern 4: Alert for user-facing errors
```typescript
if (!firstName.trim() && !lastName.trim()) {
  Alert.alert(t("common.error"), t("contacts.validation.nameRequired"));
  return;
}
```

---

## Logging

### Setup
```typescript
import { createLogger } from "@utils/logger";
const logger = createLogger("ModuleName");
```

### Log Levels
- `logger.debug()` - Detailed debugging (only in `__DEV__` mode)
- `logger.info()` - General informational messages
- `logger.warn()` - Warnings about potential issues
- `logger.error()` - Errors that need attention

### Module Naming
- Reducers: `"ContactReducer"`, `"AccountReducer"`
- Action hooks: `"ContactActions"`, `"NoteActions"`
- Screens: `"ContactFormScreen"`, `"NoteDetailScreen"`
- Services: `"DatabaseService"`, `"SyncService"`

### Best Practices
```typescript
// ✅ Good: structured logging with context
logger.info("User created", { userId, email });
logger.error("Operation failed", error);

// ❌ Bad: direct console usage (except in utils/logger.ts)
console.log("User created:", userId); // Violates ESLint rule
```

---

## i18n (Internationalization)

### Translation Key Structure
**Format**: `{domain}.{component}.{key}` or `{domain}.{key}`

```json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "accounts.title": "Accounts",
  "accounts.validation.nameRequired": "Account name is required",
  "contacts.type.internal": "Internal",
  "contact.method.label.work": "Work"
}
```

### Usage
```typescript
import { t } from "@i18n/index";

// Simple key
const title = t("accounts.title");

// With parameters
const message = t("accounts.validation.minLength", { min: 3 });

// In validation
if (!name.trim()) {
  Alert.alert(t("common.error"), t("accounts.validation.nameRequired"));
  return;
}
```

### Rules
1. **All user-facing strings MUST use `t()`** - No hardcoded strings
2. **Validation messages MUST be i18n keys** - Enforced by custom ESLint rule
3. **Follow namespace pattern** - Consistent key structure across all translations

---

## Testing

### Test Framework
- **Jest** with `jest-expo` preset
- Test files: `tests/**/*.test.ts`

### Coverage Requirements
- **Reducers**: MUST have tests (pure functions, critical business logic)
- **Migrations**: MUST have tests (data safety)
- **Domain utilities**: SHOULD have tests (complex logic)
- **View components**: Optional (discretionary)

### Test Structure
```typescript
import { /* ... */ } from "@domains/...";
import { accountReducer } from "@reducers/account.reducer";

describe("account.reducer", () => {
  describe("account.created", () => {
    it("should create a new account", () => {
      // Arrange
      const event = buildEvent({ /* ... */ });
      const initialDoc = { /* ... */ };

      // Act
      const result = accountReducer(initialDoc, event);

      // Assert
      expect(result.accounts[accountId]).toBeDefined();
      expect(result.accounts[accountId].name).toBe("Test Account");
    });
  });
});
```

---

## Git Workflow

### Commit Message Format
**Pattern**: `<type>(<scope>): <description>`

```
feat(accounts): add audit frequency configuration
fix(contacts): prevent duplicate email entries
refactor(domains): extract account validation logic
docs(logging): update best practices guide
test(reducers): add accountContact link/unlink tests
chore(deps): update expo to 54.0.31
```

**Rules**:
- **Types**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
- **Scope**: Feature/domain area (e.g., `backup`, `contacts`, `accounts`)
- **Description**: Imperative mood, lowercase, no period
- **Examples**: See recent git log for established patterns

### Migration Patterns

#### Data Migrations
```typescript
// File: domains/migrations/exampleMigration.ts
export const buildExampleMigrationEvents = async (
  doc: AutomergeDoc,
  deviceId: DeviceId,
): Promise<Event[]> => {
  // Check if migration needed (idempotency)
  const pending = Object.values(doc.entities).filter((entity) => !entity.migratedField);
  if (pending.length === 0) return [];

  // Generate events for migration
  const events: Event[] = [];
  for (const entity of pending) {
    try {
      events.push(buildEvent({ /* ... */ }));
    } catch (error) {
      logger.error("Migration failed for entity", { entityId: entity.id });
    }
  }

  return events;
};
```

**Safety Requirements**:
1. Migrations MUST be **idempotent** (can run multiple times safely)
2. Migrations MUST be **backward compatible**
3. Migrations MUST **generate events** (not mutate doc directly)
4. Migrations MUST be **applied via event sourcing flow**

---

## Quick Reference Commands

### Check for Violations

```bash
# Cross-layer imports (views → reducers)
grep -r "from.*reducers" views/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Direct console usage (should only be in logger.ts)
grep -rn "console\." . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v utils/logger.ts

# Explicit any usage
grep -rn ": any" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v eslint-disable

# Find large files (>500 lines)
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

### Run Tests & Linting

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run ESLint
npm run lint

# Run TypeScript compiler
npm run tsc -- --noEmit

# Run Prettier
npm run format
```

### Verify Architecture

```bash
# Check that all reducers are registered
grep -l "export.*Reducer" reducers/*.ts | wc -l  # Count reducer files
grep ":" reducers/registry.ts | wc -l             # Count registered reducers

# Verify action hooks accept deviceId
grep -A 3 "export const use.*Actions" views/hooks/*.ts | grep "deviceId: string"
```

---

## Related Documentation

- [REPO_AUDIT_CONTRACT.md](./REPO_AUDIT_CONTRACT.md) - Complete authoritative specification
- [AUDIT_SYNTHESIS_REPORT.md](./AUDIT_SYNTHESIS_REPORT.md) - Latest audit findings and remediation plan
- `domains/actions/README.md` - Event builder patterns
- `utils/LOGGING.md` - Logging best practices

---

## Contributing

When contributing to CRMOrbit:

1. **Read this document** before writing code
2. **Follow the 4-layer architecture** strictly
3. **Write tests for reducers and domain logic**
4. **Use i18n for all user-facing strings**
5. **Follow commit message conventions**
6. **Run linting and tests before committing**
7. **Add types, never use explicit `any`**
8. **Create migrations for data model changes**

Questions? Check [REPO_AUDIT_CONTRACT.md](./REPO_AUDIT_CONTRACT.md) for detailed examples and rationale.

---

**Document Status**: Living
**Version**: 1.0
**Last Updated**: 2026-01-10
**Next Review**: Q3 2026 or after major architectural changes
