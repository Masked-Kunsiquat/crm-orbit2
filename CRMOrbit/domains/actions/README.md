# Domain Actions Layer

This directory contains typed event-creation utilities that enforce compile-time type safety for CRM events.

## Purpose

The actions layer provides a strongly-typed interface for creating domain events, ensuring:

- **Type Safety**: Only valid `EventType` values can be used when building events
- **Separation of Concerns**: Business event creation logic lives in the domain layer, not the view layer
- **Reusability**: Event builders can be shared across views and domain logic

## Files

### `eventBuilder.ts`

Exports `buildTypedEvent`, a utility function that creates strongly-typed events with compile-time validation.

**Usage:**

```typescript
import { buildTypedEvent } from "@/domains/actions";

const event = buildTypedEvent({
  type: "organization.created", // ✓ Compile-time validated
  entityId: "org-123",
  payload: { name: "Acme Corp", status: "active" },
  deviceId: "device-456",
});
```

## Architectural Recommendations

### Current Architecture

- **Views Layer**: `CRMOrbit/views/` - React components and UI hooks
- **Domain Layer**: `CRMOrbit/domains/` - Business logic and utilities
- **Events Layer**: `CRMOrbit/events/` - Event infrastructure
- **Reducers Layer**: `CRMOrbit/reducers/` - Event handlers that modify state

### Recommendation: Domain-Specific Action Hooks

For better separation of concerns, consider creating domain-specific action hooks that encapsulate event creation for each domain entity:

#### Example: `domains/organization/hooks/useOrganizationActions.ts`

```typescript
import { useCallback } from "react";
import { useDispatch } from "@/views/hooks";
import { buildTypedEvent } from "@/domains/actions";
import type { OrganizationStatus } from "@/domains/organization";

export const useOrganizationActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createOrganization = useCallback(
    (id: string, name: string, status: OrganizationStatus) => {
      const event = buildTypedEvent({
        type: "organization.created",
        entityId: id,
        payload: { id, name, status },
        deviceId,
      });
      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateOrganizationStatus = useCallback(
    (id: string, status: OrganizationStatus) => {
      const event = buildTypedEvent({
        type: "organization.status.updated",
        entityId: id,
        payload: { id, status },
        deviceId,
      });
      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createOrganization,
    updateOrganizationStatus,
  };
};
```

#### Example: `domains/account/hooks/useAccountActions.ts`

```typescript
import { useCallback } from "react";
import { useDispatch } from "@/views/hooks";
import { buildTypedEvent } from "@/domains/actions";
import type { AccountStatus } from "@/domains/account";

export const useAccountActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createAccount = useCallback(
    (
      id: string,
      name: string,
      organizationId: string,
      status: AccountStatus,
    ) => {
      const event = buildTypedEvent({
        type: "account.created",
        entityId: id,
        payload: { id, name, organizationId, status },
        deviceId,
      });
      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const linkContact = useCallback(
    (accountId: string, contactId: string) => {
      const event = buildTypedEvent({
        type: "account.contact.linked",
        entityId: accountId,
        payload: { accountId, contactId },
        deviceId,
      });
      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createAccount,
    linkContact,
  };
};
```

### Benefits of Domain-Specific Action Hooks

1. **Type-Safe Event Payloads**: Each action method enforces the correct payload structure
2. **Encapsulation**: Business event creation logic is centralized in domain hooks
3. **View Simplification**: Views import domain-specific hooks instead of generic event builders
4. **Discoverability**: Developers can easily find all available actions for a domain
5. **Maintainability**: Changes to event payloads are isolated to domain hooks

### Migration Path

1. ✅ **Done**: Fix type safety in `useEventBuilder` (now accepts `EventType` instead of `string`)
2. ✅ **Done**: Create `buildTypedEvent` utility in `domains/actions`
3. **Future**: Create domain-specific hooks (e.g., `useOrganizationActions`, `useAccountActions`)
4. **Future**: Migrate views to use domain-specific hooks instead of `useEventBuilder`
5. **Future**: Consider deprecating `useEventBuilder` once migration is complete

### Current State

The `useEventBuilder` hook in `views/hooks/useDispatch.ts` is now type-safe:

- Accepts `EventType` instead of `string` (line 110)
- Removed unsafe `as any` cast (line 111)
- Compiler enforces valid event types at all call sites

Views can continue using `useEventBuilder` for generic event creation, but domain-specific hooks are recommended for better type safety and organization.
