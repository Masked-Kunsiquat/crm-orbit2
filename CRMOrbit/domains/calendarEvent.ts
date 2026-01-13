import type { Entity, EntityId, Timestamp } from "./shared/types";

/**
 * Calendar event types
 * Unifies interactions (meetings, calls, emails) and audits into a single entity
 */
export type CalendarEventType =
  // Interaction types (migrated from Interaction.type)
  | "meeting"
  | "call"
  | "email"
  | "other"
  // Audit type (migrated from Audit entity)
  | "audit"
  // Future extensibility
  | "task"
  | "reminder";

/**
 * Calendar event status
 * Maps to both Interaction and Audit status values
 */
export type CalendarEventStatus =
  | "calendarEvent.status.scheduled"
  | "calendarEvent.status.completed"
  | "calendarEvent.status.canceled";

/**
 * Recurrence rule for repeating calendar events
 * Note: This is SEPARATE from audit frequency (which is a contractual compliance requirement)
 * Use this for actual repeating events like "weekly team meeting every Tuesday"
 */
export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number; // Every N days/weeks/months/years
  until?: Timestamp; // End date (optional)
  count?: number; // Or end after N occurrences (optional)
  byWeekDay?: number[]; // For weekly: [0=Sun, 1=Mon, ...] (optional)
  byMonthDay?: number[]; // For monthly: [1-31] (optional)
}

/**
 * Unified calendar event entity
 * Replaces separate Interaction and Audit entities
 *
 * IMPORTANT DISTINCTIONS:
 * - recurrenceRule: For repeating calendar events (e.g., "weekly meeting")
 * - auditData.accountId: Links audit to account (which has auditFrequency for compliance)
 * - Audit frequency is tracked on Account entity, NOT here (see domains/account.ts)
 */
export interface CalendarEvent extends Entity {
  // Core fields
  type: CalendarEventType;
  status: CalendarEventStatus;
  summary: string; // Brief description
  description?: string; // Detailed notes (optional)

  // Timing
  scheduledFor: Timestamp; // When it's planned (always required)
  occurredAt?: Timestamp; // When it actually happened (for completed events)
  durationMinutes?: number; // Event duration (optional)

  // Recurrence (for repeating calendar events - NOT for audit compliance)
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: EntityId; // Links to parent event if this is a recurrence instance

  // Audit-specific fields (only populated for type='audit')
  // Note: Audit frequency is on Account, not here. This is for completed audit data.
  auditData?: {
    accountId: EntityId; // Which account this audit is for
    score?: number; // Audit score (0-100)
    floorsVisited?: number[]; // Which floors were inspected
  };

  // Future extensibility
  location?: string; // Physical location or meeting link
  reminders?: {
    minutesBefore: number;
    notified: boolean;
  }[];
}
