import type { Note } from "../domains/note";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../shared/types";

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

const resolveEntityId = <T extends { id?: EntityId }>(
  event: Event,
  payload: T,
): EntityId => {
  if (payload.id && event.entityId && payload.id !== event.entityId) {
    throw new Error(
      `Event entityId mismatch: payload=${payload.id}, event=${event.entityId}`,
    );
  }

  const entityId = payload.id ?? event.entityId;

  if (!entityId) {
    throw new Error("Event entityId is required.");
  }

  return entityId;
};

const applyNoteCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as NoteCreatedPayload;
  const id = resolveEntityId(event, payload);

  if (doc.notes[id]) {
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
    throw new Error(`Note not found: ${id}`);
  }

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

export const noteReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  switch (event.type) {
    case "note.created":
      return applyNoteCreated(doc, event);
    case "note.updated":
      return applyNoteUpdated(doc, event);
    default:
      throw new Error(`note.reducer does not handle event type: ${event.type}`);
  }
};
