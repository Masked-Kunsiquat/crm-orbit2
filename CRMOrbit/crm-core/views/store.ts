import { create } from "zustand";

import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { Account } from "../domains/account";
import type { Contact } from "../domains/contact";
import type { Interaction } from "../domains/interaction";
import type { Note } from "../domains/note";
import type { Organization } from "../domains/organization";
import type { NoteLinkEntityType } from "../relations/noteLink";
import type { EntityId } from "../shared/types";
import { buildTimelineForEntity, type TimelineItem } from "./timeline";
import { getNotesForEntity, getPrimaryContacts } from "./selectors";

export type AutomergeSource = {
  getDoc: () => AutomergeDoc;
  subscribe: (listener: (doc: AutomergeDoc) => void) => () => void;
};

type CrmStoreState = {
  doc: AutomergeDoc;
  events: Event[];
  setDoc: (doc: AutomergeDoc | ((prev: AutomergeDoc) => AutomergeDoc)) => void;
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
};

export const useCrmStore = create<CrmStoreState>((set) => ({
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
      doc: typeof docOrUpdater === "function" ? docOrUpdater(state.doc) : docOrUpdater,
    })),
  setEvents: (eventsOrUpdater) =>
    set((state) => ({
      events:
        typeof eventsOrUpdater === "function"
          ? eventsOrUpdater(state.events)
          : eventsOrUpdater,
    })),
}));

export const bindAutomergeSource = (source: AutomergeSource): (() => void) => {
  useCrmStore.getState().setDoc(source.getDoc());
  return source.subscribe((doc) => {
    useCrmStore.getState().setDoc(doc);
  });
};

export const useOrganizations = (): Organization[] =>
  useCrmStore((state) => Object.values(state.doc.organizations));

export const useAccounts = (): Account[] =>
  useCrmStore((state) => Object.values(state.doc.accounts));

export const useContacts = (accountId: EntityId): Contact[] =>
  useCrmStore((state) => {
    const contactIds = Object.values(state.doc.relations.accountContacts)
      .filter((relation) => relation.accountId === accountId)
      .map((relation) => relation.contactId);

    return contactIds
      .map((contactId) => state.doc.contacts[contactId])
      .filter((contact): contact is Contact => Boolean(contact));
  });

export const usePrimaryContacts = (accountId: EntityId): Contact[] =>
  useCrmStore((state) => {
    const contactIds = getPrimaryContacts(state.doc, accountId);
    return contactIds
      .map((contactId) => state.doc.contacts[contactId])
      .filter((contact): contact is Contact => Boolean(contact));
  });

export const useNotes = (
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): Note[] =>
  useCrmStore((state) => {
    const noteIds = getNotesForEntity(state.doc, entityType, entityId);
    return noteIds
      .map((noteId) => state.doc.notes[noteId])
      .filter((note): note is Note => Boolean(note));
  });

export const useTimeline = (
  entityType: NoteLinkEntityType,
  entityId: EntityId,
): TimelineItem[] =>
  useCrmStore((state) =>
    buildTimelineForEntity(state.doc, state.events, entityType, entityId),
  );

export const useOrganization = (id: EntityId): Organization | undefined =>
  useCrmStore((state) => state.doc.organizations[id]);

export const useAccount = (id: EntityId): Account | undefined =>
  useCrmStore((state) => state.doc.accounts[id]);

export const useContact = (id: EntityId): Contact | undefined =>
  useCrmStore((state) => state.doc.contacts[id]);

export const useNote = (id: EntityId): Note | undefined =>
  useCrmStore((state) => state.doc.notes[id]);

export const useInteraction = (id: EntityId): Interaction | undefined =>
  useCrmStore((state) => state.doc.interactions[id]);

export const useAccountsByOrganization = (
  organizationId: EntityId,
): Account[] =>
  useCrmStore((state) =>
    Object.values(state.doc.accounts).filter(
      (account) => account.organizationId === organizationId,
    ),
  );
