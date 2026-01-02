import type { Contact } from "./contact";

/**
 * Get the full display name for a contact.
 * Handles legacy 'name' field for backwards compatibility.
 */
export const getContactDisplayName = (contact: Contact): string => {
  // If we have firstName and lastName, use those
  if (contact.firstName || contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`.trim();
  }

  // Fall back to legacy name field if it exists
  if (contact.name) {
    return contact.name;
  }

  // Fallback if no name data exists
  return "Unnamed Contact";
};

/**
 * Split a legacy full name into firstName and lastName.
 * Everything before the first space becomes firstName,
 * everything after becomes lastName.
 */
export const splitLegacyName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    // No space found, treat whole thing as last name
    return { firstName: "", lastName: trimmed };
  }

  return {
    firstName: trimmed.substring(0, spaceIndex),
    lastName: trimmed.substring(spaceIndex + 1),
  };
};

/**
 * Format a phone number as XXX-XXX-XXXX when possible.
 */
export const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length !== 10) {
    return value;
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
};

/**
 * Get the primary email for a contact (first active email, or first email if none active)
 */
export const getPrimaryEmail = (contact: Contact): string | undefined => {
  if (!contact.methods?.emails || contact.methods.emails.length === 0) {
    return undefined;
  }

  const activeEmail = contact.methods.emails.find(
    (email) => email.status === "contact.method.status.active",
  );

  return activeEmail?.value || contact.methods.emails[0]?.value;
};

/**
 * Get the primary phone for a contact (first active phone, or first phone if none active)
 */
export const getPrimaryPhone = (contact: Contact): string | undefined => {
  if (!contact.methods?.phones || contact.methods.phones.length === 0) {
    return undefined;
  }

  const activePhone = contact.methods.phones.find(
    (phone) => phone.status === "contact.method.status.active",
  );

  return activePhone?.value || contact.methods.phones[0]?.value;
};
