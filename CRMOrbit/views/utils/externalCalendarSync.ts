import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";
import type { Timestamp } from "@domains/shared/types";
import {
  buildExternalEventNotes,
  stripCrmOrbitMetadataFromNotes,
} from "./externalCalendarImport";

const TIMESTAMP_EPSILON_MS = 1000;

export type ExternalCalendarSnapshot = {
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

export const parseIsoTimestamp = (
  value: string | null | undefined,
): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export const normalizeText = (value: string | null | undefined): string =>
  value?.trim() ?? "";

export const timestampsEqual = (left: Date, right: Date): boolean =>
  Math.abs(left.getTime() - right.getTime()) < TIMESTAMP_EPSILON_MS;

export const resolveExternalDurationMinutes = (
  start: Date,
  end: Date,
): number | undefined => {
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return undefined;
  }
  return Math.round(diffMs / (60 * 1000));
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

export const buildExternalSnapshot = (
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

export const resolveSyncDirection = (
  crmUpdatedAt: Date | null,
  externalModifiedAt: Date | null,
  lastSyncedAt: Date | null,
  lastExternalModifiedAt: Date | null,
): "crmToExternal" | "externalToCrm" | "noop" => {
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
    if (externalModifiedAt && externalModifiedAt > crmUpdatedAt) {
      return "externalToCrm";
    }
    if (externalModifiedAt && crmUpdatedAt > externalModifiedAt) {
      return "crmToExternal";
    }
    return "noop";
  }
  if (externalChanged) {
    return "externalToCrm";
  }
  if (crmChanged) {
    return "crmToExternal";
  }
  return "noop";
};

export const buildCrmToExternalUpdate = (
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

export const buildExternalToCrmEvents = (
  calendarEvent: CalendarEvent,
  external: ExternalCalendarSnapshot,
  deviceId: string,
  timestamp: Timestamp,
): ExternalCalendarChange[] => {
  if (external.status === Calendar.EventStatus.CANCELED) {
    if (calendarEvent.status !== "calendarEvent.status.canceled") {
      return [
        {
          type: "calendarEvent.canceled",
          entityId: calendarEvent.id,
          payload: { id: calendarEvent.id },
          timestamp,
          deviceId,
        },
      ];
    }
    return [];
  }

  const events = [];
  const internalStart = parseIsoTimestamp(calendarEvent.scheduledFor);

  if (internalStart && !timestampsEqual(internalStart, external.startDate)) {
    events.push({
      type: "calendarEvent.rescheduled",
      entityId: calendarEvent.id,
      payload: {
        id: calendarEvent.id,
        scheduledFor: external.startDate.toISOString(),
      },
      timestamp,
      deviceId,
    });
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

    events.push({
      type: "calendarEvent.updated",
      entityId: calendarEvent.id,
      payload,
      timestamp,
      deviceId,
    });
  }

  return events;
};
