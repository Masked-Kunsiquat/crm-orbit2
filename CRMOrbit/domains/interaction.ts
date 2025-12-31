import type { Entity, Timestamp } from "./shared/types";

export type InteractionType =
  | "interaction.type.call"
  | "interaction.type.email"
  | "interaction.type.meeting"
  | "interaction.type.other";

export interface Interaction extends Entity {
  type: InteractionType;
  occurredAt: Timestamp;
  summary: string;
}
