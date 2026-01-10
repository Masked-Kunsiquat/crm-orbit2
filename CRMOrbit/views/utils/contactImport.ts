import type { ContactMethod, ContactMethodLabel, ContactType } from "@domains/contact";
import {
  formatPhoneNumber,
  parsePhoneNumber,
  splitLegacyName,
} from "@domains/contact.utils";
import { nextId } from "@domains/shared/idGenerator";

export type DeviceContact = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  emails?: Array<{
    label?: string | null;
    email?: string | null;
    value?: string | null;
  }> | null;
  phoneNumbers?: Array<{
    label?: string | null;
    number?: string | null;
    value?: string | null;
  }> | null;
};

export type ContactImportDraft = {
  sourceId: string;
  sourceName: string;
  firstName: string;
  lastName: string;
  title: string;
  type: ContactType;
  emails: ContactMethod[];
  phones: ContactMethod[];
};

const DEFAULT_CONTACT_TYPE: ContactType = "contact.type.internal";

const resolveContactName = (
  contact: DeviceContact,
): { firstName: string; lastName: string } => {
  const firstName = contact.firstName?.trim() ?? "";
  const lastName = contact.lastName?.trim() ?? "";

  if (!firstName && !lastName && contact.name) {
    return splitLegacyName(contact.name);
  }

  return { firstName, lastName };
};

const normalizeLabel = (label?: string | null): string =>
  (label ?? "").toLowerCase();

const mapEmailLabel = (label?: string | null): ContactMethodLabel => {
  const normalized = normalizeLabel(label);
  if (normalized.includes("work")) {
    return "contact.method.label.work";
  }
  if (normalized.includes("home") || normalized.includes("personal")) {
    return "contact.method.label.personal";
  }
  return "contact.method.label.other";
};

const mapPhoneLabel = (label?: string | null): ContactMethodLabel => {
  const normalized = normalizeLabel(label);
  if (normalized.includes("work")) {
    return "contact.method.label.work";
  }
  if (normalized.includes("mobile") || normalized.includes("cell")) {
    return "contact.method.label.mobile";
  }
  if (normalized.includes("home") || normalized.includes("personal")) {
    return "contact.method.label.personal";
  }
  return "contact.method.label.other";
};

export const createContactMethod = (
  value: string,
  label: ContactMethodLabel,
  extension?: string,
): ContactMethod => ({
  id: nextId("contact-method"),
  value,
  extension,
  label,
  status: "contact.method.status.active",
});

const mapEmails = (contact: DeviceContact): ContactMethod[] => {
  const emails = contact.emails ?? [];
  return emails
    .map((entry) => {
      const value = (entry.email ?? entry.value ?? "").trim();
      if (!value) return null;
      return createContactMethod(value, mapEmailLabel(entry.label));
    })
    .filter((entry): entry is ContactMethod => Boolean(entry));
};

const mapPhones = (contact: DeviceContact): ContactMethod[] => {
  const phones = contact.phoneNumbers ?? [];
  return phones
    .map((entry) => {
      const raw = (entry.number ?? entry.value ?? "").trim();
      if (!raw) return null;
      const parsed = parsePhoneNumber(raw);
      const formatted = formatPhoneNumber(parsed.base);
      const extension = parsed.extension?.replace(/\D/g, "");
      return createContactMethod(
        formatted,
        mapPhoneLabel(entry.label),
        extension || undefined,
      );
    })
    .filter((entry): entry is ContactMethod => Boolean(entry));
};

export const mapDeviceContactToDraft = (
  contact: DeviceContact,
): ContactImportDraft => {
  const { firstName, lastName } = resolveContactName(contact);
  const fallbackName = contact.name?.trim() ?? "";
  const sourceName = fallbackName || `${firstName} ${lastName}`.trim();

  return {
    sourceId: contact.id,
    sourceName,
    firstName,
    lastName,
    title: contact.jobTitle?.trim() ?? "",
    type: DEFAULT_CONTACT_TYPE,
    emails: mapEmails(contact),
    phones: mapPhones(contact),
  };
};

export const getContactImportDisplayName = (
  draft: ContactImportDraft,
): string => {
  const composed = `${draft.firstName} ${draft.lastName}`.trim();
  return composed || draft.sourceName || "";
};
