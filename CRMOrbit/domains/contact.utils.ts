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

export type ParsedPhoneNumber = {
  base: string;
  extension?: string;
  hasExtensionMarker: boolean;
};

const EXTENSION_REGEX = /^(.*?)(?:\s*(?:ext\.?|extension|x|#)\s*(\d*))$/i;

export const parsePhoneNumber = (value: string): ParsedPhoneNumber => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { base: "", hasExtensionMarker: false };
  }

  const match = trimmed.match(EXTENSION_REGEX);
  if (!match) {
    return { base: trimmed, hasExtensionMarker: false };
  }

  const base = (match[1] ?? "").trim();
  const extension = (match[2] ?? "").trim();
  return {
    base,
    extension: extension ? extension : undefined,
    hasExtensionMarker: true,
  };
};

const formatBasePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const digits = trimmed.replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length !== 10) {
    return trimmed;
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
};

/**
 * Format a phone number as XXX-XXX-XXXX when possible, preserving extensions.
 */
export const formatPhoneNumber = (
  value: string,
  extension?: string,
): string => {
  const trimmedExtension = extension?.trim();
  const resolved = trimmedExtension
    ? { base: value, extension: trimmedExtension, hasExtensionMarker: true }
    : parsePhoneNumber(value);
  const formattedBase = formatBasePhoneNumber(resolved.base);
  if (!resolved.hasExtensionMarker) {
    return formattedBase;
  }

  if (!formattedBase) {
    return value.trim();
  }

  const suffix = resolved.extension ? ` x${resolved.extension}` : " x";
  return `${formattedBase}${suffix}`;
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

/**
 * Type guard for contact type
 */
const isContactType = (value: unknown): value is Contact["type"] => {
  return (
    typeof value === "string" &&
    (value === "contact.type.internal" || value === "contact.type.external")
  );
};

/**
 * Resolve contact methods from payload, with fallback to existing or default
 */
const resolveContactMethods = (
  payloadMethods: unknown,
  fallback: Contact["methods"],
): Contact["methods"] => {
  if (
    payloadMethods &&
    typeof payloadMethods === "object" &&
    "emails" in payloadMethods &&
    "phones" in payloadMethods
  ) {
    return payloadMethods as Contact["methods"];
  }
  return fallback;
};

/**
 * Build contact state from event payload.
 * Used by both reducers and timeline rendering for consistent state derivation.
 *
 * @param id - Contact entity ID
 * @param payload - Event payload (may be partial for updates)
 * @param timestamp - Event timestamp
 * @param existing - Existing contact state (for updates)
 * @returns Complete contact state
 */
export const buildContactFromPayload = (
  id: string,
  payload: Record<string, unknown>,
  timestamp: string,
  existing?: Contact,
): Contact => ({
  id,
  name: typeof payload.name === "string" ? payload.name : existing?.name,
  firstName:
    typeof payload.firstName === "string"
      ? payload.firstName
      : (existing?.firstName ?? ""),
  lastName:
    typeof payload.lastName === "string"
      ? payload.lastName
      : (existing?.lastName ?? ""),
  type: isContactType(payload.type)
    ? payload.type
    : (existing?.type ?? "contact.type.internal"),
  title: typeof payload.title === "string" ? payload.title : existing?.title,
  methods: resolveContactMethods(
    payload.methods,
    existing?.methods ?? { emails: [], phones: [] },
  ),
  createdAt: existing?.createdAt ?? timestamp,
  updatedAt: timestamp,
});
