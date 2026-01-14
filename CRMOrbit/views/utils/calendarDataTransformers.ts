import type { Audit } from "@domains/audit";
import type { Interaction, InteractionStatus } from "@domains/interaction";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { MarkedDates } from "react-native-calendars/src/types";
import {
  formatAuditScore,
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  getAuditStatusTone,
  resolveAuditStatus,
  type AuditStatusTone,
} from "./audits";
import { addMinutesToTimestamp } from "./duration";
import type { CalendarPaletteColors } from "./calendarColors";
import {
  getAuditDotColor,
  getInteractionDotColor,
  getCalendarEventDotColor,
} from "./calendarColors";

/**
 * Converts a timestamp string to ISO date format (YYYY-MM-DD)
 */
export const toISODate = (timestamp?: string): string | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return date.toISOString().split("T")[0];
};

/**
 * AgendaList section item for an audit
 */
export interface AuditAgendaItem {
  kind: "audit";
  id: string;
  audit: Audit;
  accountName: string;
  startTimestamp: string;
  endTimestamp?: string;
  scoreValue?: string;
  floorsVisited?: number[];
  notes?: string;
  statusTone: AuditStatusTone;
  statusKey: string;
}

/**
 * AgendaList section item for an interaction
 */
export interface InteractionAgendaItem {
  kind: "interaction";
  id: string;
  interaction: Interaction;
  entityName: string;
  startTimestamp: string;
  endTimestamp?: string;
  statusKey: InteractionStatus;
  subtitleKey: "interactions.scheduledFor" | "interactions.occurredAt";
}

/**
 * Union type for agenda items
 */
export type AgendaItem = AuditAgendaItem | InteractionAgendaItem;

/**
 * AgendaList section format
 */
export interface AgendaSection {
  title: string; // ISO date (YYYY-MM-DD)
  data: AgendaItem[];
}

/**
 * Builds an agenda item for an audit
 */
export const buildAuditAgendaItem = (
  audit: Audit,
  accountName: string,
): AuditAgendaItem | null => {
  const status = resolveAuditStatus(audit);
  const startTimestamp = getAuditStartTimestamp(audit);
  if (!startTimestamp) return null;

  const endTimestamp = getAuditEndTimestamp(audit);
  const scoreValue = formatAuditScore(audit.score);
  const floorsVisited =
    audit.floorsVisited && audit.floorsVisited.length > 0
      ? audit.floorsVisited
      : undefined;
  const notes = audit.notes?.trim() || undefined;

  return {
    kind: "audit",
    id: audit.id,
    audit,
    accountName,
    startTimestamp,
    endTimestamp: endTimestamp ?? undefined,
    scoreValue,
    floorsVisited,
    notes,
    statusTone: getAuditStatusTone(status),
    statusKey: status,
  };
};

/**
 * Builds an agenda item for an interaction
 */
export const buildInteractionAgendaItem = (
  interaction: Interaction,
  entityName: string,
): InteractionAgendaItem | null => {
  const resolvedStatus = interaction.status ?? "interaction.status.completed";
  const usesScheduledTimestamp =
    resolvedStatus !== "interaction.status.completed";
  const timestampValue = usesScheduledTimestamp
    ? (interaction.scheduledFor ?? interaction.occurredAt)
    : interaction.occurredAt;

  if (!timestampValue) return null;

  const labelKey = usesScheduledTimestamp
    ? "interactions.scheduledFor"
    : "interactions.occurredAt";
  const endTimestamp = addMinutesToTimestamp(
    timestampValue,
    interaction.durationMinutes,
  );

  return {
    kind: "interaction",
    id: interaction.id,
    interaction,
    entityName,
    startTimestamp: timestampValue,
    endTimestamp: endTimestamp ?? undefined,
    statusKey: resolvedStatus,
    subtitleKey: labelKey,
  };
};

/**
 * Groups agenda items by date into sections for AgendaList
 */
export const groupAgendaItemsByDate = (
  items: AgendaItem[],
): AgendaSection[] => {
  const itemsByDate = new Map<string, AgendaItem[]>();

  for (const item of items) {
    let timestamp: string | undefined;
    if (item.kind === "audit") {
      timestamp = getAuditStartTimestamp(item.audit);
    } else {
      const resolvedStatus =
        item.interaction.status ?? "interaction.status.completed";
      const usesScheduledTimestamp =
        resolvedStatus !== "interaction.status.completed";
      timestamp = usesScheduledTimestamp
        ? (item.interaction.scheduledFor ?? item.interaction.occurredAt)
        : item.interaction.occurredAt;
    }

    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const existing = itemsByDate.get(dateKey) ?? [];
    existing.push(item);
    itemsByDate.set(dateKey, existing);
  }

  // Convert to sections array and sort by date (most recent first)
  const sections = Array.from(itemsByDate.entries())
    .map(([title, data]) => ({ title, data }))
    .sort((a, b) => b.title.localeCompare(a.title));

  return sections;
};

/**
 * Builds marked dates object for calendar visualization
 * Uses multi-dot marking to show different event types
 */
export const buildMarkedDates = (
  audits: Audit[],
  interactions: Interaction[],
  palette: CalendarPaletteColors,
  accentColor: string,
  selectedDate?: string,
): MarkedDates => {
  const marked: MarkedDates = {};

  // Mark dates with audits
  for (const audit of audits) {
    const timestamp = getAuditStartTimestamp(audit);
    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const status = resolveAuditStatus(audit);
    const color = getAuditDotColor(palette, status);

    if (!marked[dateKey]) {
      marked[dateKey] = { dots: [] };
    }

    marked[dateKey].dots = marked[dateKey].dots || [];
    marked[dateKey].dots!.push({
      key: `audit-${audit.id}`,
      color,
    });
  }

  // Mark dates with interactions
  for (const interaction of interactions) {
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestamp = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const color = getInteractionDotColor(palette, resolvedStatus);

    if (!marked[dateKey]) {
      marked[dateKey] = { dots: [] };
    }

    marked[dateKey].dots = marked[dateKey].dots || [];
    marked[dateKey].dots!.push({
      key: `interaction-${interaction.id}`,
      color,
    });
  }

  // Mark selected date
  if (selectedDate && marked[selectedDate]) {
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = accentColor;
  } else if (selectedDate) {
    marked[selectedDate] = {
      selected: true,
      selectedColor: accentColor,
    };
  }

  return marked;
};

/**
 * Gets the most recent date with events, or today's date
 */
export const getInitialCalendarDate = (
  audits: Audit[],
  interactions: Interaction[],
): string => {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const todayMidnight = new Date(todayISO);

  const dates: string[] = [];

  for (const audit of audits) {
    const timestamp = getAuditStartTimestamp(audit);
    const dateKey = toISODate(timestamp);
    if (dateKey) dates.push(dateKey);
  }

  for (const interaction of interactions) {
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestamp = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const dateKey = toISODate(timestamp);
    if (dateKey) dates.push(dateKey);
  }

  if (dates.length === 0) return todayISO;

  let closestDate = dates[0];
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (const dateKey of dates) {
    const dateValue = new Date(dateKey);
    const difference = Math.abs(dateValue.getTime() - todayMidnight.getTime());
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestDate = dateKey;
    }
  }

  return closestDate;
};

/**
 * UNIFIED CALENDAR EVENT SUPPORT
 * New agenda item type for unified calendar events
 */

export interface CalendarEventAgendaItem {
  kind: "calendarEvent";
  id: string;
  event: CalendarEvent;
  displayName: string; // Account name for audits, summary for others
  entityNames?: string; // Linked entities
  startTimestamp: string;
  endTimestamp?: string;
  statusKey: string;
  statusTone: "success" | "warning" | "danger";
  subtitleKey: "calendarEvents.scheduledFor" | "calendarEvents.occurredAt";
  scoreValue?: string;
  floorsVisited?: number[];
  description?: string;
  location?: string;
}

/**
 * Builds an agenda item for a unified calendar event
 */
export const buildCalendarEventAgendaItem = (
  event: CalendarEvent,
  accountName: string | undefined,
  entityNames: string | undefined,
): CalendarEventAgendaItem | null => {
  const isCompleted = event.status === "calendarEvent.status.completed";
  const startTimestamp = isCompleted
    ? (event.occurredAt ?? event.scheduledFor)
    : event.scheduledFor;

  if (!startTimestamp) return null;

  const endTimestamp = addMinutesToTimestamp(
    startTimestamp,
    event.durationMinutes,
  );

  const statusTone: "success" | "warning" | "danger" =
    event.status === "calendarEvent.status.completed"
      ? "success"
      : event.status === "calendarEvent.status.canceled"
        ? "danger"
        : "warning";

  const subtitleKey = isCompleted
    ? "calendarEvents.occurredAt"
    : "calendarEvents.scheduledFor";

  // For audits, use account name; for others, use summary
  const displayName =
    event.type === "calendarEvent.type.audit" && accountName
      ? accountName
      : event.summary;

  const scoreValue =
    event.type === "calendarEvent.type.audit" &&
    event.auditData?.score !== undefined
      ? `${event.auditData.score}%`
      : undefined;

  const floorsVisited =
    event.type === "calendarEvent.type.audit" &&
    event.auditData?.floorsVisited &&
    event.auditData.floorsVisited.length > 0
      ? event.auditData.floorsVisited
      : undefined;

  return {
    kind: "calendarEvent",
    id: event.id,
    event,
    displayName,
    entityNames,
    startTimestamp,
    endTimestamp: endTimestamp ?? undefined,
    statusKey: event.status,
    statusTone,
    subtitleKey,
    scoreValue,
    floorsVisited,
    description: event.description,
    location: event.location,
  };
};

/**
 * Builds marked dates for unified calendar events
 */
export const buildMarkedDatesFromCalendarEvents = (
  calendarEvents: CalendarEvent[],
  palette: CalendarPaletteColors,
  accentColor: string,
  selectedDate?: string,
): MarkedDates => {
  const marked: MarkedDates = {};

  for (const event of calendarEvents) {
    const isCompleted = event.status === "calendarEvent.status.completed";
    const timestamp = isCompleted
      ? (event.occurredAt ?? event.scheduledFor)
      : event.scheduledFor;
    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const color = getCalendarEventDotColor(palette, event.status, event.type);

    if (!marked[dateKey]) {
      marked[dateKey] = { dots: [] };
    }

    marked[dateKey].dots = marked[dateKey].dots || [];
    marked[dateKey].dots!.push({
      key: `calendarEvent-${event.id}`,
      color,
    });
  }

  // Mark selected date
  if (selectedDate && marked[selectedDate]) {
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = accentColor;
  } else if (selectedDate) {
    marked[selectedDate] = {
      selected: true,
      selectedColor: accentColor,
    };
  }

  return marked;
};

/**
 * Gets the initial calendar date from calendar events
 */
export const getInitialCalendarDateFromEvents = (
  calendarEvents: CalendarEvent[],
): string => {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const todayMidnight = new Date(todayISO);

  const dates: string[] = [];

  for (const event of calendarEvents) {
    const isCompleted = event.status === "calendarEvent.status.completed";
    const timestamp = isCompleted
      ? (event.occurredAt ?? event.scheduledFor)
      : event.scheduledFor;
    const dateKey = toISODate(timestamp);
    if (dateKey) dates.push(dateKey);
  }

  if (dates.length === 0) return todayISO;

  let closestDate = dates[0];
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (const dateKey of dates) {
    const dateValue = new Date(dateKey);
    const difference = Math.abs(dateValue.getTime() - todayMidnight.getTime());
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestDate = dateKey;
    }
  }

  return closestDate;
};
