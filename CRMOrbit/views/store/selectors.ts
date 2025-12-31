import type { AutomergeDoc } from "@automerge/schema";
import type { NoteLinkEntityType } from "@domains/relations/noteLink";
import { EntityId } from "@domains/shared/types";

export const getPrimaryContacts = (
  doc: AutomergeDoc,
  accountId: EntityId,
): EntityId[] => {
  return Object.values(doc.relations.accountContacts)
    .filter((relation) => relation.accountId === accountId && relation.isPrimary)
    .map((relation) => relation.contactId);
};

export const getNotesForEntity = (
  doc: AutomergeDoc,
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): EntityId[] => {
  return Object.values(doc.relations.noteLinks)
    .filter(
      (link) => link.entityType === entityType && link.entityId === entityId,
    )
    .map((link) => link.noteId);
};
