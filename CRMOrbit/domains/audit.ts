import type { Entity, EntityId, Timestamp } from "./shared/types";

export type AuditStatus =
  | "audits.status.scheduled"
  | "audits.status.canceled"
  | "audits.status.completed";

export interface Audit extends Entity {
  accountId: EntityId;
  scheduledFor: Timestamp;
  durationMinutes: number;
  status: AuditStatus;
  summary?: string;
  occurredAt?: Timestamp;
  score?: number;
  notes?: string;
  floorsVisited?: number[];
}
