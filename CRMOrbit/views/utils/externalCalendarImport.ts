import * as Calendar from "expo-calendar";

import type { Account } from "@domains/account";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { EntityId, Timestamp } from "@domains/shared/types";
import {
  findAccountsMatchingCalendarTitle,
  resolveAccountCalendarAliases,
} from "@domains/account.utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ExternalCalendarImportWindow = {
  start: Date;
  end: Date;
};

export type ExternalCalendarEvent = {
  externalEventId: string;
  calendarId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  isAllDay?: boolean;
};

export type ExternalCalendarImportCandidate = {
  externalEventId: string;
  calendarId: string;
  title: string;
  scheduledFor: Timestamp;
  durationMinutes?: number;
  location?: string;
  notes?: string;
  matchedAccountIds: EntityId[];
  suggestedAccountId?: EntityId;
};

const CRM_ORBIT_MARKER_PREFIX = "crmOrbitId:";

export const buildExternalCalendarImportWindow = (
  now: Date = new Date(),
): ExternalCalendarImportWindow => ({
  start: new Date(now.getTime() - 60 * DAY_MS),
  end: new Date(now.getTime() + 180 * DAY_MS),
});

const inferAccountFromCalendarEvents = (
  calendarEvents: CalendarEvent[],
  title: string,
): EntityId | null => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return null;
  }
  const matching = calendarEvents.filter(
    (event) =>
      event.type === "calendarEvent.type.audit" &&
      event.summary.trim() === normalizedTitle &&
      event.auditData?.accountId,
  );
  const accountIds = new Set(
    matching
      .map((event) => event.auditData?.accountId)
      .filter((value): value is EntityId => typeof value === "string"),
  );
  if (accountIds.size === 1) {
    return Array.from(accountIds)[0] ?? null;
  }
  return null;
};

const resolveSuggestedAccountId = (
  matches: Account[],
  calendarEvents: CalendarEvent[],
  title: string,
): EntityId | undefined => {
  if (matches.length === 1) {
    return matches[0].id;
  }
  const inferred = inferAccountFromCalendarEvents(calendarEvents, title);
  if (!inferred) {
    return undefined;
  }
  return matches.find((account) => account.id === inferred)?.id;
};

const resolveDurationMinutes = (start: Date, end: Date): number | undefined => {
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return undefined;
  }
  return Math.round(diffMs / (60 * 1000));
};

export const loadExternalCalendarEvents = async (
  calendarId: string,
  window: ExternalCalendarImportWindow,
): Promise<ExternalCalendarEvent[]> => {
  const events = await Calendar.getEventsAsync(
    [calendarId],
    window.start,
    window.end,
  );

  return events
    .filter((event) => Boolean(event.title && event.id))
    .map((event) => ({
      externalEventId: event.id,
      calendarId,
      title: event.title ?? "",
      startDate: event.startDate,
      endDate: event.endDate ?? event.startDate,
      location: event.location ?? undefined,
      notes: event.notes ?? undefined,
      isAllDay: event.allDay ?? undefined,
    }));
};

export const buildExternalCalendarImportCandidates = (
  externalEvents: ExternalCalendarEvent[],
  accounts: Account[],
  calendarEvents: CalendarEvent[],
  linkedExternalEventIds: Set<string>,
): ExternalCalendarImportCandidate[] => {
  return externalEvents.flatMap((event) => {
    const title = event.title.trim();
    if (!title || linkedExternalEventIds.has(event.externalEventId)) {
      return [];
    }

    const matches = findAccountsMatchingCalendarTitle(accounts, title);
    if (matches.length === 0) {
      return [];
    }

    const suggestedAccountId = resolveSuggestedAccountId(
      matches,
      calendarEvents,
      title,
    );

    return [
      {
        externalEventId: event.externalEventId,
        calendarId: event.calendarId,
        title,
        scheduledFor: event.startDate.toISOString(),
        durationMinutes: resolveDurationMinutes(event.startDate, event.endDate),
        location: event.location,
        notes: event.notes,
        matchedAccountIds: matches.map((account) => account.id),
        suggestedAccountId,
      },
    ];
  });
};

export const getAccountAliasSummary = (account: Account): string[] =>
  resolveAccountCalendarAliases(account);

export const buildCrmOrbitMarker = (calendarEventId: string): string =>
  `${CRM_ORBIT_MARKER_PREFIX}${calendarEventId}`;

export const appendCrmOrbitMarkerToNotes = (
  notes: string | undefined,
  calendarEventId: string,
): string => {
  const marker = buildCrmOrbitMarker(calendarEventId);
  if (!notes || !notes.trim()) {
    return marker;
  }
  if (notes.includes(marker)) {
    return notes;
  }
  return `${notes.trim()}\n${marker}`;
};
