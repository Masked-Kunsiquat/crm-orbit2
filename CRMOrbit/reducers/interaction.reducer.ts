import type {
  Interaction,
  InteractionStatus,
  InteractionType,
} from "../domains/interaction";
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
  status?: InteractionStatus;
};

type InteractionScheduledPayload = {
  id: EntityId;
  type: InteractionType;
  scheduledFor: Timestamp;
  summary: string;
  status?: InteractionStatus;
};

type InteractionRescheduledPayload = {
  id: EntityId;
  scheduledFor: Timestamp;
};

type InteractionStatusUpdatedPayload = {
  id: EntityId;
  status: InteractionStatus;
  occurredAt?: Timestamp;
};

const VALID_STATUSES: InteractionStatus[] = [
  "interaction.status.scheduled",
  "interaction.status.completed",
  "interaction.status.canceled",
];

const assertStatusValid = (status: InteractionStatus | undefined): void => {
  if (!status) return;
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid interaction status: ${status}`);
  }
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

  assertStatusValid(payload.status);
  if (
    payload.status &&
    payload.status !== "interaction.status.completed"
  ) {
    throw new Error("Logged interactions must be completed.");
  }

  const interaction: Interaction = {
    id,
    type: payload.type,
    occurredAt: payload.occurredAt,
    summary: payload.summary,
    status: payload.status ?? "interaction.status.completed",
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

const applyInteractionScheduled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionScheduledPayload;
  const id = resolveEntityId(event, payload);

  if (doc.interactions[id]) {
    throw new Error(`Interaction already exists: ${id}`);
  }

  if (!payload.scheduledFor) {
    throw new Error("Interaction scheduledFor is required.");
  }

  assertStatusValid(payload.status);

  const interaction: Interaction = {
    id,
    type: payload.type,
    scheduledFor: payload.scheduledFor,
    occurredAt: payload.scheduledFor,
    summary: payload.summary,
    status: payload.status ?? "interaction.status.scheduled",
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  return {
    ...doc,
    interactions: {
      ...doc.interactions,
      [id]: interaction,
    },
  };
};

const applyInteractionRescheduled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionRescheduledPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.interactions[id];

  if (!existing) {
    throw new Error(`Interaction not found: ${id}`);
  }

  if (!payload.scheduledFor) {
    throw new Error("Interaction scheduledFor is required.");
  }

  return {
    ...doc,
    interactions: {
      ...doc.interactions,
      [id]: {
        ...existing,
        scheduledFor: payload.scheduledFor,
        occurredAt: payload.scheduledFor,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyInteractionStatusUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionStatusUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.interactions[id];

  if (!existing) {
    throw new Error(`Interaction not found: ${id}`);
  }

  assertStatusValid(payload.status);

  if (
    payload.status === "interaction.status.completed" &&
    !payload.occurredAt &&
    !existing.occurredAt
  ) {
    throw new Error("Interaction occurredAt is required when completing.");
  }

  if (
    payload.status === "interaction.status.scheduled" &&
    !existing.scheduledFor
  ) {
    throw new Error(
      "Interaction scheduledFor is required when marking scheduled.",
    );
  }

  return {
    ...doc,
    interactions: {
      ...doc.interactions,
      [id]: {
        ...existing,
        status: payload.status,
        ...(payload.occurredAt !== undefined && {
          occurredAt: payload.occurredAt,
        }),
        updatedAt: event.timestamp,
      },
    },
  };
};

type InteractionUpdatedPayload = {
  id?: EntityId;
  type?: InteractionType;
  occurredAt?: Timestamp;
  summary?: string;
  changes?: Array<{ field: string; oldValue: string; newValue: string }>;
};

const applyInteractionUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as InteractionUpdatedPayload;
  const id = resolveEntityId(event, payload);

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
    ...(payload.type !== undefined && { type: payload.type }),
    ...(payload.occurredAt !== undefined && { occurredAt: payload.occurredAt }),
    ...(payload.summary !== undefined && { summary: payload.summary }),
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
  const id = resolveEntityId(event, payload);

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
    case "interaction.scheduled":
      return applyInteractionScheduled(doc, event);
    case "interaction.rescheduled":
      return applyInteractionRescheduled(doc, event);
    case "interaction.status.updated":
      return applyInteractionStatusUpdated(doc, event);
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
