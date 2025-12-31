import type { DeviceId, EntityId } from "@domains/shared/types";
import type { EventType } from "@events/eventTypes";
import type { Event } from "@events/event";

/**
 * Input parameters for building a typed event.
 * Enforces EventType at compile time.
 */
export type BuildTypedEventInput = {
  type: EventType;
  entityId?: EntityId;
  payload: unknown;
  deviceId: DeviceId;
  timestamp?: string;
};

let eventCounter = 0;

const nextEventId = (): string => {
  eventCounter += 1;
  return `evt-${Date.now()}-${eventCounter}`;
};

/**
 * Creates a strongly-typed event with compile-time validation of event type.
 * This utility ensures only valid EventType values can be used when building events.
 *
 * @param input - The event parameters with strongly-typed event type
 * @returns A fully formed Event object
 *
 * @example
 * ```ts
 * const event = buildTypedEvent({
 *   type: "organization.created", // ✓ Valid EventType
 *   entityId: "org-123",
 *   payload: { name: "Acme Corp" },
 *   deviceId: "device-456"
 * });
 *
 * // buildTypedEvent({
 * //   type: "invalid.type", // ✗ Compile error!
 * //   ...
 * // });
 * ```
 */
export const buildTypedEvent = (input: BuildTypedEventInput): Event => ({
  id: nextEventId(),
  type: input.type,
  entityId: input.entityId,
  payload: input.payload,
  timestamp: input.timestamp ?? new Date().toISOString(),
  deviceId: input.deviceId,
});
