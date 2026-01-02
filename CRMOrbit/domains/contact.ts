import type { Entity } from "./shared/types";

export type ContactType =
  | "contact.type.internal"
  | "contact.type.external"
  | "contact.type.vendor";

export type ContactMethodStatus =
  | "contact.method.status.active"
  | "contact.method.status.inactive";

export type ContactMethodLabel =
  | "contact.method.label.work"
  | "contact.method.label.personal"
  | "contact.method.label.mobile"
  | "contact.method.label.other";

export interface ContactMethod {
  id: string;
  value: string;
  label: ContactMethodLabel;
  status: ContactMethodStatus;
}

export interface ContactMethods {
  emails: ContactMethod[];
  phones: ContactMethod[];
}

export interface Contact extends Entity {
  type: ContactType;
  // Legacy name field for backwards compatibility
  name?: string;
  firstName: string;
  lastName: string;
  title?: string;
  methods: ContactMethods;
}
