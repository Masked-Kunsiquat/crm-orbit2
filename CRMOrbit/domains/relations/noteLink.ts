import type { EntityId } from "../shared/types";

export type NoteLinkEntityType =
  | "organization"
  | "account"
  | "contact"
  | "note"
  | "interaction";

export interface NoteLink {
  noteId: EntityId;
  entityType: NoteLinkEntityType;
  entityId: EntityId;
}
