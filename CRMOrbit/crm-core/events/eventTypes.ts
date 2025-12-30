export const EVENT_TYPES = [
  "organization.created",
  "organization.status.updated",
  "organization.updated",
  "account.created",
  "account.status.updated",
  "contact.created",
  "contact.method.added",
  "contact.method.updated",
  "account.contact.linked",
  "account.contact.setPrimary",
  "account.contact.unsetPrimary",
  "note.created",
  "note.updated",
  "note.linked",
  "note.unlinked",
  "interaction.logged",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
