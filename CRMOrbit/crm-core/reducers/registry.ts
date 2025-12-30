import type { Reducer } from "../automerge/applyEvent";
import type { EventType } from "../events/eventTypes";
import { accountContactReducer } from "./accountContact.reducer";
import { accountReducer } from "./account.reducer";
import { contactReducer } from "./contact.reducer";
import { interactionReducer } from "./interaction.reducer";
import { noteLinkReducer } from "./noteLink.reducer";
import { noteReducer } from "./note.reducer";
import { organizationReducer } from "./organization.reducer";

export const REDUCER_MAP: Partial<Record<EventType, Reducer>> = {
  "organization.created": organizationReducer,
  "organization.status.updated": organizationReducer,
  "organization.updated": organizationReducer,
  "account.created": accountReducer,
  "account.status.updated": accountReducer,
  "contact.created": contactReducer,
  "contact.method.added": contactReducer,
  "contact.method.updated": contactReducer,
  "account.contact.linked": accountContactReducer,
  "account.contact.setPrimary": accountContactReducer,
  "account.contact.unsetPrimary": accountContactReducer,
  "note.created": noteReducer,
  "note.updated": noteReducer,
  "note.linked": noteLinkReducer,
  "note.unlinked": noteLinkReducer,
  "interaction.logged": interactionReducer,
};
