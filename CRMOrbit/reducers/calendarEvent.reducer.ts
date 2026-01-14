import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type {
  CalendarEvent,
  CalendarEventStatus,
} from "../domains/calendarEvent";
import {
  buildCalendarEventFromScheduledPayload,
  type CalendarEventScheduledPayload,
  type CalendarEventUpdatedPayload,
  type CalendarEventCompletedPayload,
  type CalendarEventCanceledPayload,
  type CalendarEventRescheduledPayload,
  type CalendarEventDeletedPayload,
  type CalendarEventLinkedPayload,
  type CalendarEventUnlinkedPayload,
  type CalendarEventRecurrenceCreatedPayload,
  type CalendarEventRecurrenceUpdatedPayload,
  type CalendarEventRecurrenceDeletedPayload,
} from "../events/calendarEventPayloads";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("CalendarEventReducer");

const VALID_STATUSES: CalendarEventStatus[] = [
  "calendarEvent.status.scheduled",
  "calendarEvent.status.completed",
  "calendarEvent.status.canceled",
];

type LegacyCalendarEventStatus = "scheduled" | "completed" | "canceled";

const normalizeStatus = (
  status: CalendarEventStatus | LegacyCalendarEventStatus | undefined,
): CalendarEventStatus | undefined => {
  if (!status) {
    return undefined;
  }
  switch (status) {
    case "scheduled":
      return "calendarEvent.status.scheduled";
    case "completed":
      return "calendarEvent.status.completed";
    case "canceled":
      return "calendarEvent.status.canceled";
    default:
      return status;
  }
};

const assertStatusValid = (
  status: CalendarEventStatus | LegacyCalendarEventStatus | undefined,
): CalendarEventStatus | undefined => {
  const normalized = normalizeStatus(status);
  if (!normalized) return undefined;
  if (!VALID_STATUSES.includes(normalized)) {
    throw new Error(`Invalid calendar event status: ${status}`);
  }
  return normalized;
};

const resolveDurationMinutes = (
  durationMinutes: number | undefined,
): number | undefined => {
  if (durationMinutes == null) {
    return undefined;
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error(
      "Calendar event durationMinutes must be a positive integer.",
    );
  }
  return durationMinutes;
};

/**
 * calendarEvent.scheduled
 * Creates a new calendar event (replaces interaction.scheduled, interaction.logged, audit.created)
 */
const applyCalendarEventScheduled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventScheduledPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Creating calendar event", { id, type: payload.type });

  if (doc.calendarEvents[id]) {
    logger.error("Calendar event already exists", { id });
    throw new Error(`Calendar event already exists: ${id}`);
  }

  if (!payload.scheduledFor) {
    throw new Error("Calendar event scheduledFor is required.");
  }

  // Validate audit-specific requirements
  if (payload.type === "audit" && !payload.accountId) {
    throw new Error("Audit events require accountId.");
  }

  const normalizedStatus = assertStatusValid(payload.status);
  const durationMinutes = resolveDurationMinutes(payload.durationMinutes);

  const calendarEvent = buildCalendarEventFromScheduledPayload(
    {
      ...payload,
      durationMinutes,
      ...(normalizedStatus && { status: normalizedStatus }),
    },
    event.timestamp,
  );

  logger.info("Calendar event created", {
    id,
    type: payload.type,
    scheduledFor: payload.scheduledFor,
  });

  const updatedDoc: AutomergeDoc = {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: calendarEvent,
    },
  };

  // Create entity links if provided
  if (payload.linkedEntities && payload.linkedEntities.length > 0) {
    const newLinks = { ...doc.relations.entityLinks };

    payload.linkedEntities.forEach((link) => {
      if (!link.linkId) {
        throw new Error("Linked entities require a linkId.");
      }
      if (newLinks[link.linkId]) {
        throw new Error(`Entity link already exists: ${link.linkId}`);
      }
      newLinks[link.linkId] = {
        linkType: "calendarEvent",
        calendarEventId: id,
        entityType: link.entityType,
        entityId: link.entityId,
      };
    });

    updatedDoc.relations = {
      ...doc.relations,
      entityLinks: newLinks,
    };
  }

  return updatedDoc;
};

/**
 * calendarEvent.updated
 * Updates mutable fields (type, summary, description, duration, location)
 */
const applyCalendarEventUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventUpdatedPayload;
  const id = resolveEntityId(event, payload);

  if (!id) {
    logger.error("Missing entityId in calendarEvent.updated event");
    throw new Error("Missing entityId in calendarEvent.updated event");
  }

  const existing = doc.calendarEvents[id];
  if (!existing) {
    logger.error("Calendar event not found for update", { id });
    throw new Error(`Calendar event not found: ${id}`);
  }

  logger.debug("Updating calendar event", { id });

  const durationMinutes = resolveDurationMinutes(payload.durationMinutes);

  const nextType = payload.type ?? existing.type;
  const updated: CalendarEvent = {
    ...existing,
    ...(payload.type !== undefined && { type: payload.type }),
    ...(payload.summary !== undefined && { summary: payload.summary }),
    ...(payload.description !== undefined && {
      description: payload.description,
    }),
    ...(durationMinutes !== undefined && { durationMinutes }),
    ...(payload.location !== undefined && { location: payload.location }),
    updatedAt: event.timestamp,
  };

  if (nextType === "audit") {
    const accountId = payload.accountId ?? existing.auditData?.accountId;
    if (!accountId) {
      throw new Error("Audit events require accountId for updates.");
    }
    if (
      payload.accountId !== undefined ||
      payload.score !== undefined ||
      payload.floorsVisited !== undefined ||
      !existing.auditData
    ) {
      updated.auditData = {
        ...existing.auditData,
        accountId,
        ...(payload.score !== undefined && { score: payload.score }),
        ...(payload.floorsVisited !== undefined && {
          floorsVisited: payload.floorsVisited,
        }),
      };
    }
  }

  logger.info("Calendar event updated", { id });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.completed
 * Marks event as completed, sets occurredAt, optionally updates audit data
 */
const applyCalendarEventCompleted = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventCompletedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  logger.debug("Completing calendar event", {
    id,
    occurredAt: payload.occurredAt,
  });

  if (!payload.occurredAt) {
    throw new Error("Calendar event occurredAt is required when completing.");
  }

  const updated: CalendarEvent = {
    ...existing,
    status: "calendarEvent.status.completed",
    occurredAt: payload.occurredAt,
    updatedAt: event.timestamp,
  };

  // Update description if provided
  if (payload.description) {
    updated.description = payload.description;
  }

  // Update audit-specific data if this is an audit
  if (existing.type === "audit") {
    const accountId = payload.accountId ?? existing.auditData?.accountId;
    if (!accountId) {
      throw new Error("Audit events require accountId when completing.");
    }
    updated.auditData = {
      ...existing.auditData,
      accountId,
      ...(payload.score !== undefined && { score: payload.score }),
      ...(payload.floorsVisited !== undefined && {
        floorsVisited: payload.floorsVisited,
      }),
    };
  }

  logger.info("Calendar event completed", {
    id,
    occurredAt: payload.occurredAt,
  });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.canceled
 * Marks event as canceled
 */
const applyCalendarEventCanceled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventCanceledPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  logger.debug("Canceling calendar event", { id });

  const updated: CalendarEvent = {
    ...existing,
    status: "calendarEvent.status.canceled",
    updatedAt: event.timestamp,
  };

  if (existing.type === "audit") {
    const accountId = payload.accountId ?? existing.auditData?.accountId;
    if (!accountId) {
      throw new Error("Audit events require accountId when canceling.");
    }
    updated.auditData = {
      ...existing.auditData,
      accountId,
      ...(payload.score !== undefined && { score: payload.score }),
      ...(payload.floorsVisited !== undefined && {
        floorsVisited: payload.floorsVisited,
      }),
    };
  }

  logger.info("Calendar event canceled", { id });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.rescheduled
 * Updates scheduledFor timestamp
 */
const applyCalendarEventRescheduled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventRescheduledPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  if (!payload.scheduledFor) {
    throw new Error("Calendar event scheduledFor is required.");
  }

  logger.debug("Rescheduling calendar event", {
    id,
    newTime: payload.scheduledFor,
  });

  const updated: CalendarEvent = {
    ...existing,
    status: "calendarEvent.status.scheduled",
    occurredAt: undefined,
    scheduledFor: payload.scheduledFor,
    updatedAt: event.timestamp,
  };

  logger.info("Calendar event rescheduled", {
    id,
    scheduledFor: payload.scheduledFor,
  });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.deleted
 * Removes calendar event and all associated entity links
 */
const applyCalendarEventDeleted = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventDeletedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Deleting calendar event", { id });

  if (!doc.calendarEvents[id]) {
    logger.error("Calendar event not found for deletion", { id });
    throw new Error(`Calendar event not found: ${id}`);
  }

  // Remove calendar event
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _deleted, ...remainingEvents } = doc.calendarEvents;

  // Remove all entity links for this calendar event
  const remainingLinks = Object.entries(doc.relations.entityLinks).reduce(
    (acc, [linkId, link]) => {
      if (link.linkType !== "calendarEvent" || link.calendarEventId !== id) {
        acc[linkId] = link;
      }
      return acc;
    },
    {} as AutomergeDoc["relations"]["entityLinks"],
  );

  logger.info("Calendar event deleted", { id });

  return {
    ...doc,
    calendarEvents: remainingEvents,
    relations: {
      ...doc.relations,
      entityLinks: remainingLinks,
    },
  };
};

/**
 * calendarEvent.linked
 * Creates an entity link for this calendar event
 */
const applyCalendarEventLinked = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventLinkedPayload;
  const calendarEventId = payload.calendarEventId;

  logger.debug("Linking calendar event", {
    calendarEventId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  // Validate calendar event exists
  if (!doc.calendarEvents[calendarEventId]) {
    throw new Error(`Calendar event not found: ${calendarEventId}`);
  }

  const linkId = payload.linkId;

  if (doc.relations.entityLinks[linkId]) {
    throw new Error(`Entity link already exists: ${linkId}`);
  }

  const newLink = {
    linkType: "calendarEvent" as const,
    calendarEventId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  };

  logger.info("Calendar event linked", { calendarEventId, linkId });

  return {
    ...doc,
    relations: {
      ...doc.relations,
      entityLinks: {
        ...doc.relations.entityLinks,
        [linkId]: newLink,
      },
    },
  };
};

/**
 * calendarEvent.unlinked
 * Removes an entity link for this calendar event
 */
const applyCalendarEventUnlinked = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventUnlinkedPayload;
  const linkId = payload.linkId;

  logger.debug("Unlinking calendar event", { linkId });

  if (!doc.relations.entityLinks[linkId]) {
    logger.error("Entity link not found for deletion", { linkId });
    throw new Error(`Entity link not found: ${linkId}`);
  }

  // Validate it's a calendar event link
  const link = doc.relations.entityLinks[linkId];
  if (link.linkType !== "calendarEvent") {
    throw new Error(`Link ${linkId} is not a calendar event link`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [linkId]: _deleted, ...remainingLinks } = doc.relations.entityLinks;

  logger.info("Calendar event unlinked", { linkId });

  return {
    ...doc,
    relations: {
      ...doc.relations,
      entityLinks: remainingLinks,
    },
  };
};

/**
 * calendarEvent.recurrence.created
 * Adds a recurrence rule to a calendar event
 */
const applyCalendarEventRecurrenceCreated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventRecurrenceCreatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  if (existing.recurrenceRule) {
    throw new Error(
      `Calendar event ${id} already has a recurrence rule. Use calendarEvent.recurrence.updated instead.`,
    );
  }

  logger.debug("Adding recurrence rule to calendar event", { id });

  const updated: CalendarEvent = {
    ...existing,
    recurrenceRule: payload.recurrenceRule,
    updatedAt: event.timestamp,
  };

  logger.info("Recurrence rule added", { id });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.recurrence.updated
 * Updates the recurrence rule of a calendar event
 */
const applyCalendarEventRecurrenceUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventRecurrenceUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  if (!existing.recurrenceRule) {
    throw new Error(
      `Calendar event ${id} does not have a recurrence rule. Use calendarEvent.recurrence.created instead.`,
    );
  }

  logger.debug("Updating recurrence rule", { id });

  const updated: CalendarEvent = {
    ...existing,
    recurrenceRule: payload.recurrenceRule,
    updatedAt: event.timestamp,
  };

  logger.info("Recurrence rule updated", { id });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * calendarEvent.recurrence.deleted
 * Removes the recurrence rule from a calendar event
 */
const applyCalendarEventRecurrenceDeleted = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventRecurrenceDeletedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.calendarEvents[id];

  if (!existing) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  logger.debug("Removing recurrence rule", { id });

  const updated: CalendarEvent = {
    ...existing,
    recurrenceRule: undefined,
    updatedAt: event.timestamp,
  };

  logger.info("Recurrence rule deleted", { id });

  return {
    ...doc,
    calendarEvents: {
      ...doc.calendarEvents,
      [id]: updated,
    },
  };
};

/**
 * Main calendar event reducer
 * Routes events to appropriate handlers
 */
export const calendarEventReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "calendarEvent.scheduled":
      return applyCalendarEventScheduled(doc, event);
    case "calendarEvent.updated":
      return applyCalendarEventUpdated(doc, event);
    case "calendarEvent.completed":
      return applyCalendarEventCompleted(doc, event);
    case "calendarEvent.canceled":
      return applyCalendarEventCanceled(doc, event);
    case "calendarEvent.rescheduled":
      return applyCalendarEventRescheduled(doc, event);
    case "calendarEvent.deleted":
      return applyCalendarEventDeleted(doc, event);
    case "calendarEvent.linked":
      return applyCalendarEventLinked(doc, event);
    case "calendarEvent.unlinked":
      return applyCalendarEventUnlinked(doc, event);
    case "calendarEvent.recurrence.created":
      return applyCalendarEventRecurrenceCreated(doc, event);
    case "calendarEvent.recurrence.updated":
      return applyCalendarEventRecurrenceUpdated(doc, event);
    case "calendarEvent.recurrence.deleted":
      return applyCalendarEventRecurrenceDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `calendarEvent.reducer does not handle event type: ${event.type}`,
      );
  }
};
