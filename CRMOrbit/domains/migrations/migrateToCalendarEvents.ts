import Automerge from "automerge";
import type { Doc } from "automerge";
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
const ensureAutomergeDoc = (doc: AutomergeDoc): Doc<AutomergeDoc> => {
  const candidate = doc as Doc<AutomergeDoc>;
  try {
    Automerge.save(candidate);
    return candidate;
  } catch {
    const sanitized = JSON.parse(JSON.stringify(doc)) as AutomergeDoc;
    return Automerge.from(sanitized);
  }
};

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

const sanitizeCalendarEvent = (event: CalendarEvent): CalendarEvent =>
  JSON.parse(JSON.stringify(event)) as CalendarEvent;

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
 * @param deviceId - Device identifier for event attribution
 * @returns Updated document plus migration report
 */
export const migrateToCalendarEvents = (
  doc: AutomergeDoc,
  deviceId: string,
): { doc: AutomergeDoc; report: MigrationReport } => {
  let report: MigrationReport | null = null;
  const sourceDoc = JSON.parse(JSON.stringify(doc)) as AutomergeDoc;
  const interactionEntries = Object.entries(sourceDoc.interactions || {});
  const auditEntries = Object.entries(sourceDoc.audits || {});
  const linkEntries = Object.entries(sourceDoc.relations?.entityLinks || {});
  const updatedDoc = Automerge.change(ensureAutomergeDoc(doc), (draft) => {
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
    const migrationDoc = draft as AutomergeDoc;

    try {
      if (!migrationDoc.calendarEvents) {
        migrationDoc.calendarEvents = {};
      }
      if (!migrationDoc.relations) {
        migrationDoc.relations = {
          accountContacts: {},
          accountCodes: {},
          entityLinks: {},
        };
      } else {
        if (!migrationDoc.relations.accountContacts) {
          migrationDoc.relations.accountContacts = {};
        }
        if (!migrationDoc.relations.accountCodes) {
          migrationDoc.relations.accountCodes = {};
        }
        if (!migrationDoc.relations.entityLinks) {
          migrationDoc.relations.entityLinks = {};
        }
      }
      if (!migrationDoc.interactions) {
        migrationDoc.interactions = {};
      }
      if (!migrationDoc.audits) {
        migrationDoc.audits = {};
      }

      // Step 1: Migrate interactions to calendar events
      for (const [id, interaction] of interactionEntries) {
        try {
          if (!interaction.id || interaction.id !== id) {
            throw new Error(`Invalid interaction id for ${id}`);
          }
          // Skip if already migrated
          if (migrationDoc.calendarEvents[id]) {
            continue;
          }

          const calendarEvent = migrateInteractionToCalendarEvent(interaction);
          migrationDoc.calendarEvents[id] =
            sanitizeCalendarEvent(calendarEvent);
          result.migratedInteractions++;
          result.interactionIds.push(id);

          // Generate event for persistence
          const scheduledEvent = createCalendarEventScheduledEvent(
            calendarEvent,
            deviceId,
            interaction.createdAt,
          );
          result.events.push(scheduledEvent);
          result.events.push(
            ...createCalendarEventStatusEvents(calendarEvent, deviceId),
          );
        } catch (error) {
          const errorMsg = `Failed to migrate interaction ${id}: ${(error as Error).message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 2: Migrate audits to calendar events
      for (const [id, audit] of auditEntries) {
        try {
          if (!audit.id || audit.id !== id) {
            throw new Error(`Invalid audit id for ${id}`);
          }
          // Skip if already migrated
          if (migrationDoc.calendarEvents[id]) {
            continue;
          }

          const calendarEvent = migrateAuditToCalendarEvent(audit);
          migrationDoc.calendarEvents[id] =
            sanitizeCalendarEvent(calendarEvent);
          result.migratedAudits++;
          result.auditIds.push(id);

          // Generate event for persistence
          const scheduledEvent = createCalendarEventScheduledEvent(
            calendarEvent,
            deviceId,
            audit.createdAt,
          );
          result.events.push(scheduledEvent);
          result.events.push(
            ...createCalendarEventStatusEvents(calendarEvent, deviceId),
          );
        } catch (error) {
          const errorMsg = `Failed to migrate audit ${id}: ${(error as Error).message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 3: Migrate entity links
      for (const [linkId, link] of linkEntries) {
        try {
          const draftLink = migrationDoc.relations.entityLinks[linkId];
          if (!draftLink) {
            continue;
          }
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
          if (!migrationDoc.calendarEvents[calendarEventId]) {
            const errorMsg = `Link ${linkId} references non-existent calendar event ${calendarEventId}`;
            console.warn(errorMsg);
            result.errors.push(errorMsg);
            continue;
          }

          // Update link to use calendarEventId
          draftLink.linkType = "calendarEvent";
          draftLink.calendarEventId = calendarEventId;
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

    report = result;
  });

  if (!report) {
    throw new Error("Calendar event migration did not produce a report.");
  }

  return {
    doc: updatedDoc as AutomergeDoc,
    report,
  };
};

/**
 * Transforms an Interaction entity to a CalendarEvent.
 * Preserves the original entity ID for reference integrity.
 */
export const migrateInteractionToCalendarEvent = (
  interaction: Interaction,
): CalendarEvent => {
  // Determine status based on interaction state
  const status = resolveInteractionStatus(interaction);

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
  const status = resolveAuditStatus(audit);
  const summary = resolveAuditSummary(audit);

  return {
    id: audit.id,
    type: "calendarEvent.type.audit",
    status,
    summary,
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

const resolveAuditSummary = (audit: Audit): string => {
  const summary = audit.summary?.trim();
  if (summary) {
    return summary;
  }
  return "";
};

const resolveInteractionStatus = (
  interaction: Interaction,
): CalendarEventStatus => {
  const status = interaction.status as string | undefined;
  switch (status) {
    case "interaction.status.canceled":
    case "canceled":
      return "calendarEvent.status.canceled";
    case "interaction.status.scheduled":
    case "scheduled":
      return "calendarEvent.status.scheduled";
    case "interaction.status.completed":
    case "completed":
      return "calendarEvent.status.completed";
    default:
      return interaction.occurredAt
        ? "calendarEvent.status.completed"
        : "calendarEvent.status.scheduled";
  }
};

const resolveAuditStatus = (audit: Audit): CalendarEventStatus => {
  const status = audit.status as string | undefined;
  switch (status) {
    case "audits.status.canceled":
    case "canceled":
      return "calendarEvent.status.canceled";
    case "audits.status.scheduled":
    case "scheduled":
      return "calendarEvent.status.scheduled";
    case "audits.status.completed":
    case "completed":
      return "calendarEvent.status.completed";
    default:
      return audit.occurredAt
        ? "calendarEvent.status.completed"
        : "calendarEvent.status.scheduled";
  }
};

/**
 * Maps legacy Interaction type to CalendarEvent type.
 * Handles the 'interaction' type which should map to 'other'.
 */
const mapInteractionType = (interactionType: string): CalendarEventType => {
  switch (interactionType) {
    case "interaction.type.meeting":
    case "meeting":
      return "calendarEvent.type.meeting";
    case "interaction.type.call":
    case "call":
      return "calendarEvent.type.call";
    case "interaction.type.email":
    case "email":
      return "calendarEvent.type.email";
    case "interaction.type.other":
    case "interaction":
    case "other":
      return "calendarEvent.type.other";
    default:
      console.warn(
        `Unknown interaction type: ${interactionType}, defaulting to 'other'`,
      );
      return "calendarEvent.type.other";
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
      `Found ${orphanedLinks.length} orphaned calendar event links referencing non-existent events`,
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
  const payload: CalendarEventScheduledPayload = {
    id: calendarEvent.id,
    type: calendarEvent.type,
    summary: calendarEvent.summary,
    scheduledFor: calendarEvent.scheduledFor,
    description: calendarEvent.description,
    durationMinutes: calendarEvent.durationMinutes,
    status: "calendarEvent.status.scheduled",
    location: calendarEvent.location,
    recurrenceRule: calendarEvent.recurrenceRule,
    accountId: calendarEvent.auditData?.accountId,
  };

  return {
    id: `migration:${calendarEvent.id}`,
    type: "calendarEvent.scheduled",
    entityId: calendarEvent.id,
    payload,
    timestamp: originalTimestamp, // Use original timestamp to maintain event order
    deviceId,
  };
};

const createCalendarEventStatusEvents = (
  calendarEvent: CalendarEvent,
  deviceId: string,
): Event[] => {
  if (calendarEvent.status === "calendarEvent.status.completed") {
    const occurredAt = calendarEvent.occurredAt ?? calendarEvent.scheduledFor;
    return [
      {
        id: `migration:${calendarEvent.id}:completed`,
        type: "calendarEvent.completed",
        entityId: calendarEvent.id,
        payload: {
          id: calendarEvent.id,
          occurredAt,
          ...(calendarEvent.auditData?.accountId && {
            accountId: calendarEvent.auditData.accountId,
          }),
          ...(calendarEvent.auditData?.score !== undefined && {
            score: calendarEvent.auditData.score,
          }),
          ...(calendarEvent.auditData?.floorsVisited !== undefined && {
            floorsVisited: calendarEvent.auditData.floorsVisited,
          }),
        },
        timestamp:
          calendarEvent.occurredAt ??
          calendarEvent.updatedAt ??
          calendarEvent.createdAt,
        deviceId,
      },
    ];
  }

  if (calendarEvent.status === "calendarEvent.status.canceled") {
    return [
      {
        id: `migration:${calendarEvent.id}:canceled`,
        type: "calendarEvent.canceled",
        entityId: calendarEvent.id,
        payload: {
          id: calendarEvent.id,
          ...(calendarEvent.auditData?.accountId && {
            accountId: calendarEvent.auditData.accountId,
          }),
          ...(calendarEvent.auditData?.score !== undefined && {
            score: calendarEvent.auditData.score,
          }),
          ...(calendarEvent.auditData?.floorsVisited !== undefined && {
            floorsVisited: calendarEvent.auditData.floorsVisited,
          }),
        },
        timestamp: calendarEvent.updatedAt ?? calendarEvent.createdAt,
        deviceId,
      },
    ];
  }

  return [];
};
