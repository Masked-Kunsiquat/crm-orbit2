import type { DeviceId, EntityId, Timestamp } from "@domains/shared/types";
import type { EventType } from "./eventTypes";

export interface Event {
  id: EntityId;
  type: EventType;
  entityId?: EntityId;
  payload: unknown;
  timestamp: Timestamp;
  deviceId: DeviceId;
}
