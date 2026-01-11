import type { DeviceId, EntityId } from "@domains/shared/types";
import type { EventType } from "@events/eventTypes";
import type { Event } from "@events/event";
import { buildEvent } from "@events/dispatcher";

/**
 * Build a standardized delete event for any entity type.
 *
 * This helper eliminates duplication across all entity action hooks by
 * providing a single source of truth for delete event construction.
 *
 * @param entityType - The entity type (e.g., "account", "contact", "note")
 * @param entityId - The ID of the entity to delete
 * @param deviceId - The device ID creating the event
 * @returns A properly formed delete event
 *
 * @example
 * ```ts
 * const event = buildDeleteEntityEvent("account", accountId, deviceId);
 * dispatch([event]);
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
