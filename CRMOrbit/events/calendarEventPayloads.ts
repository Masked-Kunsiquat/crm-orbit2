import type {
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
  RecurrenceRule,
} from "@domains/calendarEvent";
import type { EntityId, Timestamp } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";

/**
 * Payload types for unified calendar event system
 * Following event-sourcing conventions: semantic events with intent-focused types
 */

// calendarEvent.scheduled
export type CalendarEventScheduledPayload = {
  id: EntityId;
  type: CalendarEventType;
  summary: string;
  scheduledFor: Timestamp;
  description?: string;
  durationMinutes?: number;
  status?: CalendarEventStatus;
  location?: string;
  recurrenceRule?: RecurrenceRule;
  // Audit-specific fields (only for type='audit')
  accountId?: EntityId; // Required if type='audit'
  // Optional initial entity links
  linkedEntities?: Array<{
    linkId: EntityId;
    entityType: EntityLinkType;
    entityId: EntityId;
  }>;
};

// calendarEvent.updated
export type CalendarEventUpdatedPayload = {
  id: EntityId;
  type?: CalendarEventType;
  summary?: string;
  description?: string;
  durationMinutes?: number;
  location?: string;
  // Audit-specific fields
  accountId?: EntityId;
  score?: number;
  floorsVisited?: number[];
  // Note: scheduledFor changes use calendarEvent.rescheduled instead
  // Note: status changes use calendarEvent.completed or calendarEvent.canceled
};

// calendarEvent.completed
export type CalendarEventCompletedPayload = {
  id: EntityId;
  occurredAt: Timestamp; // When it actually occurred
  // Audit-specific completion data
  accountId?: EntityId;
  score?: number; // For audits: 0-100
  floorsVisited?: number[]; // For audits: floors inspected
  description?: string; // Optional completion notes
};

// calendarEvent.canceled
export type CalendarEventCanceledPayload = {
  id: EntityId;
  // Audit-specific data to persist on cancel
  accountId?: EntityId;
  score?: number;
  floorsVisited?: number[];
};

// calendarEvent.rescheduled
export type CalendarEventRescheduledPayload = {
  id: EntityId;
  scheduledFor: Timestamp;
  applyToSeries?: boolean; // For recurring events: apply to all future instances
};

// calendarEvent.deleted
export type CalendarEventDeletedPayload = {
  id: EntityId;
  deleteEntireSeries?: boolean; // For recurring events: delete all instances
};

// calendarEvent.linked
export type CalendarEventLinkedPayload = {
  linkId: EntityId;
  calendarEventId: EntityId;
  entityType: EntityLinkType;
  entityId: EntityId;
};

// calendarEvent.unlinked
export type CalendarEventUnlinkedPayload = {
  linkId: EntityId; // The EntityLink.id to remove
  calendarEventId?: EntityId; // Optional for validation
  entityType?: EntityLinkType; // Optional for validation
  entityId?: EntityId; // Optional for validation
};

// calendarEvent.recurrence.created
export type CalendarEventRecurrenceCreatedPayload = {
  id: EntityId;
  recurrenceRule: RecurrenceRule;
};

// calendarEvent.recurrence.updated
export type CalendarEventRecurrenceUpdatedPayload = {
  id: EntityId;
  recurrenceRule: RecurrenceRule;
};

// calendarEvent.recurrence.deleted
export type CalendarEventRecurrenceDeletedPayload = {
  id: EntityId;
};

/**
 * Helper to build a complete CalendarEvent from scheduled payload
 * Used by reducers for consistent entity creation
 */
export const buildCalendarEventFromScheduledPayload = (
  payload: CalendarEventScheduledPayload,
  timestamp: Timestamp,
): CalendarEvent => {
  const baseEvent: CalendarEvent = {
    id: payload.id,
    type: payload.type,
    status: payload.status ?? "calendarEvent.status.scheduled",
    summary: payload.summary,
    description: payload.description,
    scheduledFor: payload.scheduledFor,
    durationMinutes: payload.durationMinutes,
    location: payload.location,
    recurrenceRule: payload.recurrenceRule,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Add audit-specific data if this is an audit event
  if (payload.type === "calendarEvent.type.audit" && payload.accountId) {
    baseEvent.auditData = {
      accountId: payload.accountId,
    };
  }

  return baseEvent;
};
