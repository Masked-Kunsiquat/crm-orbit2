import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";
import type { Event } from "@events/event";
import { commitExternalCalendarChanges } from "@domains/actions/externalCalendarSyncActions";
import { getDatabase } from "@domains/persistence/database";
import {
  deleteCalendarEventExternalLink,
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
  type CalendarEventExternalLinkRecord,
} from "@domains/persistence/calendarEventExternalLinks";
import { appendEvents, type PersistenceDb } from "@domains/persistence/store";
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
}: {
  link: CalendarEventExternalLinkRecord;
  calendarEvent: CalendarEvent;
  deviceId: string;
}): Promise<{
  crmToExternal: boolean;
  externalToCrm: boolean;
  unchanged: boolean;
  changes: ExternalCalendarChange[];
}> => {
  const externalEvent = await Calendar.getEventAsync(link.externalEventId);
  if (!externalEvent) {
    throw new Error("externalEventMissing");
  }
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
      changes,
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
      changes: [],
    };
  }

  await updateLinkSyncState(
    link.id,
    syncTimestamp,
    observedExternalModifiedAt,
    false,
  );

  return {
    crmToExternal: false,
    externalToCrm: false,
    unchanged: true,
    changes: [],
  };
};

export type ExternalCalendarSyncResult = {
  summary: ExternalCalendarSyncSummary;
  changes: ExternalCalendarChange[];
};

export const syncExternalCalendarLinks = async ({
  calendarId,
  calendarEvents,
  deviceId,
}: {
  calendarId: string;
  calendarEvents: CalendarEvent[];
  deviceId: string;
}): Promise<ExternalCalendarSyncResult> => {
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
  const changes: ExternalCalendarChange[] = [];

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
      });
      summary.processed += 1;
      summary.crmToExternal += result.crmToExternal ? 1 : 0;
      summary.externalToCrm += result.externalToCrm ? 1 : 0;
      summary.unchanged += result.unchanged ? 1 : 0;
      if (result.changes.length > 0) {
        changes.push(...result.changes);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "externalEventMissing") {
        try {
          await deleteCalendarEventExternalLink(getDatabase(), link.id);
          logger.info("Removed stale external calendar link.");
        } catch (removeError) {
          logger.error(
            "Failed to remove stale external calendar link.",
            removeError,
          );
        }
      }
      logger.error("Failed to sync external calendar event.", error);
      summary.errors += 1;
    }
  }

  logger.info("External linked event sync completed.", summary);
  return { summary, changes };
};

export type ExternalCalendarChangeCommitter = (
  events: Event[],
) => Promise<void>;

export const commitAndPersistExternalCalendarChanges = async ({
  changes,
  commitEvents,
  persistenceDb,
}: {
  changes: ExternalCalendarChange[];
  commitEvents: ExternalCalendarChangeCommitter;
  persistenceDb?: PersistenceDb;
}): Promise<Event[]> => {
  const events = commitExternalCalendarChanges(changes);
  if (events.length === 0) {
    return [];
  }

  await commitEvents(events);
  if (persistenceDb) {
    await appendEvents(persistenceDb, events);
  }

  return events;
};
