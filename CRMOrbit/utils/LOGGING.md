# Logging Best Practices for CRM Orbit

## Overview

CRM Orbit uses a standardized logging system that provides:

- **Module-based logging** with automatic prefixes for easy filtering
- **Debug flag support** that works seamlessly with Expo Go and dev server
- **Consistent formatting** across all modules
- **Type-safe log levels** (debug, info, warn, error)
- **Human-readable output** with timestamps
- **ESLint compliance** (no direct console usage outside logger)

## Quick Start

### Basic Usage

```typescript
import { createLogger } from "@utils/logger";

// Create a logger for your module
const logger = createLogger("MyModule");

// Log at different levels
logger.debug("Detailed debugging information", { state: currentState });
logger.info("Operation successful", { userId: "123" });
logger.warn("Potential issue detected", { retryCount: 3 });
logger.error("Operation failed", error);
```

### Real-World Examples

#### In a Reducer

```typescript
import { createLogger } from "@utils/logger";

const logger = createLogger("ContactReducer");

export const contactReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "contact.created": {
      const payload = event.payload as ContactCreatedPayload;
      logger.info("Creating contact", {
        id: payload.id,
        name: `${payload.firstName} ${payload.lastName}`,
      });

      // ... implementation ...

      logger.debug("Contact created successfully", { id: payload.id });
      return newDoc;
    }

    case "contact.deleted": {
      const id = event.entityId;
      if (!doc.contacts[id]) {
        logger.warn("Attempted to delete non-existent contact", { id });
        return doc;
      }

      // ... implementation ...

      return newDoc;
    }

    default:
      logger.error("Unknown event type", { type: event.type });
      throw new Error(`Unknown event type: ${event.type}`);
  }
};
```

#### In an Action Hook

```typescript
import { createLogger } from "@utils/logger";
import { useDispatch } from "@views/hooks/useDispatch";

const logger = createLogger("ContactActions");

export const useContactActions = () => {
  const dispatch = useDispatch();

  const createContact = useCallback(
    (firstName: string, lastName: string, type: ContactType) => {
      logger.debug("Creating contact", { firstName, lastName, type });

      const event = buildEvent({
        type: "contact.created",
        payload: {
          id: nextId("contact"),
          firstName,
          lastName,
          type,
          methods: { emails: [], phones: [] },
        },
        entityId: nextId("contact"),
      });

      const result = dispatch(event);

      if (result.success) {
        logger.info("Contact created successfully", { id: event.entityId });
      } else {
        logger.error("Failed to create contact", result.error);
      }

      return result;
    },
    [dispatch],
  );

  return { createContact, updateContact, deleteContact };
};
```

#### In a Form Screen

```typescript
import { createLogger } from "@utils/logger";

const logger = createLogger("ContactFormScreen");

export const ContactFormScreen = ({ route, navigation }: Props) => {
  // ... state and hooks ...

  const handleSave = () => {
    logger.debug("Saving contact", { contactId, firstName, lastName });

    if (!firstName.trim() && !lastName.trim()) {
      logger.warn("Validation failed: name required");
      Alert.alert(t("contacts.validation.nameRequired"));
      return;
    }

    if (contactId) {
      const result = updateContact(contactId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim() || undefined,
        type,
      });

      if (result.success) {
        logger.info("Contact updated", { contactId });
        navigation.goBack();
      } else {
        logger.error("Failed to update contact", { contactId, error: result.error });
        Alert.alert(t("common.error"), result.error);
      }
    } else {
      // Create logic...
    }
  };

  return (/* ... */);
};
```

## Log Levels

### debug

**When to use:** Detailed information for debugging during development

**Examples:**

- Event processing details
- Cache hits/misses
- Internal state changes
- Function entry/exit with parameters

**Behavior:** Only shown when `enableDebug` is true (defaults to `__DEV__`)

```typescript
logger.debug("Cache lookup", { key: "user:123", hit: true });
logger.debug("Reducer processing", {
  eventType: "contact.created",
  entityId: "c-123",
});
```

### info

**When to use:** General informational messages about application state

**Examples:**

- Successful operations
- User actions
- Major state transitions
- API requests/responses (summary)

**Behavior:** Always shown in development, configurable in production

```typescript
logger.info("User logged in", { userId: "123", email: "user@example.com" });
logger.info("Database initialized", { version: 2, migrationsRun: 3 });
```

### warn

**When to use:** Warning messages about potential issues

**Examples:**

- Deprecated feature usage
- Missing optional data
- Retry attempts
- Performance concerns
- Validation warnings

**Behavior:** Always shown

```typescript
logger.warn("Missing organization logo", { organizationId: "org-1" });
logger.warn("Retry attempt", { attempt: 3, maxRetries: 5 });
```

### error

**When to use:** Error conditions that need attention

**Examples:**

- Exceptions and errors
- Failed operations
- Data integrity issues
- Unexpected states

**Behavior:** Always shown

```typescript
logger.error("Failed to save contact", error);
logger.error("Invalid event type", {
  type: "unknown.event",
  entityId: "e-123",
});
```

## Configuration

### Global Configuration

```typescript
import { configureLogger } from "@utils/logger";

// Configure at app startup (e.g., in App.tsx)
configureLogger({
  enableDebug: __DEV__, // Enable debug logs in development only
  minLevel: "info", // Only show info and above in production
  formatTimestamp: () => new Date().toISOString(), // Custom timestamp format
});
```

### Development vs Production

```typescript
// Recommended production configuration
if (!__DEV__) {
  configureLogger({
    enableDebug: false,
    minLevel: "warn", // Only show warnings and errors in production
  });
}
```

## Best Practices

### DO ✅

1. **Create module-specific loggers**

   ```typescript
   const logger = createLogger("ModuleName");
   ```

2. **Include context with logs**

   ```typescript
   logger.info("User created", { userId, email, timestamp });
   ```

3. **Log errors with stack traces**

   ```typescript
   try {
     // operation
   } catch (error) {
     logger.error("Operation failed", error);
     throw error;
   }
   ```

4. **Use appropriate log levels**
   - Debug for detailed traces
   - Info for notable events
   - Warn for potential issues
   - Error for failures

5. **Keep messages concise and actionable**
   ```typescript
   logger.info("Contact created", { id: "c-123" }); // Good
   logger.info(
     "The contact with ID c-123 has been successfully created in the database",
   ); // Too verbose
   ```

### DON'T ❌

1. **Don't use console.log/warn/error directly**

   ```typescript
   console.log("User created"); // ❌ Violates ESLint rule
   logger.info("User created"); // ✅ Use logger instead
   ```

2. **Don't log sensitive information**

   ```typescript
   logger.info("User logged in", { password: "secret123" }); // ❌ Security risk
   logger.info("User logged in", { userId: "123" }); // ✅ Safe
   ```

3. **Don't log in tight loops**

   ```typescript
   contacts.forEach((contact) => {
     logger.debug("Processing contact", contact); // ❌ Too noisy
   });

   logger.debug("Processing contacts", { count: contacts.length }); // ✅ Summary
   ```

4. **Don't use string concatenation**

   ```typescript
   logger.info("User " + userId + " created"); // ❌ Hard to parse
   logger.info("User created", { userId }); // ✅ Structured
   ```

5. **Don't log every function call**
   ```typescript
   const getUser = (id: string) => {
     logger.debug("getUser called", { id }); // ❌ Too verbose
     return users[id];
   };
   ```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await riskyOperation();
  logger.info("Operation successful", { result });
  return result;
} catch (error) {
  logger.error("Operation failed", error);

  // Re-throw or handle
  if (error instanceof ValidationError) {
    logger.warn("Validation error, prompting user", { errors: error.errors });
    Alert.alert("Validation Error", error.message);
  } else {
    throw error;
  }
}
```

### Conditional Logging

```typescript
// Log warnings for edge cases
if (retryCount > 3) {
  logger.warn("High retry count", { retryCount, operation: "saveContact" });
}

// Log info for state changes
if (previousStatus !== newStatus) {
  logger.info("Status changed", { contactId, previousStatus, newStatus });
}
```

### Performance Logging

```typescript
const startTime = Date.now();

// ... expensive operation ...

const duration = Date.now() - startTime;
if (duration > 1000) {
  logger.warn("Slow operation detected", {
    operation: "loadContacts",
    duration,
  });
}
```

## Module Naming Conventions

Use clear, descriptive module names:

- **Reducers**: `"ContactReducer"`, `"AccountReducer"`
- **Action Hooks**: `"ContactActions"`, `"NoteActions"`
- **Screens**: `"ContactFormScreen"`, `"NoteDetailScreen"`
- **Services**: `"DatabaseService"`, `"SyncService"`
- **Utils**: `"NavigationHelper"`, `"ValidationUtils"`

## Debugging

### Filter Logs by Module

Since all logs include the module name, you can easily filter in dev tools:

```
[2026-01-01T12:00:00.000Z] INFO  [ContactReducer] Creating contact
[2026-01-01T12:00:00.100Z] DEBUG [ContactActions] Contact created successfully
[2026-01-01T12:00:01.000Z] WARN  [DatabaseService] Slow query detected
```

Filter by searching for `[ContactReducer]` or `[ContactActions]`.

### Enable/Disable Debug Logs

```typescript
// Temporarily enable debug logs
configureLogger({ enableDebug: true });

// Disable again
configureLogger({ enableDebug: false });
```

## Migration from console.log

### Before

```typescript
console.log("Creating contact:", firstName, lastName);
console.error("Failed to create contact:", error);
console.log("Update result:", result);
```

### After

```typescript
const logger = createLogger("ContactActions");

logger.debug("Creating contact", { firstName, lastName });
logger.error("Failed to create contact", error);
logger.debug("Update completed", { result });
```

## ESLint Integration

The logger is integrated with ESLint:

- ✅ `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()` are allowed
- ❌ `console.log()`, `console.info()` are not allowed
- ✅ `console.warn()`, `console.error()` are still allowed for emergencies
- The `utils/logger.ts` file itself is exempt from the no-console rule

## Testing

The logger can be configured for testing:

```typescript
import { configureLogger } from "@utils/logger";

beforeAll(() => {
  // Silence logs during tests
  configureLogger({ minLevel: "error" });
});
```

## FAQ

**Q: Should I log in reducers?**
A: Yes, use debug level for event processing and warn/error for issues.

**Q: Can I use console.warn/console.error directly?**
A: Yes, they're allowed by ESLint, but prefer logger for consistency.

**Q: Will debug logs appear in production?**
A: No, by default debug logs are disabled when `__DEV__` is false.

**Q: How do I log objects?**
A: Pass them as additional arguments: `logger.info("Message", { key: value })`

**Q: Can I customize the timestamp format?**
A: Yes, use `configureLogger({ formatTimestamp: () => yourFormat })`

---

**Last Updated:** 2026-01-01
**Maintainer:** CRM Orbit Team
