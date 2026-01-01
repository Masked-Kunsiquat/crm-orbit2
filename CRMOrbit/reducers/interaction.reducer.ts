import type { Interaction, InteractionType } from "../domains/interaction";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId, Timestamp } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("InteractionReducer");

type InteractionLoggedPayload = {
  id: EntityId;
  type: InteractionType;
  occurredAt: Timestamp;
  summary: string;
};

const applyInteractionLogged = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionLoggedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Logging interaction", { id, type: payload.type });

  if (doc.interactions[id]) {
    logger.error("Interaction already exists", { id });
    throw new Error(`Interaction already exists: ${id}`);
  }

  const interaction: Interaction = {
    id,
    type: payload.type,
    occurredAt: payload.occurredAt,
    summary: payload.summary,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  logger.info("Interaction logged", {
    id,
    type: payload.type,
    occurredAt: payload.occurredAt,
  });

  return {
    ...doc,
    interactions: {
      ...doc.interactions,
      [id]: interaction,
    },
  };
};

export const interactionReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "interaction.logged":
      return applyInteractionLogged(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `interaction.reducer does not handle event type: ${event.type}`,
      );
  }
};
