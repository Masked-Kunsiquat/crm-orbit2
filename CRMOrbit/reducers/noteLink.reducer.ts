import type {
  NoteLink,
  NoteLinkEntityType,
} from "../domains/relations/noteLink";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";

type NoteLinkedPayload = {
  id?: EntityId;
  noteId: EntityId;
  entityType: NoteLinkEntityType;
  entityId: EntityId;
};

const ensureEntityExists = (
  doc: AutomergeDoc,
  entityType: NoteLinkEntityType,
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
      throw new Error(`Unsupported note link entity type: ${exhaustive}`);
    }
  }
};

const findExistingLinkId = (
  doc: AutomergeDoc,
  noteId: EntityId,
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): EntityId | undefined => {
  return Object.keys(doc.relations.noteLinks).find((id) => {
    const link = doc.relations.noteLinks[id];
    return (
      link.noteId === noteId &&
      link.entityType === entityType &&
      link.entityId === entityId
    );
  });
};

const applyNoteLinked = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as NoteLinkedPayload;
  const id = resolveEntityId(event, payload);

  if (!doc.notes[payload.noteId]) {
    throw new Error(`Note not found: ${payload.noteId}`);
  }

  ensureEntityExists(doc, payload.entityType, payload.entityId);

  if (doc.relations.noteLinks[id]) {
    throw new Error(`NoteLink already exists: ${id}`);
  }

  const existingId = findExistingLinkId(
    doc,
    payload.noteId,
    payload.entityType,
    payload.entityId,
  );

  if (existingId) {
    throw new Error(
      `NoteLink already exists for note=${payload.noteId} entityType=${payload.entityType} entityId=${payload.entityId}`,
    );
  }

  const link: NoteLink = {
    noteId: payload.noteId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  };

  return {
    ...doc,
    relations: {
      ...doc.relations,
      noteLinks: {
        ...doc.relations.noteLinks,
        [id]: link,
      },
    },
  };
};

const applyNoteUnlinked = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as NoteLinkedPayload;
  const id =
    payload.id ??
    event.entityId ??
    findExistingLinkId(
      doc,
      payload.noteId,
      payload.entityType,
      payload.entityId,
    );

  if (!id) {
    throw new Error("NoteLink id is required.");
  }

  if (!doc.relations.noteLinks[id]) {
    throw new Error(`NoteLink not found: ${id}`);
  }

  const nextLinks = { ...doc.relations.noteLinks };
  delete nextLinks[id];

  return {
    ...doc,
    relations: {
      ...doc.relations,
      noteLinks: nextLinks,
    },
  };
};

export const noteLinkReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  switch (event.type) {
    case "note.linked":
      return applyNoteLinked(doc, event);
    case "note.unlinked":
      return applyNoteUnlinked(doc, event);
    default:
      throw new Error(
        `noteLink.reducer does not handle event type: ${event.type}`,
      );
  }
};
