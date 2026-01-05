import type { EntityId } from "../shared/types";

export type EntityLinkType =
  | "organization"
  | "account"
  | "audit"
  | "contact"
  | "note"
  | "interaction";

export type EntityLinkSourceType = "note" | "interaction";

export interface EntityLink {
  linkType: EntityLinkSourceType;
  noteId?: EntityId;
  interactionId?: EntityId;
  entityType: EntityLinkType;
  entityId: EntityId;
}
