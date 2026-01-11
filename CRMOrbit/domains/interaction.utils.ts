import type {
  Interaction,
  InteractionStatus,
  InteractionType,
} from "./interaction";
import type { Timestamp } from "./shared/types";

/**
 * Type guard for interaction type
 */
const isInteractionType = (value: unknown): value is InteractionType => {
  return (
    typeof value === "string" &&
    (value === "interaction.type.call" ||
      value === "interaction.type.email" ||
      value === "interaction.type.meeting" ||
      value === "interaction.type.other")
  );
};

/**
 * Type guard for interaction status
 */
const isInteractionStatus = (value: unknown): value is InteractionStatus => {
  return (
    typeof value === "string" &&
    (value === "interaction.status.scheduled" ||
      value === "interaction.status.completed" ||
      value === "interaction.status.canceled")
  );
};

/**
 * Build interaction state from event payload.
 * Used by both reducers and timeline rendering for consistent state derivation.
 *
 * @param id - Interaction entity ID
 * @param payload - Event payload (may be partial for updates)
 * @param timestamp - Event timestamp
 * @param existing - Existing interaction state (for updates)
 * @returns Complete interaction state
 */
export const buildInteractionFromPayload = (
  id: string,
  payload: Record<string, unknown>,
  timestamp: string,
  existing?: Interaction,
): Interaction => ({
  id,
  type: isInteractionType(payload.type)
    ? payload.type
    : (existing?.type ?? "interaction.type.other"),
  occurredAt:
    typeof payload.occurredAt === "string"
      ? (payload.occurredAt as Timestamp)
      : (existing?.occurredAt ?? (timestamp as Timestamp)),
  scheduledFor:
    typeof payload.scheduledFor === "string"
      ? (payload.scheduledFor as Timestamp)
      : existing?.scheduledFor,
  status: isInteractionStatus(payload.status)
    ? payload.status
    : existing?.status,
  summary:
    typeof payload.summary === "string"
      ? payload.summary
      : (existing?.summary ?? ""),
  durationMinutes:
    typeof payload.durationMinutes === "number"
      ? payload.durationMinutes
      : existing?.durationMinutes,
  createdAt: existing?.createdAt ?? timestamp,
  updatedAt: timestamp,
});
