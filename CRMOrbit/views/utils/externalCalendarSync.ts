import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import type { Timestamp } from "@domains/shared/types";
import { buildEvent } from "@events/dispatcher";
import { stripCrmOrbitMetadataFromNotes } from "./externalCalendarImport";

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

export const buildExternalToCrmEvents = (
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
