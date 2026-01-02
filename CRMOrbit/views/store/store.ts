import { useRef } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { AutomergeDoc } from "@automerge/schema";
import type { Event } from "@events/event";
import type { Account } from "@domains/account";
import type { Contact } from "@domains/contact";
import type { Interaction } from "@domains/interaction";
import type { Note } from "@domains/note";
import type { Organization } from "@domains/organization";
import { NoteLinkEntityType } from "@domains/relations/noteLink";
import { EntityId } from "@domains/shared/types";
import { buildTimelineForEntity, type TimelineItem } from "./timeline";
import {
  getEntitiesForNote,
  getNotesForEntity,
  getPrimaryContacts,
  LinkedEntityInfo,
} from "./selectors";

// Internal store state - not exported
type CrmStoreState = {
  doc: AutomergeDoc;
  events: Event[];
  setDoc: (doc: AutomergeDoc | ((prev: AutomergeDoc) => AutomergeDoc)) => void;
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
};

// Internal store instance - only accessible within this module and trusted internal hooks
const crmStore = create<CrmStoreState>((set) => ({
  doc: {
    organizations: {},
    accounts: {},
    contacts: {},
    notes: {},
    interactions: {},
    relations: {
      accountContacts: {},
      noteLinks: {},
    },
  },
  events: [],
  setDoc: (docOrUpdater) =>
    set((state) => ({
      doc:
        typeof docOrUpdater === "function"
          ? docOrUpdater(state.doc)
          : docOrUpdater,
    })),
  setEvents: (eventsOrUpdater) =>
    set((state) => ({
      events:
        typeof eventsOrUpdater === "function"
          ? eventsOrUpdater(state.events)
          : eventsOrUpdater,
    })),
}));

const areLinkedEntitiesEqual = (
  left: LinkedEntityInfo[],
  right: LinkedEntityInfo[],
): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const leftItem = left[i];
    const rightItem = right[i];
    if (
      leftItem.linkId !== rightItem.linkId ||
      leftItem.entityId !== rightItem.entityId ||
      leftItem.entityType !== rightItem.entityType ||
      leftItem.name !== rightItem.name
    ) {
      return false;
    }
  }
  return true;
};

const areTimelineItemsEqual = (
  left: TimelineItem[],
  right: TimelineItem[],
): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const leftItem = left[i];
    const rightItem = right[i];
    if (
      leftItem.kind !== rightItem.kind ||
      leftItem.timestamp !== rightItem.timestamp
    ) {
      return false;
    }
    if (leftItem.kind === "event" && rightItem.kind === "event") {
      if (leftItem.event.id !== rightItem.event.id) return false;
    } else if (leftItem.kind === "note" && rightItem.kind === "note") {
      if (leftItem.note.id !== rightItem.note.id) return false;
    } else if (
      leftItem.kind === "interaction" &&
      rightItem.kind === "interaction"
    ) {
      if (leftItem.interaction.id !== rightItem.interaction.id) return false;
    }
  }
  return true;
};

/**
 * Internal API for trusted hooks (useDispatch, App initialization, etc.)
 * This allows mutation through the proper event-sourcing flow only.
 * DO NOT export this - it's intentionally kept internal.
 */
export const __internal_getCrmStore = () => crmStore;

// ============================================================================
// PUBLIC READ-ONLY SELECTOR HOOKS
// These are the only way external components can access store state
// ============================================================================

export const useOrganizations = (): Organization[] => {
  const selector = (state: CrmStoreState) =>
    Object.values(state.doc.organizations);
  return crmStore(useShallow(selector));
};

export const useAccounts = (): Account[] => {
  const selector = (state: CrmStoreState) => Object.values(state.doc.accounts);
  return crmStore(useShallow(selector));
};

export const useContacts = (accountId: EntityId): Contact[] => {
  const selector = (state: CrmStoreState) => {
    const contactIds = Object.values(state.doc.relations.accountContacts)
      .filter((relation) => relation.accountId === accountId)
      .map((relation) => relation.contactId);

    return contactIds
      .map((contactId) => state.doc.contacts[contactId])
      .filter((contact): contact is Contact => Boolean(contact));
  };
  return crmStore(useShallow(selector));
};

export const usePrimaryContacts = (accountId: EntityId): Contact[] => {
  const selector = (state: CrmStoreState) => {
    const contactIds = getPrimaryContacts(state.doc, accountId);
    return contactIds
      .map((contactId) => state.doc.contacts[contactId])
      .filter((contact): contact is Contact => Boolean(contact));
  };
  return crmStore(useShallow(selector));
};

export const useNotes = (
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): Note[] => {
  const selector = (state: CrmStoreState) => {
    const noteIds = getNotesForEntity(state.doc, entityType, entityId);
    return noteIds
      .map((noteId) => state.doc.notes[noteId])
      .filter((note): note is Note => Boolean(note));
  };
  return crmStore(useShallow(selector));
};

export const useEntitiesForNote = (noteId: EntityId): LinkedEntityInfo[] => {
  const cacheRef = useRef<LinkedEntityInfo[] | null>(null);
  const selector = (state: CrmStoreState) => {
    const next = getEntitiesForNote(state.doc, noteId);
    const cached = cacheRef.current;
    if (cached && areLinkedEntitiesEqual(cached, next)) {
      return cached;
    }
    cacheRef.current = next;
    return next;
  };
  return crmStore(selector);
};

export const useTimeline = (
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): TimelineItem[] => {
  const cacheRef = useRef<TimelineItem[] | null>(null);
  const selector = (state: CrmStoreState) => {
    const next = buildTimelineForEntity(
      state.doc,
      state.events,
      entityType,
      entityId,
    );
    const cached = cacheRef.current;
    if (cached && areTimelineItemsEqual(cached, next)) {
      return cached;
    }
    cacheRef.current = next;
    return next;
  };
  return crmStore(selector);
};

export const useOrganization = (id: EntityId): Organization | undefined =>
  crmStore(useShallow((state) => state.doc.organizations[id]));

export const useAccount = (id: EntityId): Account | undefined =>
  crmStore(useShallow((state) => state.doc.accounts[id]));

export const useContact = (id: EntityId): Contact | undefined =>
  crmStore(useShallow((state) => state.doc.contacts[id]));

export const useNote = (id: EntityId): Note | undefined =>
  crmStore(useShallow((state) => state.doc.notes[id]));

export const useInteraction = (id: EntityId): Interaction | undefined =>
  crmStore(useShallow((state) => state.doc.interactions[id]));

export const useAccountsByOrganization = (
  organizationId: EntityId,
): Account[] => {
  const selector = (state: CrmStoreState) =>
    Object.values(state.doc.accounts).filter(
      (account) => account.organizationId === organizationId,
    );
  return crmStore(useShallow(selector));
};

export const useContactsByOrganization = (
  organizationId: EntityId,
): Contact[] => {
  const selector = (state: CrmStoreState) => {
    // Get all accounts for this organization
    const accountIds = Object.values(state.doc.accounts)
      .filter((account) => account.organizationId === organizationId)
      .map((account) => account.id);

    // Get all contact IDs linked to these accounts
    const contactIds = Object.values(state.doc.relations.accountContacts)
      .filter((relation) => accountIds.includes(relation.accountId))
      .map((relation) => relation.contactId);

    // Remove duplicates and get contacts
    const uniqueContactIds = Array.from(new Set(contactIds));
    return uniqueContactIds
      .map((contactId) => state.doc.contacts[contactId])
      .filter((contact): contact is Contact => Boolean(contact));
  };
  return crmStore(useShallow(selector));
};

export const useAllNotes = (): Note[] => {
  const selector = (state: CrmStoreState) => Object.values(state.doc.notes);
  return crmStore(useShallow(selector));
};

export const useAllContacts = (): Contact[] => {
  const selector = (state: CrmStoreState) => Object.values(state.doc.contacts);
  return crmStore(useShallow(selector));
};

export const useAllInteractions = (): Interaction[] => {
  const selector = (state: CrmStoreState) =>
    Object.values(state.doc.interactions);
  return crmStore(useShallow(selector));
};

export const useAccountContactRelations = () => {
  const selector = (state: CrmStoreState) =>
    state.doc.relations.accountContacts;
  return crmStore(useShallow(selector));
};

export const useAccountsByContact = (contactId: EntityId): Account[] => {
  const selector = (state: CrmStoreState) => {
    const accountIds = Object.values(state.doc.relations.accountContacts)
      .filter((relation) => relation.contactId === contactId)
      .map((relation) => relation.accountId);

    return accountIds
      .map((accountId) => state.doc.accounts[accountId])
      .filter((account): account is Account => Boolean(account));
  };
  return crmStore(useShallow(selector));
};
