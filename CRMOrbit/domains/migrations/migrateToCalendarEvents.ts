import { AutomergeDoc } from "../../automerge/schema";
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
} from "../calendarEvent";
import { Interaction } from "../interaction";
import { Audit } from "../audit";
import { EntityId } from "../shared/types";
import { Event } from "../../events/event";
import { CalendarEventScheduledPayload } from "../../events/calendarEventPayloads";
import { nextId } from "../shared/idGenerator";

export interface MigrationResult {
  success: boolean;
  migratedInteractions: number;
  migratedAudits: number;
  migratedLinks: number;
  errors: string[];
}

export interface MigrationReport extends MigrationResult {
  interactionIds: EntityId[];
  auditIds: EntityId[];
  linkIds: string[];
  events: Event[]; // Events generated during migration for persistence
}

/**
 * Migrates Interaction and Audit entities to unified CalendarEvent model.
 *
 * This migration:
 * 1. Transforms all Interaction entities to CalendarEvent (preserving IDs)
 * 2. Transforms all Audit entities to CalendarEvent (preserving IDs)
 * 3. Updates EntityLinks to use calendarEventId instead of interactionId
 * 4. Is idempotent - safe to run multiple times
 *
 * @param doc - The Automerge document to migrate
 * @returns Migration result with counts and errors
 */
export const migrateToCalendarEvents = (
  doc: AutomergeDoc,
  deviceId: string = "migration",
): MigrationReport => {
  const result: MigrationReport = {
    success: true,
    migratedInteractions: 0,
    migratedAudits: 0,
    migratedLinks: 0,
    errors: [],
    interactionIds: [],
    auditIds: [],
    linkIds: [],
    events: [],
  };

  try {
    // Step 1: Migrate interactions to calendar events
    for (const [id, interaction] of Object.entries(doc.interactions || {})) {
      try {
        // Skip if already migrated
        if (doc.calendarEvents[id]) {
          continue;
        }

        const calendarEvent = migrateInteractionToCalendarEvent(interaction);
        doc.calendarEvents[id] = calendarEvent;
        result.migratedInteractions++;
        result.interactionIds.push(id);

        // Generate event for persistence
        const event = createCalendarEventScheduledEvent(
          calendarEvent,
          deviceId,
          interaction.createdAt,
        );
        result.events.push(event);
      } catch (error) {
        const errorMsg = `Failed to migrate interaction ${id}: ${(error as Error).message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Step 2: Migrate audits to calendar events
    for (const [id, audit] of Object.entries(doc.audits || {})) {
      try {
        // Skip if already migrated
        if (doc.calendarEvents[id]) {
          continue;
        }

        const calendarEvent = migrateAuditToCalendarEvent(audit);
        doc.calendarEvents[id] = calendarEvent;
        result.migratedAudits++;
        result.auditIds.push(id);

        // Generate event for persistence
        const event = createCalendarEventScheduledEvent(
          calendarEvent,
          deviceId,
          audit.createdAt,
        );
        result.events.push(event);
      } catch (error) {
        const errorMsg = `Failed to migrate audit ${id}: ${(error as Error).message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Step 3: Migrate entity links
    for (const [linkId, link] of Object.entries(
      doc.relations.entityLinks || {},
    )) {
      try {
        // Skip if not an interaction link
        if (link.linkType !== "interaction" || !link.interactionId) {
          continue;
        }

        // Skip if already migrated
        if (link.calendarEventId) {
          continue;
        }

        // Verify the calendar event exists
        const calendarEventId = link.interactionId;
        if (!doc.calendarEvents[calendarEventId]) {
          const errorMsg = `Link ${linkId} references non-existent calendar event ${calendarEventId}`;
          console.warn(errorMsg);
          result.errors.push(errorMsg);
          continue;
        }

        // Update link to use calendarEventId
        link.linkType = "calendarEvent";
        link.calendarEventId = calendarEventId;
        result.migratedLinks++;
        result.linkIds.push(linkId);
      } catch (error) {
        const errorMsg = `Failed to migrate link ${linkId}: ${(error as Error).message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    result.success = false;
    const errorMsg = `Migration failed: ${(error as Error).message}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
};

/**
 * Transforms an Interaction entity to a CalendarEvent.
 * Preserves the original entity ID for reference integrity.
 */
export const migrateInteractionToCalendarEvent = (
  interaction: Interaction,
): CalendarEvent => {
  // Determine status based on interaction state
  let status: CalendarEventStatus;
  if (interaction.status === "interaction.status.canceled") {
    status = "calendarEvent.status.canceled";
  } else if (interaction.occurredAt) {
    status = "calendarEvent.status.completed";
  } else {
    status = "calendarEvent.status.scheduled";
  }

  // Map interaction type to calendar event type
  const type: CalendarEventType = mapInteractionType(interaction.type);

  return {
    id: interaction.id,
    type,
    status,
    summary: interaction.summary,
    description: undefined, // Interactions don't have a notes/description field
    scheduledFor: interaction.scheduledFor || interaction.occurredAt,
    occurredAt:
      status === "calendarEvent.status.completed"
        ? interaction.occurredAt
        : undefined,
    durationMinutes: interaction.durationMinutes,
    location: undefined, // Interactions don't have location field
    recurrenceRule: undefined, // Legacy interactions don't have recurrence
    recurrenceId: undefined,
    auditData: undefined, // Not an audit
    reminders: undefined,
    createdAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
  };
};

/**
 * Transforms an Audit entity to a CalendarEvent.
 * Preserves the original entity ID for reference integrity.
 */
export const migrateAuditToCalendarEvent = (audit: Audit): CalendarEvent => {
  // Determine status based on audit state
  let status: CalendarEventStatus;
  if (audit.status === "audits.status.canceled") {
    status = "calendarEvent.status.canceled";
  } else if (audit.occurredAt) {
    status = "calendarEvent.status.completed";
  } else {
    status = "calendarEvent.status.scheduled";
  }

  return {
    id: audit.id,
    type: "audit",
    status,
    summary: `Audit for account ${audit.accountId}`, // Audits don't have a summary field
    description: audit.notes,
    scheduledFor: audit.scheduledFor,
    occurredAt:
      status === "calendarEvent.status.completed"
        ? audit.occurredAt
        : undefined,
    durationMinutes: audit.durationMinutes,
    location: undefined, // Audits don't have location field
    recurrenceRule: undefined, // Legacy audits don't have recurrence
    recurrenceId: undefined,
    auditData: {
      accountId: audit.accountId,
      score: audit.score,
      floorsVisited: audit.floorsVisited,
    },
    reminders: undefined,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
  };
};

/**
 * Maps legacy Interaction type to CalendarEvent type.
 * Handles the 'interaction' type which should map to 'other'.
 */
const mapInteractionType = (interactionType: string): CalendarEventType => {
  switch (interactionType) {
    case "meeting":
      return "meeting";
    case "call":
      return "call";
    case "email":
      return "email";
    case "interaction":
    case "other":
      return "other";
    default:
      console.warn(
        `Unknown interaction type: ${interactionType}, defaulting to 'other'`,
      );
      return "other";
  }
};

/**
 * Validates that a migration was successful by checking:
 * 1. All interactions were migrated to calendar events
 * 2. All audits were migrated to calendar events
 * 3. All interaction entity links were updated
 * 4. No data loss occurred
 */
export const validateMigration = (
  doc: AutomergeDoc,
): {
  valid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check for unmigrated interactions
  const unmigratedInteractions = Object.entries(doc.interactions || {}).filter(
    ([id]) => !doc.calendarEvents[id],
  );
  if (unmigratedInteractions.length > 0) {
    issues.push(
      `Found ${unmigratedInteractions.length} unmigrated interactions: ${unmigratedInteractions.map(([id]) => id).join(", ")}`,
    );
  }

  // Check for unmigrated audits
  const unmigratedAudits = Object.entries(doc.audits || {}).filter(
    ([id]) => !doc.calendarEvents[id],
  );
  if (unmigratedAudits.length > 0) {
    issues.push(
      `Found ${unmigratedAudits.length} unmigrated audits: ${unmigratedAudits.map(([id]) => id).join(", ")}`,
    );
  }

  // Check for unmigrated entity links
  const unmigratedLinks = Object.entries(
    doc.relations.entityLinks || {},
  ).filter(
    ([_, link]) => link.linkType === "interaction" && !link.calendarEventId,
  );
  if (unmigratedLinks.length > 0) {
    issues.push(`Found ${unmigratedLinks.length} unmigrated interaction links`);
  }

  // Check for orphaned calendar event links
  const orphanedLinks = Object.entries(doc.relations.entityLinks || {}).filter(
    ([_, link]) => {
      if (link.linkType !== "calendarEvent" || !link.calendarEventId) {
        return false;
      }
      return !doc.calendarEvents[link.calendarEventId];
    },
  );
  if (orphanedLinks.length > 0) {
    issues.push(
      `Found ${orphanedLinks.length} calendar event links referencing non-existent events`,
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * Creates a calendarEvent.scheduled event for a migrated calendar event.
 * Uses the original entity's createdAt timestamp to maintain chronological order.
 */
const createCalendarEventScheduledEvent = (
  calendarEvent: CalendarEvent,
  deviceId: string,
  originalTimestamp: string,
): Event => {
  // Status is already in full enum format from migration
  const fullStatus = calendarEvent.status;

  const payload: CalendarEventScheduledPayload = {
    id: calendarEvent.id,
    type: calendarEvent.type,
    summary: calendarEvent.summary,
    scheduledFor: calendarEvent.scheduledFor,
    description: calendarEvent.description,
    durationMinutes: calendarEvent.durationMinutes,
    status: fullStatus,
    location: calendarEvent.location,
    recurrenceRule: calendarEvent.recurrenceRule,
    accountId: calendarEvent.auditData?.accountId,
  };

  return {
    id: nextId("event"),
    type: "calendarEvent.scheduled",
    entityId: calendarEvent.id,
    payload,
    timestamp: originalTimestamp, // Use original timestamp to maintain event order
    deviceId,
  };
};
