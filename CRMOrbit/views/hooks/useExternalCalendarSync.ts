import { useCallback, useMemo, useRef, useState } from "react";
import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import { getDatabase } from "@domains/persistence/database";
import { createLogger } from "@utils/logger";
import {
  deleteCalendarEventExternalLink,
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
  type CalendarEventExternalLinkRecord,
} from "@domains/persistence/calendarEventExternalLinks";
import { buildExternalEventNotes } from "../utils/externalCalendarImport";
import {
  buildExternalToCrmEvents,
  normalizeText,
  parseIsoTimestamp,
  resolveExternalDurationMinutes,
  timestampsEqual,
  type ExternalCalendarSnapshot,
} from "../utils/externalCalendarSync";
import { getStoredExternalCalendarId } from "../utils/deviceCalendar";
import { useDispatch } from "./useDispatch";
import { useDeviceId } from "./useDeviceId";

const logger = createLogger("ExternalCalendarSync");

type SyncDirection = "crmToExternal" | "externalToCrm" | "noop";

export type ExternalCalendarSyncError =
  | "permissionDenied"
  | "calendarNotSelected"
  | "syncFailed";

export type ExternalCalendarSyncSummary = {
  processed: number;
  crmToExternal: number;
  externalToCrm: number;
  unchanged: number;
  errors: number;
};

export type ExternalCalendarSyncState = {
  isSyncing: boolean;
  syncError: ExternalCalendarSyncError | null;
  syncSummary: ExternalCalendarSyncSummary | null;
  syncLinkedEvents: () => Promise<void>;
  clearErrors: () => void;
};

export type UseExternalCalendarSyncParams = {
  permissionGranted: boolean;
  calendarEvents: CalendarEvent[];
};

const parseCalendarDate = (
  value: string | Date | null | undefined,
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const buildExternalSnapshot = (
  event: Calendar.Event,
): ExternalCalendarSnapshot | null => {
  const startDate = parseCalendarDate(event.startDate);
  if (!startDate) {
    return null;
  }
  const endDate = parseCalendarDate(event.endDate) ?? startDate;
  const lastModifiedAt = parseCalendarDate(
    event.lastModifiedDate ?? event.creationDate,
  );

  return {
    externalEventId: event.id,
    calendarId: event.calendarId,
    title: event.title ?? "",
    notes: event.notes ?? "",
    location: event.location ?? undefined,
    status: event.status,
    startDate,
    endDate,
    lastModifiedAt,
  };
};

const resolveSyncDirection = (
  crmUpdatedAt: Date | null,
  externalModifiedAt: Date | null,
  lastSyncedAt: Date | null,
  lastExternalModifiedAt: Date | null,
): SyncDirection => {
  if (!crmUpdatedAt) {
    return "noop";
  }

  if (!lastSyncedAt) {
    if (externalModifiedAt && externalModifiedAt > crmUpdatedAt) {
      return "externalToCrm";
    }
    return "crmToExternal";
  }

  const crmChanged = crmUpdatedAt > lastSyncedAt;
  const externalChanged = externalModifiedAt
    ? lastExternalModifiedAt
      ? externalModifiedAt > lastExternalModifiedAt
      : externalModifiedAt > lastSyncedAt
    : false;

  if (crmChanged && externalChanged) {
    return "crmToExternal";
  }
  if (externalChanged) {
    return "externalToCrm";
  }
  if (crmChanged) {
    return "crmToExternal";
  }
  return "noop";
};

const buildCrmToExternalUpdate = (
  calendarEvent: CalendarEvent,
  external: ExternalCalendarSnapshot,
): Partial<Calendar.Event> | null => {
  const desiredTitle = calendarEvent.summary.trim();
  const desiredStart = parseIsoTimestamp(calendarEvent.scheduledFor);
  if (!desiredStart) {
    return null;
  }

  const externalDurationMinutes = resolveExternalDurationMinutes(
    external.startDate,
    external.endDate,
  );
  const desiredDurationMinutes =
    calendarEvent.durationMinutes ?? externalDurationMinutes;
  const desiredEnd = desiredDurationMinutes
    ? new Date(desiredStart.getTime() + desiredDurationMinutes * 60 * 1000)
    : external.endDate;

  const desiredNotes = buildExternalEventNotes(
    calendarEvent.description ?? "",
    calendarEvent,
  );
  const desiredLocation = calendarEvent.location?.trim() ?? "";

  const updates: Partial<Calendar.Event> = {};

  if (normalizeText(desiredTitle) !== normalizeText(external.title)) {
    updates.title = desiredTitle;
  }

  if (!timestampsEqual(desiredStart, external.startDate)) {
    updates.startDate = desiredStart;
    updates.endDate = desiredEnd;
  } else if (!timestampsEqual(desiredEnd, external.endDate)) {
    updates.endDate = desiredEnd;
  }

  if (normalizeText(desiredNotes) !== normalizeText(external.notes)) {
    updates.notes = desiredNotes;
  }

  if (normalizeText(desiredLocation) !== normalizeText(external.location)) {
    updates.location = desiredLocation;
  }

  return Object.keys(updates).length > 0 ? updates : null;
};

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

const syncLink = async ({
  link,
  calendarEvent,
  deviceId,
  dispatch,
}: {
  link: CalendarEventExternalLinkRecord;
  calendarEvent: CalendarEvent;
  deviceId: string;
  dispatch: ReturnType<typeof useDispatch>["dispatch"];
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

  const crmUpdatedAt = parseIsoTimestamp(
    calendarEvent.updatedAt ?? calendarEvent.createdAt,
  );
  const lastSyncedAt = parseIsoTimestamp(link.lastSyncedAt);
  const lastExternalModifiedAt = parseIsoTimestamp(link.lastExternalModifiedAt);
  const externalModifiedAt = snapshot.lastModifiedAt;
  const observedExternalModifiedAt =
    externalModifiedAt ?? lastExternalModifiedAt;

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

  const syncTimestamp = new Date().toISOString();

  if (direction === "externalToCrm") {
    const eventTimestamp = externalModifiedAt?.toISOString() ?? syncTimestamp;
    const events = buildExternalToCrmEvents(
      calendarEvent,
      snapshot,
      deviceId,
      eventTimestamp,
    );

    if (events.length > 0) {
      const result = dispatch(events);
      if (!result.success) {
        throw new Error(result.error ?? "dispatchFailed");
      }
    }

    await updateLinkSyncState(
      link.id,
      syncTimestamp,
      observedExternalModifiedAt,
      false,
    );

    return {
      crmToExternal: false,
      externalToCrm: events.length > 0,
      unchanged: events.length === 0,
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

export const useExternalCalendarSync = ({
  permissionGranted,
  calendarEvents,
}: UseExternalCalendarSyncParams): ExternalCalendarSyncState => {
  const deviceId = useDeviceId();
  const { dispatch } = useDispatch();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [syncError, setSyncError] = useState<ExternalCalendarSyncError | null>(
    null,
  );
  const [syncSummary, setSyncSummary] =
    useState<ExternalCalendarSyncSummary | null>(null);

  const clearErrors = useCallback(() => {
    setSyncError(null);
  }, []);

  const syncLinkedEvents = useCallback(async () => {
    if (!permissionGranted) {
      logger.warn("Sync blocked: calendar permission not granted.");
      setSyncError("permissionDenied");
      return;
    }
    if (isSyncingRef.current) {
      logger.debug("Sync already in progress; skipping.");
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);
    logger.debug("Starting external linked event sync.");

    try {
      const calendarId = await getStoredExternalCalendarId();
      if (!calendarId) {
        logger.warn("Sync blocked: no external calendar selected.");
        setSyncError("calendarNotSelected");
        return;
      }

      const links = await listExternalLinksForCalendar(
        getDatabase(),
        calendarId,
      );
      const eventsById = new Map(
        calendarEvents.map((event) => [event.id, event]),
      );
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
            logger.error(
              "Failed to remove stale external calendar link.",
              error,
            );
          }
          summary.errors += 1;
          continue;
        }

        try {
          const result = await syncLink({
            link,
            calendarEvent,
            deviceId,
            dispatch,
          });
          summary.processed += 1;
          summary.crmToExternal += result.crmToExternal ? 1 : 0;
          summary.externalToCrm += result.externalToCrm ? 1 : 0;
          summary.unchanged += result.unchanged ? 1 : 0;
        } catch (err) {
          logger.error("Failed to sync external calendar event.", err);
          summary.errors += 1;
        }
      }

      setSyncSummary(summary);
      if (summary.errors > 0) {
        setSyncError("syncFailed");
      }
      logger.info("External linked event sync completed.", summary);
    } catch (err) {
      logger.error("Failed to sync external calendar events.", err);
      setSyncError("syncFailed");
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [calendarEvents, deviceId, dispatch, permissionGranted]);

  return useMemo(
    () => ({
      isSyncing,
      syncError,
      syncSummary,
      syncLinkedEvents,
      clearErrors,
    }),
    [isSyncing, syncError, syncSummary, syncLinkedEvents, clearErrors],
  );
};
