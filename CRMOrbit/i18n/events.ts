import type { EventType } from "../events/eventTypes";

export const EVENT_I18N_KEYS: Record<EventType, string> = {
  "organization.created": "events.organization.created",
  "organization.status.updated": "events.organization.status.updated",
  "organization.updated": "events.organization.updated",
  "account.created": "events.account.created",
  "account.status.updated": "events.account.status.updated",
  "contact.created": "events.contact.created",
  "contact.method.added": "events.contact.method.added",
  "contact.method.updated": "events.contact.method.updated",
  "account.contact.linked": "events.account.contact.linked",
  "account.contact.setPrimary": "events.account.contact.setPrimary",
  "account.contact.unsetPrimary": "events.account.contact.unsetPrimary",
  "note.created": "events.note.created",
  "note.updated": "events.note.updated",
  "note.linked": "events.note.linked",
  "note.unlinked": "events.note.unlinked",
  "interaction.logged": "events.interaction.logged",
};
