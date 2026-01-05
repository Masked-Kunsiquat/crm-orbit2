import type { Entity, Timestamp } from "./shared/types";

export type InteractionType =
  | "interaction.type.call"
  | "interaction.type.email"
  | "interaction.type.meeting"
  | "interaction.type.other";

export type InteractionStatus =
  | "interaction.status.scheduled"
  | "interaction.status.completed"
  | "interaction.status.canceled";

export interface Interaction extends Entity {
  type: InteractionType;
  occurredAt: Timestamp;
  scheduledFor?: Timestamp;
  status?: InteractionStatus;
  summary: string;
  durationMinutes?: number;
}
