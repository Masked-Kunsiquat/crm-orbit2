import { useCallback, useMemo, useState } from "react";
import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import type { Timestamp } from "@domains/shared/types";
import { buildEvent } from "@events/dispatcher";
import { getDatabase } from "@domains/persistence/database";
import {
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
  type CalendarEventExternalLinkRecord,
} from "@domains/persistence/calendarEventExternalLinks";
import {
  buildExternalEventNotes,
  stripCrmOrbitMetadataFromNotes,
} from "../utils/externalCalendarImport";
import { getStoredExternalCalendarId } from "../utils/deviceCalendar";
import { useDispatch } from "./useDispatch";
import { useDeviceId } from "./useDeviceId";

const TIMESTAMP_EPSILON_MS = 1000;

type SyncDirection = "crmToExternal" | "externalToCrm" | "noop";

type ExternalCalendarSnapshot = {
  externalEventId: string;
  calendarId: string;
  title: string;
  notes: string;
  location?: string;
  status: Calendar.EventStatus;
  startDate: Date;
  endDate: Date;
  lastModifiedAt: Date | null;
};

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

const parseIsoTimestamp = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed;
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

const normalizeText = (value: string | null | undefined): string =>
  value?.trim() ?? "";

const timestampsEqual = (left: Date, right: Date): boolean =>
  Math.abs(left.getTime() - right.getTime()) < TIMESTAMP_EPSILON_MS;

const resolveExternalDurationMinutes = (
  start: Date,
  end: Date,
): number | undefined => {
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return undefined;
  }
  return Math.round(diffMs / (60 * 1000));
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

const buildExternalToCrmEvents = (
  calendarEvent: CalendarEvent,
  external: ExternalCalendarSnapshot,
  deviceId: string,
  timestamp: Timestamp,
) => {
  if (external.status === Calendar.EventStatus.CANCELED) {
    if (calendarEvent.status !== "calendarEvent.status.canceled") {
      return [
        buildEvent({
          type: "calendarEvent.canceled",
          entityId: calendarEvent.id,
          payload: { id: calendarEvent.id },
          timestamp,
          deviceId,
        }),
      ];
    }
    return [];
  }

  const events = [];
  const internalStart = parseIsoTimestamp(calendarEvent.scheduledFor);

  if (internalStart && !timestampsEqual(internalStart, external.startDate)) {
    events.push(
      buildEvent({
        type: "calendarEvent.rescheduled",
        entityId: calendarEvent.id,
        payload: {
          id: calendarEvent.id,
          scheduledFor: external.startDate.toISOString(),
        },
        timestamp,
        deviceId,
      }),
    );
  }

  const externalDurationMinutes = resolveExternalDurationMinutes(
    external.startDate,
    external.endDate,
  );

  const externalDescription = stripCrmOrbitMetadataFromNotes(external.notes);
  const hasDescriptionChange =
    normalizeText(externalDescription) !==
    normalizeText(calendarEvent.description);
  const trimmedExternalTitle = external.title.trim();
  const hasSummaryChange =
    trimmedExternalTitle.length > 0 &&
    normalizeText(trimmedExternalTitle) !==
      normalizeText(calendarEvent.summary);
  const hasLocationChange =
    normalizeText(external.location) !== normalizeText(calendarEvent.location);
  const hasDurationChange =
    externalDurationMinutes !== undefined &&
    externalDurationMinutes !== calendarEvent.durationMinutes;

  if (
    hasSummaryChange ||
    hasDescriptionChange ||
    hasLocationChange ||
    hasDurationChange
  ) {
    const payload: Record<string, unknown> = {
      id: calendarEvent.id,
    };

    if (hasSummaryChange) {
      payload.summary = trimmedExternalTitle;
    }
    if (hasDescriptionChange) {
      payload.description = externalDescription;
    }
    if (hasLocationChange) {
      payload.location = external.location ? external.location.trim() : "";
    }
    if (hasDurationChange) {
      payload.durationMinutes = externalDurationMinutes;
    }

    events.push(
      buildEvent({
        type: "calendarEvent.updated",
        entityId: calendarEvent.id,
        payload,
        timestamp,
        deviceId,
      }),
    );
  }

  return events;
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
      setSyncError("permissionDenied");
      return;
    }
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);

    try {
      const calendarId = await getStoredExternalCalendarId();
      if (!calendarId) {
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
          console.error("Failed to sync external calendar event.", err);
          summary.errors += 1;
        }
      }

      setSyncSummary(summary);
      if (summary.errors > 0) {
        setSyncError("syncFailed");
      }
    } catch (err) {
      console.error("Failed to sync external calendar events.", err);
      setSyncError("syncFailed");
    } finally {
      setIsSyncing(false);
    }
  }, [calendarEvents, deviceId, dispatch, isSyncing, permissionGranted]);

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
