import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type {
  CalendarEventExternalImportedPayload,
  CalendarEventExternalLinkedPayload,
  CalendarEventExternalUnlinkedPayload,
  CalendarEventExternalUpdatedPayload,
} from "../events/calendarEventPayloads";
import { createLogger } from "../utils/logger";

const logger = createLogger("CalendarEventExternalReducer");

const assertCalendarEventExists = (
  doc: AutomergeDoc,
  calendarEventId: string,
): void => {
  if (!doc.calendarEvents[calendarEventId]) {
    throw new Error(`Calendar event not found: ${calendarEventId}`);
  }
};

const assertProviderValid = (provider: string): void => {
  if (provider !== "expo-calendar") {
    throw new Error(`Unsupported external calendar provider: ${provider}`);
  }
};

const assertLinkId = (linkId: string | undefined): string => {
  if (!linkId || !linkId.trim()) {
    throw new Error("External calendar linkId is required.");
  }
  return linkId;
};

const applyExternalLinked = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as CalendarEventExternalLinkedPayload;
  assertLinkId(payload.linkId);
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);

  logger.info("External calendar linked", {
    linkId: payload.linkId,
    calendarEventId: payload.calendarEventId,
  });

  return doc;
};

const applyExternalImported = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventExternalImportedPayload;
  assertLinkId(payload.linkId);
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);

  logger.info("External calendar imported", {
    linkId: payload.linkId,
    calendarEventId: payload.calendarEventId,
  });

  return doc;
};

const applyExternalUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventExternalUpdatedPayload;
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);

  logger.info("External calendar updated", {
    calendarEventId: payload.calendarEventId,
  });

  return doc;
};

const applyExternalUnlinked = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as CalendarEventExternalUnlinkedPayload;
  assertLinkId(payload.linkId);
  if (payload.provider) {
    assertProviderValid(payload.provider);
  }
  if (payload.calendarEventId) {
    assertCalendarEventExists(doc, payload.calendarEventId);
  }

  logger.info("External calendar unlinked", {
    linkId: payload.linkId,
    calendarEventId: payload.calendarEventId,
  });

  return doc;
};

export const calendarEventExternalReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing calendar external event", { type: event.type });

  switch (event.type) {
    case "calendarEvent.externalLinked":
      return applyExternalLinked(doc, event);
    case "calendarEvent.externalImported":
      return applyExternalImported(doc, event);
    case "calendarEvent.externalUpdated":
      return applyExternalUpdated(doc, event);
    case "calendarEvent.externalUnlinked":
      return applyExternalUnlinked(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `calendarEventExternal.reducer does not handle event type: ${event.type}`,
      );
  }
};
