import type { DeviceId, EntityId, Timestamp } from "../shared/types";

export interface Event {
  id: EntityId;
  type: string;
  entityId?: EntityId;
  payload: unknown;
  timestamp: Timestamp;
  deviceId: DeviceId;
}
