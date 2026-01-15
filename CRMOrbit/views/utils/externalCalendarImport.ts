import * as Calendar from "expo-calendar";

import type { Account } from "@domains/account";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { EntityId, Timestamp } from "@domains/shared/types";
import {
  findAccountsMatchingCalendarTitle,
  resolveAccountCalendarAliases,
} from "@domains/account.utils";
import { createLogger } from "@utils/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const logger = createLogger("ExternalCalendarImportUtils");

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
const CRM_ORBIT_AUDIT_PREFIX = "crmOrbitAudit:";

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

const parseCalendarDate = (
  value: string | Date | null | undefined,
): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export const loadExternalCalendarEvents = async (
  calendarId: string,
  window: ExternalCalendarImportWindow,
): Promise<ExternalCalendarEvent[]> => {
  logger.debug("Loading external calendar events.", {
    windowStart: window.start.toISOString(),
    windowEnd: window.end.toISOString(),
  });
  const events = await Calendar.getEventsAsync(
    [calendarId],
    window.start,
    window.end,
  );

  const normalized = events.flatMap((event) => {
    if (!event.title || !event.id) {
      return [];
    }
    const startDate = parseCalendarDate(event.startDate);
    if (!startDate) {
      return [];
    }
    const endDate = parseCalendarDate(event.endDate) ?? startDate;
    return [
      {
        externalEventId: event.id,
        calendarId,
        title: event.title ?? "",
        startDate,
        endDate,
        location: event.location ?? undefined,
        notes: event.notes ?? undefined,
        isAllDay: event.allDay ?? undefined,
      },
    ];
  });

  logger.info("Loaded external calendar events.", { count: normalized.length });
  return normalized;
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

export const replaceCrmOrbitMarkerInNotes = (
  notes: string | undefined,
  calendarEventId: string,
): string => {
  const cleaned = stripCrmOrbitMetadataFromNotes(notes);
  const marker = buildCrmOrbitMarker(calendarEventId);
  if (!cleaned) {
    return marker;
  }
  return `${cleaned}\n${marker}`;
};

const stripCrmOrbitMetadataLine = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed.startsWith(CRM_ORBIT_MARKER_PREFIX) ||
    trimmed.startsWith(CRM_ORBIT_AUDIT_PREFIX)
  );
};

export const stripCrmOrbitMetadataFromNotes = (
  notes: string | undefined,
): string => {
  if (!notes) {
    return "";
  }
  return notes
    .split(/\r?\n/)
    .filter((line) => !stripCrmOrbitMetadataLine(line))
    .join("\n")
    .trim();
};

const buildCrmOrbitAuditMetadata = (
  calendarEvent: CalendarEvent,
): string | null => {
  if (
    calendarEvent.type !== "calendarEvent.type.audit" ||
    calendarEvent.status !== "calendarEvent.status.completed"
  ) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  if (calendarEvent.occurredAt) {
    payload.occurredAt = calendarEvent.occurredAt;
  }
  if (calendarEvent.auditData?.score !== undefined) {
    payload.score = calendarEvent.auditData.score;
  }
  if (calendarEvent.auditData?.floorsVisited !== undefined) {
    payload.floorsVisited = calendarEvent.auditData.floorsVisited;
  }

  return `${CRM_ORBIT_AUDIT_PREFIX}${JSON.stringify(payload)}`;
};

export const buildExternalEventNotes = (
  notes: string | undefined,
  calendarEvent: CalendarEvent,
): string => {
  const cleaned = stripCrmOrbitMetadataFromNotes(notes);
  const lines = [];
  if (cleaned) {
    lines.push(cleaned);
  }
  lines.push(buildCrmOrbitMarker(calendarEvent.id));
  const auditMetadata = buildCrmOrbitAuditMetadata(calendarEvent);
  if (auditMetadata) {
    lines.push(auditMetadata);
  }
  return lines.join("\n");
};
