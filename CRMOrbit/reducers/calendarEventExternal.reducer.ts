import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type {
  CalendarEventExternalImportedPayload,
  CalendarEventExternalLinkedPayload,
  CalendarEventExternalUnlinkedPayload,
  CalendarEventExternalUpdatedPayload,
} from "../events/calendarEventPayloads";
import type { ExternalCalendarProvider } from "../domains/relations/calendarEventExternalLink";

const assertCalendarEventExists = (
  doc: AutomergeDoc,
  calendarEventId: string,
): void => {
  if (!doc.calendarEvents[calendarEventId]) {
    throw new Error(`Calendar event not found: ${calendarEventId}`);
  }
};

const assertProviderValid = (provider: ExternalCalendarProvider): void => {
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

const validateExternalLinked = (doc: AutomergeDoc, event: Event): void => {
  const payload = event.payload as CalendarEventExternalLinkedPayload;
  assertLinkId(payload.linkId);
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);
};

const validateExternalImported = (doc: AutomergeDoc, event: Event): void => {
  const payload = event.payload as CalendarEventExternalImportedPayload;
  assertLinkId(payload.linkId);
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);
};

const validateExternalUpdated = (doc: AutomergeDoc, event: Event): void => {
  const payload = event.payload as CalendarEventExternalUpdatedPayload;
  assertProviderValid(payload.provider);
  assertCalendarEventExists(doc, payload.calendarEventId);
};

const validateExternalUnlinked = (doc: AutomergeDoc, event: Event): void => {
  const payload = event.payload as CalendarEventExternalUnlinkedPayload;
  assertLinkId(payload.linkId);
  if (payload.provider) {
    assertProviderValid(payload.provider);
  }
  if (payload.calendarEventId) {
    assertCalendarEventExists(doc, payload.calendarEventId);
  }
};

export const calendarEventExternalReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  // External link details live in the local persistence table, not Automerge.
  // These events are validated here to keep reducers deterministic and pure.
  switch (event.type) {
    case "calendarEvent.externalLinked":
      validateExternalLinked(doc, event);
      return doc;
    case "calendarEvent.externalImported":
      validateExternalImported(doc, event);
      return doc;
    case "calendarEvent.externalUpdated":
      validateExternalUpdated(doc, event);
      return doc;
    case "calendarEvent.externalUnlinked":
      validateExternalUnlinked(doc, event);
      return doc;
    default:
      throw new Error(
        `calendarEventExternal.reducer does not handle event type: ${event.type}`,
      );
  }
};
