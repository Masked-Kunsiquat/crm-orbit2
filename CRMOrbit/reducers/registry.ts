import type { Reducer } from "../automerge/applyEvent";
import type { EventType } from "../events/eventTypes";
import { accountContactReducer } from "./accountContact.reducer";
import { accountReducer } from "./account.reducer";
import { auditReducer } from "./audit.reducer";
import { contactReducer } from "./contact.reducer";
import { interactionReducer } from "./interaction.reducer";
import { entityLinkReducer } from "./entityLink.reducer";
import { noteReducer } from "./note.reducer";
import { organizationReducer } from "./organization.reducer";
import { deviceReducer } from "./device.reducer";
import { codeReducer } from "./code.reducer";
import { settingsReducer } from "./settings.reducer";

export const REDUCER_MAP: Partial<Record<EventType, Reducer>> = {
  "organization.created": organizationReducer,
  "organization.status.updated": organizationReducer,
  "organization.updated": organizationReducer,
  "organization.deleted": organizationReducer,
  "account.created": accountReducer,
  "account.status.updated": accountReducer,
  "account.updated": accountReducer,
  "account.deleted": accountReducer,
  "audit.created": auditReducer,
  "audit.rescheduled": auditReducer,
  "audit.completed": auditReducer,
  "audit.notes.updated": auditReducer,
  "audit.floorsVisited.updated": auditReducer,
  "audit.account.reassigned": auditReducer,
  "contact.created": contactReducer,
  "contact.method.added": contactReducer,
  "contact.method.updated": contactReducer,
  "contact.updated": contactReducer,
  "contact.deleted": contactReducer,
  "account.contact.linked": accountContactReducer,
  "account.contact.unlinked": accountContactReducer,
  "account.contact.setPrimary": accountContactReducer,
  "account.contact.unsetPrimary": accountContactReducer,
  "note.created": noteReducer,
  "note.updated": noteReducer,
  "note.deleted": noteReducer,
  "note.linked": entityLinkReducer,
  "note.unlinked": entityLinkReducer,
  "interaction.linked": entityLinkReducer,
  "interaction.unlinked": entityLinkReducer,
  "interaction.logged": interactionReducer,
  "interaction.updated": interactionReducer,
  "interaction.deleted": interactionReducer,
  "code.created": codeReducer,
  "code.updated": codeReducer,
  "code.encrypted": codeReducer,
  "code.deleted": codeReducer,
  "settings.security.updated": settingsReducer,
  "device.registered": deviceReducer,
};
