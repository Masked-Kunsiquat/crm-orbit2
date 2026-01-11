import type { Event } from "../../events/event";
import type { EntityId } from "./types";

/**
 * Resolves and validates entity ID from an event and its payload.
 *
 * @param event - The event containing entityId
 * @param payload - The event payload that may contain id
 * @returns The resolved EntityId
 * @throws Error if entityId is missing or if there's a mismatch between payload.id and event.entityId
 */
export const resolveEntityId = <T extends { id?: EntityId }>(
  event: Event,
  payload: T,
): EntityId => {
  if (payload.id && event.entityId && payload.id !== event.entityId) {
    throw new Error(
      `Event entityId mismatch: payload=${payload.id}, event=${event.entityId}`,
    );
  }

  const entityId = payload.id ?? event.entityId;

  if (!entityId) {
    throw new Error("Event entityId is required.");
  }

  return entityId;
};
