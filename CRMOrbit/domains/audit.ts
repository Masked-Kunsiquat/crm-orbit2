import type { Entity, EntityId, Timestamp } from "./shared/types";

export interface Audit extends Entity {
  accountId: EntityId;
  scheduledFor: Timestamp;
  occurredAt?: Timestamp;
  score?: number;
  notes?: string;
  floorsVisited?: number[];
}
