import type { AutomergeDoc } from "@automerge/schema";
import { getContactDisplayName } from "@domains/contact.utils";
import type { NoteLinkEntityType } from "@domains/relations/noteLink";
import type { EntityId } from "@domains/shared/types";

export type LinkedEntityInfo = {
  name: string;
  entityId: EntityId;
  entityType: NoteLinkEntityType;
  linkId: EntityId;
};

export const getPrimaryContacts = (
  doc: AutomergeDoc,
  accountId: EntityId,
): EntityId[] => {
  return Object.values(doc.relations.accountContacts)
    .filter(
      (relation) => relation.accountId === accountId && relation.isPrimary,
    )
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

export const getEntitiesForNote = (
  doc: AutomergeDoc,
  noteId: EntityId,
): LinkedEntityInfo[] => {
  const links = Object.entries(doc.relations.noteLinks).filter(
    ([, link]) => link.noteId === noteId,
  );

  return links
    .map(([linkId, link]): LinkedEntityInfo | null => {
      let name = "Unknown Entity";
      let entity;

      switch (link.entityType) {
        case "organization":
          entity = doc.organizations[link.entityId];
          if (entity) name = entity.name;
          break;
        case "account":
          entity = doc.accounts[link.entityId];
          if (entity) name = entity.name;
          break;
        case "contact":
          entity = doc.contacts[link.entityId];
          if (entity) name = getContactDisplayName(entity);
          break;
        case "note":
          entity = doc.notes[link.entityId];
          if (entity) name = entity.title;
          break;
        case "interaction":
          entity = doc.interactions[link.entityId];
          if (entity) name = entity.summary;
          break;
      }

      if (!entity) return null;

      return {
        name,
        entityId: link.entityId,
        entityType: link.entityType,
        linkId,
      };
    })
    .filter((e): e is LinkedEntityInfo => e !== null);
};
