import type { AutomergeDoc } from "@automerge/schema";
import { getContactDisplayName } from "@domains/contact.utils";
import type { Audit } from "@domains/audit";
import type { EntityLink, EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";

export type LinkedEntityInfo = {
  name?: string;
  entityId: EntityId;
  entityType: EntityLinkType;
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

export const getLinkedEntities = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId,
): Array<{ linkId: EntityId; link: EntityLink }> => {
  return Object.entries(doc.relations.entityLinks)
    .filter(
      ([, link]) =>
        link.entityType === entityType && link.entityId === entityId,
    )
    .map(([linkId, link]) => ({ linkId, link }));
};

export const getNotesForEntity = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId,
): EntityId[] => {
  return getLinkedEntities(doc, entityType, entityId)
    .filter(({ link }) => link.linkType === "note" && link.noteId)
    .map(({ link }) => link.noteId as EntityId);
};

export const getInteractionsForEntity = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId,
): EntityId[] => {
  return getLinkedEntities(doc, entityType, entityId)
    .filter(({ link }) => link.linkType === "interaction" && link.interactionId)
    .map(({ link }) => link.interactionId as EntityId);
};

export const getEntitiesForNote = (
  doc: AutomergeDoc,
  noteId: EntityId,
): LinkedEntityInfo[] => {
  const links = Object.entries(doc.relations.entityLinks).filter(
    ([, link]) => link.linkType === "note" && link.noteId === noteId,
  );

  return links
    .map(([linkId, link]): LinkedEntityInfo | null => {
      let name: string | undefined;
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
        case "audit":
          entity = doc.audits[link.entityId] as Audit | undefined;
          if (entity) {
            const stamp = entity.occurredAt ?? entity.scheduledFor;
            name = stamp ? `Audit ${stamp}` : `Audit ${entity.id}`;
          }
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

export const getEntitiesForInteraction = (
  doc: AutomergeDoc,
  interactionId: EntityId,
): LinkedEntityInfo[] => {
  const links = Object.entries(doc.relations.entityLinks).filter(
    ([, link]) =>
      link.linkType === "interaction" && link.interactionId === interactionId,
  );

  return links
    .map(([linkId, link]): LinkedEntityInfo | null => {
      let name: string | undefined;
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
        case "audit":
          entity = doc.audits[link.entityId] as Audit | undefined;
          if (entity) {
            const stamp = entity.occurredAt ?? entity.scheduledFor;
            name = stamp ? `Audit ${stamp}` : `Audit ${entity.id}`;
          }
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

/**
 * Calendar Event Selectors
 * Unified selectors for calendar events (replaces interactions + audits)
 */

export const getCalendarEventsForEntity = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId,
): EntityId[] => {
  return getLinkedEntities(doc, entityType, entityId)
    .filter(
      ({ link }) => link.linkType === "calendarEvent" && link.calendarEventId,
    )
    .map(({ link }) => link.calendarEventId as EntityId);
};

export const getEntitiesForCalendarEvent = (
  doc: AutomergeDoc,
  calendarEventId: EntityId,
): LinkedEntityInfo[] => {
  const links = Object.entries(doc.relations.entityLinks).filter(
    ([, link]) =>
      link.linkType === "calendarEvent" &&
      link.calendarEventId === calendarEventId,
  );

  return links
    .map(([linkId, link]): LinkedEntityInfo | null => {
      let name: string | undefined;
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
        case "calendarEvent":
          entity = doc.calendarEvents[link.entityId];
          if (entity) name = entity.summary;
          break;
        // Legacy support during migration
        case "audit":
          entity = doc.audits[link.entityId] as Audit | undefined;
          if (entity) {
            const stamp = entity.occurredAt ?? entity.scheduledFor;
            name = stamp ? `Audit ${stamp}` : `Audit ${entity.id}`;
          }
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
