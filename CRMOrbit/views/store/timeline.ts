import type { AutomergeDoc } from "@automerge/schema";
import type { Event } from "@events/event";
import type { Interaction } from "@domains/interaction";
import type { Note } from "@domains/note";
import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId, Timestamp } from "@domains/shared/types";

export type TimelineEntityType = EntityLinkType;

export type TimelineItem =
  | {
      kind: "event";
      timestamp: Timestamp;
      event: Event;
    }
  | {
      kind: "note";
      timestamp: Timestamp;
      note: Note;
    }
  | {
      kind: "interaction";
      timestamp: Timestamp;
      interaction: Interaction;
    };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getPayloadId = (
  payload: Record<string, unknown>,
  key: string,
): string | null =>
  typeof payload[key] === "string" ? (payload[key] as string) : null;

const isEventRelatedToEntity = (
  event: Event,
  entityType: TimelineEntityType,
  entityId: EntityId,
): boolean => {
  if (event.entityId === entityId) {
    return true;
  }

  if (!isObject(event.payload)) {
    return false;
  }

  const payloadId = getPayloadId(event.payload, "id");
  if (payloadId === entityId) {
    return true;
  }

  const payloadEntityId = getPayloadId(event.payload, "entityId");
  const payloadEntityType = getPayloadId(event.payload, "entityType");
  if (payloadEntityId === entityId && payloadEntityType === entityType) {
    return true;
  }

  if (entityType === "organization") {
    return getPayloadId(event.payload, "organizationId") === entityId;
  }

  if (entityType === "account") {
    return getPayloadId(event.payload, "accountId") === entityId;
  }

  if (entityType === "contact") {
    return getPayloadId(event.payload, "contactId") === entityId;
  }

  if (entityType === "note") {
    return getPayloadId(event.payload, "noteId") === entityId;
  }

  if (entityType === "interaction") {
    return (
      getPayloadId(event.payload, "interactionId") === entityId ||
      payloadId === entityId
    );
  }

  return false;
};

export const buildTimelineForEntity = (
  doc: AutomergeDoc,
  events: Event[],
  entityType: TimelineEntityType,
  entityId: EntityId,
): TimelineItem[] => {
  const items: TimelineItem[] = [];

  for (const event of events) {
    if (isEventRelatedToEntity(event, entityType, entityId)) {
      items.push({
        kind: "event",
        timestamp: event.timestamp,
        event,
      });
    }
  }

  for (const link of Object.values(doc.relations.entityLinks)) {
    if (link.entityType !== entityType || link.entityId !== entityId) {
      continue;
    }

    if (link.linkType === "note" && link.noteId) {
      const note = doc.notes[link.noteId];
      if (!note) {
        continue;
      }

      items.push({
        kind: "note",
        timestamp: note.createdAt,
        note,
      });
    }

    if (link.linkType === "interaction" && link.interactionId) {
      const interaction = doc.interactions[link.interactionId];
      if (!interaction) {
        continue;
      }

      items.push({
        kind: "interaction",
        timestamp: interaction.occurredAt,
        interaction,
      });
    }
  }

  if (entityType === "interaction") {
    const interaction = doc.interactions[entityId];
    if (interaction) {
      items.push({
        kind: "interaction",
        timestamp: interaction.occurredAt,
        interaction,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      const aId =
        a.kind === "event"
          ? a.event.id
          : a.kind === "note"
            ? a.note.id
            : a.interaction.id;
      const bId =
        b.kind === "event"
          ? b.event.id
          : b.kind === "note"
            ? b.note.id
            : b.interaction.id;
      return aId.localeCompare(bId);
    }

    return a.timestamp.localeCompare(b.timestamp);
  });
};
