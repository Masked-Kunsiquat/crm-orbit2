export type EntityId = string;
export type Timestamp = string;
export type DeviceId = string;

export interface Entity {
  id: EntityId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
