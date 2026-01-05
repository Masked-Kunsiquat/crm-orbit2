import type {
  EntityLink,
  EntityLinkSourceType,
  EntityLinkType,
} from "../domains/relations/entityLink";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("EntityLinkReducer");

type EntityLinkPayload = {
  id?: EntityId;
  entityType: EntityLinkType;
  entityId: EntityId;
  noteId?: EntityId;
  interactionId?: EntityId;
};

const ensureEntityExists = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId,
): void => {
  switch (entityType) {
    case "organization":
      if (!doc.organizations[entityId]) {
        throw new Error(`Organization not found: ${entityId}`);
      }
      return;
    case "account":
      if (!doc.accounts[entityId]) {
        throw new Error(`Account not found: ${entityId}`);
      }
      return;
    case "audit":
      if (!doc.audits[entityId]) {
        throw new Error(`Audit not found: ${entityId}`);
      }
      return;
    case "contact":
      if (!doc.contacts[entityId]) {
        throw new Error(`Contact not found: ${entityId}`);
      }
      return;
    case "note":
      if (!doc.notes[entityId]) {
        throw new Error(`Note not found: ${entityId}`);
      }
      return;
    case "interaction":
      if (!doc.interactions[entityId]) {
        throw new Error(`Interaction not found: ${entityId}`);
      }
      return;
    default: {
      const exhaustive: never = entityType;
      throw new Error(`Unsupported entity link type: ${exhaustive}`);
    }
  }
};

const ensureSourceExists = (
  doc: AutomergeDoc,
  linkType: EntityLinkSourceType,
  sourceId: EntityId,
): void => {
  if (linkType === "note") {
    if (!doc.notes[sourceId]) {
      throw new Error(`Note not found: ${sourceId}`);
    }
    return;
  }

  if (!doc.interactions[sourceId]) {
    throw new Error(`Interaction not found: ${sourceId}`);
  }
};

const findExistingLinkId = (
  doc: AutomergeDoc,
  linkType: EntityLinkSourceType,
  sourceId: EntityId,
  entityType: EntityLinkType,
  entityId: EntityId,
): EntityId | undefined => {
  return Object.keys(doc.relations.entityLinks).find((id) => {
    const link = doc.relations.entityLinks[id];
    if (link.linkType !== linkType) {
      return false;
    }
    if (linkType === "note" && link.noteId !== sourceId) {
      return false;
    }
    if (linkType === "interaction" && link.interactionId !== sourceId) {
      return false;
    }
    return link.entityType === entityType && link.entityId === entityId;
  });
};

const resolveLinkType = (event: Event): EntityLinkSourceType => {
  if (event.type.startsWith("note.")) {
    return "note";
  }
  if (event.type.startsWith("interaction.")) {
    return "interaction";
  }
  throw new Error(`Unsupported entity link event: ${event.type}`);
};

const resolveSourceId = (
  linkType: EntityLinkSourceType,
  payload: EntityLinkPayload,
): EntityId => {
  if (linkType === "note" && payload.noteId) {
    return payload.noteId;
  }
  if (linkType === "interaction" && payload.interactionId) {
    return payload.interactionId;
  }
  throw new Error(`${linkType}Id is required for linking.`);
};

const applyEntityLinked = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as EntityLinkPayload;
  const id = resolveEntityId(event, payload);
  const linkType = resolveLinkType(event);
  const sourceId = resolveSourceId(linkType, payload);

  logger.debug("Linking entity", {
    id,
    linkType,
    sourceId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  ensureSourceExists(doc, linkType, sourceId);
  ensureEntityExists(doc, payload.entityType, payload.entityId);

  if (doc.relations.entityLinks[id]) {
    logger.error("EntityLink already exists", { id });
    throw new Error(`EntityLink already exists: ${id}`);
  }

  const existingId = findExistingLinkId(
    doc,
    linkType,
    sourceId,
    payload.entityType,
    payload.entityId,
  );

  if (existingId) {
    logger.error("Duplicate entity link", {
      linkType,
      sourceId,
      entityType: payload.entityType,
      entityId: payload.entityId,
    });
    throw new Error(
      `EntityLink already exists for ${linkType}=${sourceId} entityType=${payload.entityType} entityId=${payload.entityId}`,
    );
  }

  const link: EntityLink = {
    linkType,
    entityType: payload.entityType,
    entityId: payload.entityId,
    ...(linkType === "note"
      ? { noteId: sourceId }
      : { interactionId: sourceId }),
  };

  logger.info("Entity linked", {
    id,
    linkType,
    sourceId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  return {
    ...doc,
    relations: {
      ...doc.relations,
      entityLinks: {
        ...doc.relations.entityLinks,
        [id]: link,
      },
    },
  };
};

const applyEntityUnlinked = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as EntityLinkPayload;
  const linkType = resolveLinkType(event);
  const sourceId = linkType === "note" ? payload.noteId : payload.interactionId;
  const id =
    payload.id ??
    event.entityId ??
    (sourceId && payload.entityType && payload.entityId
      ? findExistingLinkId(
          doc,
          linkType,
          sourceId,
          payload.entityType,
          payload.entityId,
        )
      : undefined);

  if (!id) {
    logger.error("EntityLink id is required for unlinking", { linkType });
    throw new Error("EntityLink id is required.");
  }

  if (!doc.relations.entityLinks[id]) {
    logger.error("EntityLink not found for unlinking", { id });
    throw new Error(`EntityLink not found: ${id}`);
  }

  logger.info("Entity unlinked", {
    id,
    linkType,
    sourceId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  const nextLinks = { ...doc.relations.entityLinks };
  delete nextLinks[id];

  return {
    ...doc,
    relations: {
      ...doc.relations,
      entityLinks: nextLinks,
    },
  };
};

export const entityLinkReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "note.linked":
    case "interaction.linked":
      return applyEntityLinked(doc, event);
    case "note.unlinked":
    case "interaction.unlinked":
      return applyEntityUnlinked(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `entityLink.reducer does not handle event type: ${event.type}`,
      );
  }
};
