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

type InteractionUpdatedPayload = {
  type: InteractionType;
  occurredAt: Timestamp;
  summary: string;
  changes?: Array<{ field: string; oldValue: string; newValue: string }>;
};

const applyInteractionUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionUpdatedPayload;
  const id = event.entityId;

  if (!id) {
    logger.error("Missing entityId in interaction.updated event");
    throw new Error("Missing entityId in interaction.updated event");
  }

  const existing = doc.interactions[id];
  if (!existing) {
    logger.error("Interaction not found for update", { id });
    throw new Error(`Interaction not found: ${id}`);
  }

  logger.debug("Updating interaction", { id });

  const updated: Interaction = {
    ...existing,
    type: payload.type,
    occurredAt: payload.occurredAt,
    summary: payload.summary,
    updatedAt: event.timestamp,
  };

  logger.info("Interaction updated", { id });

  return {
    ...doc,
    interactions: {
      ...doc.interactions,
      [id]: updated,
    },
  };
};

type InteractionDeletedPayload = {
  id: EntityId;
};

const applyInteractionDeleted = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionDeletedPayload;
  const id = payload.id;

  logger.debug("Deleting interaction", { id });

  if (!doc.interactions[id]) {
    logger.error("Interaction not found for deletion", { id });
    throw new Error(`Interaction not found: ${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _deleted, ...remainingInteractions } = doc.interactions;

  const remainingLinks = Object.entries(doc.relations.entityLinks).reduce(
    (acc, [linkId, link]) => {
      if (link.linkType !== "interaction" || link.interactionId !== id) {
        acc[linkId] = link;
      }
      return acc;
    },
    {} as AutomergeDoc["relations"]["entityLinks"],
  );

  logger.info("Interaction deleted", { id });

  return {
    ...doc,
    interactions: remainingInteractions,
    relations: {
      ...doc.relations,
      entityLinks: remainingLinks,
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
    case "interaction.updated":
      return applyInteractionUpdated(doc, event);
    case "interaction.deleted":
      return applyInteractionDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `interaction.reducer does not handle event type: ${event.type}`,
      );
  }
};
