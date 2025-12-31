import type { AccountContact, AccountContactRole } from "../relations/accountContact";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";

type AccountContactLinkedPayload = {
  id?: EntityId;
  accountId: EntityId;
  contactId: EntityId;
  role: AccountContactRole;
  isPrimary?: boolean;
};

type AccountContactPrimaryPayload = {
  id?: EntityId;
  accountId: EntityId;
  contactId: EntityId;
  role: AccountContactRole;
};

type AccountContactUnlinkedPayload = {
  id?: EntityId;
  accountId: EntityId;
  contactId: EntityId;
};

const resolveRelationId = <T extends { id?: EntityId }>(
  event: Event,
  payload: T,
): EntityId => {
  if (payload.id && event.entityId && payload.id !== event.entityId) {
    throw new Error(
      `Event entityId mismatch: payload=${payload.id}, event=${event.entityId}`,
    );
  }

  const entityId = payload.id ?? event.entityId;

  if (!entityId) {
    throw new Error("Event entityId is required.");
  }

  return entityId;
};

const findRelationId = (
  doc: AutomergeDoc,
  accountId: EntityId,
  contactId: EntityId,
  role: AccountContactRole,
): EntityId | undefined => {
  return Object.keys(doc.relations.accountContacts).find((id) => {
    const relation = doc.relations.accountContacts[id];
    return (
      relation.accountId === accountId &&
      relation.contactId === contactId &&
      relation.role === role
    );
  });
};

const getPrimaryRelationIds = (
  doc: AutomergeDoc,
  accountId: EntityId,
  role: AccountContactRole,
): EntityId[] => {
  return Object.keys(doc.relations.accountContacts).filter((id) => {
    const relation = doc.relations.accountContacts[id];
    return (
      relation.accountId === accountId && relation.role === role && relation.isPrimary
    );
  });
};

const applyAccountContactLinked = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountContactLinkedPayload;
  const id = resolveRelationId(event, payload);

  if (!doc.accounts[payload.accountId]) {
    throw new Error(`Account not found: ${payload.accountId}`);
  }

  if (!doc.contacts[payload.contactId]) {
    throw new Error(`Contact not found: ${payload.contactId}`);
  }

  if (doc.relations.accountContacts[id]) {
    throw new Error(`AccountContact relation already exists: ${id}`);
  }

  const existingId = findRelationId(
    doc,
    payload.accountId,
    payload.contactId,
    payload.role,
  );

  if (existingId) {
    throw new Error(
      `AccountContact relation already exists for account=${payload.accountId} contact=${payload.contactId} role=${payload.role}`,
    );
  }

  const isPrimary = Boolean(payload.isPrimary);

  if (isPrimary) {
    const primaryIds = getPrimaryRelationIds(doc, payload.accountId, payload.role);
    if (primaryIds.length > 0) {
      throw new Error(
        `Primary contact already set for account=${payload.accountId} role=${payload.role}`,
      );
    }
  }

  const relation: AccountContact = {
    accountId: payload.accountId,
    contactId: payload.contactId,
    role: payload.role,
    isPrimary,
  };

  return {
    ...doc,
    relations: {
      ...doc.relations,
      accountContacts: {
        ...doc.relations.accountContacts,
        [id]: relation,
      },
    },
  };
};

const applyAccountContactSetPrimary = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountContactPrimaryPayload;
  const id =
    payload.id ??
    event.entityId ??
    findRelationId(doc, payload.accountId, payload.contactId, payload.role);

  if (!id) {
    throw new Error("AccountContact relation id is required.");
  }

  const existing = doc.relations.accountContacts[id];
  if (!existing) {
    throw new Error(`AccountContact relation not found: ${id}`);
  }

  if (
    existing.accountId !== payload.accountId ||
    existing.contactId !== payload.contactId ||
    existing.role !== payload.role
  ) {
    throw new Error("AccountContact relation mismatch with payload.");
  }

  const nextAccountContacts = { ...doc.relations.accountContacts };
  const primaryIds = getPrimaryRelationIds(doc, payload.accountId, payload.role);

  for (const primaryId of primaryIds) {
    if (primaryId === id) {
      continue;
    }

    nextAccountContacts[primaryId] = {
      ...nextAccountContacts[primaryId],
      isPrimary: false,
    };
  }

  nextAccountContacts[id] = {
    ...existing,
    isPrimary: true,
  };

  return {
    ...doc,
    relations: {
      ...doc.relations,
      accountContacts: nextAccountContacts,
    },
  };
};

const applyAccountContactUnsetPrimary = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountContactPrimaryPayload;
  const id =
    payload.id ??
    event.entityId ??
    findRelationId(doc, payload.accountId, payload.contactId, payload.role);

  if (!id) {
    throw new Error("AccountContact relation id is required.");
  }

  const existing = doc.relations.accountContacts[id];
  if (!existing) {
    throw new Error(`AccountContact relation not found: ${id}`);
  }

  if (
    existing.accountId !== payload.accountId ||
    existing.contactId !== payload.contactId ||
    existing.role !== payload.role
  ) {
    throw new Error("AccountContact relation mismatch with payload.");
  }

  return {
    ...doc,
    relations: {
      ...doc.relations,
      accountContacts: {
        ...doc.relations.accountContacts,
        [id]: {
          ...existing,
          isPrimary: false,
        },
      },
    },
  };
};

const applyAccountContactUnlinked = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountContactUnlinkedPayload;

  // Find the relation(s) to remove
  const relationIds = Object.keys(doc.relations.accountContacts).filter((id) => {
    const relation = doc.relations.accountContacts[id];
    return (
      relation.accountId === payload.accountId &&
      relation.contactId === payload.contactId
    );
  });

  if (relationIds.length === 0) {
    throw new Error(
      `AccountContact relation not found for account=${payload.accountId} contact=${payload.contactId}`,
    );
  }

  // Remove all relations between this account and contact
  const nextAccountContacts = { ...doc.relations.accountContacts };
  for (const id of relationIds) {
    delete nextAccountContacts[id];
  }

  return {
    ...doc,
    relations: {
      ...doc.relations,
      accountContacts: nextAccountContacts,
    },
  };
};

export const accountContactReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  switch (event.type) {
    case "account.contact.linked":
      return applyAccountContactLinked(doc, event);
    case "account.contact.unlinked":
      return applyAccountContactUnlinked(doc, event);
    case "account.contact.setPrimary":
      return applyAccountContactSetPrimary(doc, event);
    case "account.contact.unsetPrimary":
      return applyAccountContactUnsetPrimary(doc, event);
    default:
      throw new Error(
        `accountContact.reducer does not handle event type: ${event.type}`,
      );
  }
};
