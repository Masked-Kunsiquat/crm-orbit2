import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import { getDatabase } from "@domains/persistence/database";
import {
  deleteCalendarEventExternalLink,
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
  type CalendarEventExternalLinkRecord,
} from "@domains/persistence/calendarEventExternalLinks";
import type { Event } from "@events/event";
import { buildEvent } from "@events/dispatcher";
import { createLogger } from "@utils/logger";
import {
  buildCrmToExternalUpdate,
  buildExternalSnapshot,
  buildExternalToCrmEvents,
  parseIsoTimestamp,
  resolveSyncDirection,
} from "@views/utils/externalCalendarSync";

const logger = createLogger("ExternalCalendarSyncService");

export type ExternalCalendarSyncSummary = {
  processed: number;
  crmToExternal: number;
  externalToCrm: number;
  unchanged: number;
  errors: number;
};

type SyncDirection = "crmToExternal" | "externalToCrm" | "noop";

type CommitEvents = (events: Event[]) => Promise<void>;

const updateLinkSyncState = async (
  linkId: string,
  lastSyncedAt: string,
  lastExternalModifiedAt: Date | null,
  overwriteExternalModifiedAt: boolean,
): Promise<void> => {
  const nextExternalModifiedAt = overwriteExternalModifiedAt
    ? lastSyncedAt
    : lastExternalModifiedAt?.toISOString();

  await updateCalendarEventExternalLinkSyncState(getDatabase(), linkId, {
    lastSyncedAt,
    lastExternalModifiedAt: nextExternalModifiedAt ?? null,
    updatedAt: lastSyncedAt,
  });
};

const resolveLinkSyncDirection = (
  calendarEvent: CalendarEvent,
  externalModifiedAt: Date | null,
  lastSyncedAt: Date | null,
  lastExternalModifiedAt: Date | null,
): SyncDirection => {
  const crmUpdatedAt = parseIsoTimestamp(
    calendarEvent.updatedAt ?? calendarEvent.createdAt,
  );

  let direction = resolveSyncDirection(
    crmUpdatedAt,
    externalModifiedAt,
    lastSyncedAt,
    lastExternalModifiedAt,
  );

  if (
    calendarEvent.status !== "calendarEvent.status.scheduled" &&
    direction === "externalToCrm"
  ) {
    direction = "crmToExternal";
  }

  return direction;
};

const syncLink = async ({
  link,
  calendarEvent,
  deviceId,
  commitEvents,
}: {
  link: CalendarEventExternalLinkRecord;
  calendarEvent: CalendarEvent;
  deviceId: string;
  commitEvents: CommitEvents;
}): Promise<{
  crmToExternal: boolean;
  externalToCrm: boolean;
  unchanged: boolean;
}> => {
  const externalEvent = await Calendar.getEventAsync(link.externalEventId);
  const snapshot = buildExternalSnapshot(externalEvent);
  if (!snapshot) {
    throw new Error("externalEventInvalid");
  }

  const lastSyncedAt = parseIsoTimestamp(link.lastSyncedAt);
  const lastExternalModifiedAt = parseIsoTimestamp(link.lastExternalModifiedAt);
  const externalModifiedAt = snapshot.lastModifiedAt;
  const observedExternalModifiedAt =
    externalModifiedAt ?? lastExternalModifiedAt;

  const direction = resolveLinkSyncDirection(
    calendarEvent,
    externalModifiedAt,
    lastSyncedAt,
    lastExternalModifiedAt,
  );
  const syncTimestamp = new Date().toISOString();

  if (direction === "externalToCrm") {
    const eventTimestamp = externalModifiedAt?.toISOString() ?? syncTimestamp;
    const changes = buildExternalToCrmEvents(
      calendarEvent,
      snapshot,
      deviceId,
      eventTimestamp,
    );

    if (changes.length > 0) {
      const events = changes.map((change) =>
        buildEvent({
          type: change.type,
          entityId: change.entityId,
          payload: change.payload,
          timestamp: change.timestamp,
          deviceId: change.deviceId,
        }),
      );
      await commitEvents(events);
    }

    await updateLinkSyncState(
      link.id,
      syncTimestamp,
      observedExternalModifiedAt,
      false,
    );

    return {
      crmToExternal: false,
      externalToCrm: changes.length > 0,
      unchanged: changes.length === 0,
    };
  }

  if (direction === "crmToExternal") {
    const update = buildCrmToExternalUpdate(calendarEvent, snapshot);

    if (update) {
      await Calendar.updateEventAsync(link.externalEventId, update);
    }

    await updateLinkSyncState(
      link.id,
      syncTimestamp,
      observedExternalModifiedAt,
      Boolean(update),
    );

    return {
      crmToExternal: Boolean(update),
      externalToCrm: false,
      unchanged: !update,
    };
  }

  await updateLinkSyncState(
    link.id,
    syncTimestamp,
    observedExternalModifiedAt,
    false,
  );

  return { crmToExternal: false, externalToCrm: false, unchanged: true };
};

export const syncExternalCalendarLinks = async ({
  calendarId,
  calendarEvents,
  deviceId,
  commitEvents,
}: {
  calendarId: string;
  calendarEvents: CalendarEvent[];
  deviceId: string;
  commitEvents: CommitEvents;
}): Promise<ExternalCalendarSyncSummary> => {
  const links = await listExternalLinksForCalendar(getDatabase(), calendarId);
  const eventsById = new Map(calendarEvents.map((event) => [event.id, event]));
  logger.info("Loaded linked external events for sync.", {
    links: links.length,
    calendarEvents: calendarEvents.length,
  });

  const summary: ExternalCalendarSyncSummary = {
    processed: 0,
    crmToExternal: 0,
    externalToCrm: 0,
    unchanged: 0,
    errors: 0,
  };

  for (const link of links) {
    const calendarEvent = eventsById.get(link.calendarEventId);
    if (!calendarEvent) {
      logger.warn("Linked calendar event missing during sync.");
      try {
        await deleteCalendarEventExternalLink(getDatabase(), link.id);
        logger.info("Removed stale external calendar link.");
      } catch (error) {
        logger.error("Failed to remove stale external calendar link.", error);
      }
      summary.errors += 1;
      continue;
    }

    try {
      const result = await syncLink({
        link,
        calendarEvent,
        deviceId,
        commitEvents,
      });
      summary.processed += 1;
      summary.crmToExternal += result.crmToExternal ? 1 : 0;
      summary.externalToCrm += result.externalToCrm ? 1 : 0;
      summary.unchanged += result.unchanged ? 1 : 0;
    } catch (error) {
      logger.error("Failed to sync external calendar event.", error);
      summary.errors += 1;
    }
  }

  logger.info("External linked event sync completed.", summary);
  return summary;
};
