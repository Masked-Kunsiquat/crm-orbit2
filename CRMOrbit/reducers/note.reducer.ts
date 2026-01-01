import type { AutomergeDoc } from "../automerge/schema";
import type { Note } from "../domains/note";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("NoteReducer");

type NoteCreatedPayload = {
  id: EntityId;
  title: string;
  body: string;
  createdAt?: string;
};

type NoteUpdatedPayload = {
  id?: EntityId;
  title?: string;
  body?: string;
};

const applyNoteCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as NoteCreatedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Creating note", { id, title: payload.title });

  if (doc.notes[id]) {
    logger.error("Note already exists", { id });
    throw new Error(`Note already exists: ${id}`);
  }

  const createdAt = payload.createdAt ?? event.timestamp;

  const note: Note = {
    id,
    title: payload.title,
    body: payload.body,
    createdAt,
    updatedAt: event.timestamp,
  };

  logger.info("Note created", { id, title: payload.title });

  return {
    ...doc,
    notes: {
      ...doc.notes,
      [id]: note,
    },
  };
};

const applyNoteUpdated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as NoteUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.notes[id] as Note | undefined;

  if (!existing) {
    logger.error("Note not found for update", { id });
    throw new Error(`Note not found: ${id}`);
  }

  logger.debug("Updating note", { id, updates: payload });

  return {
    ...doc,
    notes: {
      ...doc.notes,
      [id]: {
        ...existing,
        title: payload.title ?? existing.title,
        body: payload.body ?? existing.body,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyNoteDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.notes[id] as Note | undefined;

  if (!existing) {
    logger.error("Note not found for deletion", { id });
    throw new Error(`Note not found: ${id}`);
  }

  logger.info("Note deleted", { id });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingNotes } = doc.notes;

  const remainingLinks = Object.entries(doc.relations.noteLinks).reduce(
    (acc, [linkId, link]) => {
      if (link.noteId !== id) {
        acc[linkId] = link;
      }
      return acc;
    },
    {} as AutomergeDoc["relations"]["noteLinks"],
  );

  logger.debug("Removed note links", {
    noteId: id,
    linksRemoved:
      Object.keys(doc.relations.noteLinks).length -
      Object.keys(remainingLinks).length,
  });

  return {
    ...doc,
    notes: remainingNotes,
    relations: {
      ...doc.relations,
      noteLinks: remainingLinks,
    },
  };
};

export const noteReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "note.created":
      return applyNoteCreated(doc, event);
    case "note.updated":
      return applyNoteUpdated(doc, event);
    case "note.deleted":
      return applyNoteDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(`note.reducer does not handle event type: ${event.type}`);
  }
};
