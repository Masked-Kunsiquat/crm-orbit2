import type {
  CalendarEvent,
  CalendarEventStatus,
} from "@domains/calendarEvent";

/**
 * Audit status type - kept for backward compatibility with display components.
 * Maps from CalendarEventStatus to audit-specific status strings.
 */
export type AuditStatus =
  | "audits.status.scheduled"
  | "audits.status.canceled"
  | "audits.status.completed";

export type AuditStatusTone = "success" | "warning" | "danger";

/**
 * Map CalendarEventStatus to AuditStatus for display purposes
 */
const mapCalendarStatusToAuditStatus = (
  status: CalendarEventStatus,
): AuditStatus => {
  switch (status) {
    case "calendarEvent.status.completed":
      return "audits.status.completed";
    case "calendarEvent.status.canceled":
      return "audits.status.canceled";
    case "calendarEvent.status.scheduled":
    default:
      return "audits.status.scheduled";
  }
};

/**
 * Resolve the status of an audit (CalendarEvent with type="calendarEvent.type.audit")
 */
export const resolveAuditStatus = (event: CalendarEvent): AuditStatus => {
  return mapCalendarStatusToAuditStatus(event.status);
};

export const getAuditStatusTone = (status: AuditStatus): AuditStatusTone => {
  switch (status) {
    case "audits.status.completed":
      return "success";
    case "audits.status.canceled":
      return "danger";
    case "audits.status.scheduled":
    default:
      return "warning";
  }
};

export const getAuditTimestampLabelKey = (
  status: AuditStatus,
):
  | "audits.fields.occurredAt"
  | "audits.fields.scheduledFor"
  | "audits.fields.canceledAt" => {
  switch (status) {
    case "audits.status.completed":
      return "audits.fields.occurredAt";
    case "audits.status.canceled":
      return "audits.fields.canceledAt";
    case "audits.status.scheduled":
    default:
      return "audits.fields.scheduledFor";
  }
};

/**
 * Get the primary timestamp for an audit event.
 * For completed audits, returns occurredAt (falling back to scheduledFor).
 * For scheduled/canceled audits, returns scheduledFor.
 */
export const getAuditStartTimestamp = (
  event: CalendarEvent,
): string | undefined => {
  const status = resolveAuditStatus(event);
  if (status === "audits.status.completed") {
    return event.occurredAt ?? event.scheduledFor;
  }
  return event.scheduledFor ?? event.occurredAt;
};

const formatScoreValue = (score: number): string => {
  const fixed = score.toFixed(2);
  if (fixed.endsWith(".00")) {
    return fixed.slice(0, -3);
  }
  if (fixed.endsWith("0")) {
    return fixed.slice(0, -1);
  }
  return fixed;
};

export const formatAuditScore = (score?: number): string | undefined => {
  if (score === undefined || Number.isNaN(score)) {
    return undefined;
  }
  return `${formatScoreValue(score)}%`;
};

export const formatAuditScoreInput = (score?: number): string => {
  if (score === undefined || Number.isNaN(score)) {
    return "";
  }
  return formatScoreValue(score);
};

/**
 * Calculate the end timestamp based on start and duration
 */
export const getAuditEndTimestamp = (
  event: CalendarEvent,
): string | undefined => {
  const start = getAuditStartTimestamp(event);
  if (!start || !event.durationMinutes) {
    return undefined;
  }
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  date.setMinutes(date.getMinutes() + event.durationMinutes);
  return date.toISOString();
};

/**
 * Get a numeric timestamp for sorting purposes
 */
export const getAuditSortTimestamp = (event: CalendarEvent): number => {
  const timestamp = getAuditStartTimestamp(event);
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

/**
 * Sort audits by descending time (most recent first)
 */
export const sortAuditsByDescendingTime = (
  left: CalendarEvent,
  right: CalendarEvent,
): number => getAuditSortTimestamp(right) - getAuditSortTimestamp(left);

/**
 * Helper to get score from audit CalendarEvent
 */
export const getAuditScore = (event: CalendarEvent): number | undefined =>
  event.auditData?.score;

/**
 * Helper to get floors visited from audit CalendarEvent
 */
export const getAuditFloorsVisited = (
  event: CalendarEvent,
): number[] | undefined => event.auditData?.floorsVisited;

/**
 * Helper to get account ID from audit CalendarEvent
 */
export const getAuditAccountId = (event: CalendarEvent): string | undefined =>
  event.auditData?.accountId;

/**
 * Helper to get notes (description) from audit CalendarEvent
 */
export const getAuditNotes = (event: CalendarEvent): string | undefined =>
  event.description;
