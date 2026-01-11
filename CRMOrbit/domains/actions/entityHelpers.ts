import type { DeviceId, EntityId } from "@domains/shared/types";
import type { EventType } from "@events/eventTypes";
import type { Event } from "@events/event";
import { buildEvent } from "@events/dispatcher";

/**
 * Valid entity types that support delete operations.
 * These correspond to EventType union members with `.deleted` suffix.
 */
export type DeletableEntityType =
  | "organization"
  | "account"
  | "audit"
  | "contact"
  | "note"
  | "interaction"
  | "code";

/**
 * Build a standardized delete event for any entity type.
 *
 * This helper eliminates duplication across all entity action hooks by
 * providing a single source of truth for delete event construction.
 *
 * **Type Safety Note:**
 * The function accepts `string` for flexibility (useful in generic contexts)
 * but uses `as EventType` assertion. All known call sites pass literal strings
 * from DeletableEntityType, which are guaranteed to map to valid EventType
 * members (e.g., "account" → "account.deleted").
 *
 * The trade-off:
 * - ✅ Reduces duplication across 7 entity types
 * - ✅ Centralizes delete event construction
 * - ✅ Type-safe at all known call sites (literal strings)
 * - ⚠️  Runtime-only validation for dynamic entity types
 *
 * @param entityType - The entity type (must be from DeletableEntityType)
 * @param entityId - The ID of the entity to delete
 * @param deviceId - The device ID creating the event
 * @returns A properly formed delete event
 *
 * @example
 * ```ts
 * // Type-safe usage with literal:
 * const event = buildDeleteEntityEvent("account", accountId, deviceId);
 * dispatch([event]);
 *
 * // In generic context:
 * function deleteEntity<T extends DeletableEntityType>(type: T, id: EntityId) {
 *   return buildDeleteEntityEvent(type, id, deviceId);
 * }
 * ```
 */
export const buildDeleteEntityEvent = (
  entityType: string,
  entityId: EntityId,
  deviceId: DeviceId,
): Event => {
  return buildEvent({
    type: `${entityType}.deleted` as EventType,
    entityId,
    payload: {
      id: entityId,
    },
    deviceId,
  });
};
