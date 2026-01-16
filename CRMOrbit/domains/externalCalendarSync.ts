import type { DeviceId, EntityId, Timestamp } from "./shared/types";
import type { EventType } from "@events/eventTypes";

export type ExternalCalendarChange = {
  type: EventType;
  entityId: EntityId;
  payload: Record<string, unknown>;
  timestamp: Timestamp;
  deviceId: DeviceId;
};
