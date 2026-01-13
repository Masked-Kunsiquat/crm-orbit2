import type { EntityId } from "../shared/types";

export type EntityLinkType =
  | "organization"
  | "account"
  | "audit" // DEPRECATED - audits are now calendar events
  | "contact"
  | "note"
  | "interaction" // DEPRECATED - interactions are now calendar events
  | "calendarEvent"; // NEW unified calendar event type

export type EntityLinkSourceType =
  | "note"
  | "interaction" // DEPRECATED - keep for backward compatibility during migration
  | "calendarEvent"; // NEW

export interface EntityLink {
  linkType: EntityLinkSourceType;

  // Legacy fields (maintain for backward compatibility during migration)
  noteId?: EntityId;
  interactionId?: EntityId; // DEPRECATED - will be migrated to calendarEventId

  // New field for unified calendar events
  calendarEventId?: EntityId;

  // Target entity
  entityType: EntityLinkType;
  entityId: EntityId;
}
