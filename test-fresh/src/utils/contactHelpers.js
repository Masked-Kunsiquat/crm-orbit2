// Contact Helpers
// Centralized utilities for contact-related operations (display names, initials, phone formatting)

import { safeTrim, filterNonEmptyStrings, hasContent } from './stringHelpers';

/**
 * Get a contact's display name with fallback handling
 *
 * Priority order:
 * 1. contact.display_name (if present and non-empty)
 * 2. Computed from first_name, middle_name, last_name
 * 3. Fallback value (default: 'Unknown Contact')
 *
 * @param {Object} contact - Contact object with name fields
 * @param {string} fallback - Fallback value if no name available
 * @returns {string} Display name or fallback
 * @example
 * getContactDisplayName({ display_name: 'Johnny' }) // 'Johnny'
 * getContactDisplayName({ first_name: 'John', last_name: 'Doe' }) // 'John Doe'
 * getContactDisplayName({}) // 'Unknown Contact'
 */
export function getContactDisplayName(contact, fallback = 'Unknown Contact') {
  if (!contact) return fallback;

  // Use display_name if available
  if (hasContent(contact.display_name)) {
    return safeTrim(contact.display_name);
  }

  // Build from name components
  const nameParts = filterNonEmptyStrings([
    contact.first_name,
    contact.middle_name,
    contact.last_name
  ]);

  return nameParts.length > 0 ? nameParts.join(' ') : fallback;
}

/**
 * Extract initials from first and last name
 *
 * Handles Unicode correctly including emoji and multi-byte characters.
 *
 * @param {string} firstName - First name
 * @param {string} lastName - Last name (optional)
 * @param {string} fallback - Fallback value if no names provided
 * @returns {string} Initials (uppercase) or fallback
 * @example
 * getInitials('John', 'Doe') // 'JD'
 * getInitials('John') // 'J'
 * getInitials('José', 'García') // 'JG'
 * getInitials('', '') // '?'
 */
export function getInitials(firstName, lastName, fallback = '?') {
  const first = safeTrim(firstName);
  const last = safeTrim(lastName);

  // Use spread operator to handle multi-byte Unicode characters (emoji, surrogate pairs)
  const firstInitial = first ? [...first][0].toUpperCase() : '';
  const lastInitial = last ? [...last][0].toUpperCase() : '';

  return firstInitial + lastInitial || fallback;
}

/**
 * Normalize phone number by removing all non-digit characters
 *
 * @param {string|number} phone - Phone number to normalize
 * @returns {string} Phone number with only digits
 * @example
 * normalizePhoneNumber('(555) 123-4567') // '5551234567'
 * normalizePhoneNumber('1-555-123-4567') // '15551234567'
 */
export function normalizePhoneNumber(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Format phone number for display (US/NANP format)
 *
 * Currently supports North American Numbering Plan (NANP) format:
 * - 10-digit: (555) 123-4567
 * - 11-digit starting with 1: +1 (555) 123-4567
 * - Other formats: returns as-is (preserves international numbers)
 *
 * Note: This CRM app supports 5 locales (en, es, de, fr, zh-Hans), which may include
 * international phone numbers. The current implementation:
 * - Formats US/Canada numbers for readability
 * - Preserves international numbers unchanged (e.g., +33 1 42 86 82 00 for France)
 * - Allows users to store numbers in any format
 *
 * Future enhancement: Consider adding locale-aware formatting using a library like
 * libphonenumber-js when international user base grows. For now, returning the
 * original format for non-NANP numbers is the safest approach.
 *
 * @param {string|number} phone - Phone number to format
 * @returns {string} Formatted phone number or original if format unknown
 * @example
 * formatPhoneNumber('5551234567') // '(555) 123-4567'
 * formatPhoneNumber('15551234567') // '+1 (555) 123-4567'
 * formatPhoneNumber('+33142868200') // '+33142868200' (unchanged)
 * formatPhoneNumber('123') // '123' (too short, unchanged)
 */
export function formatPhoneNumber(phone) {
  const cleaned = normalizePhoneNumber(phone);

  // 10-digit: (555) 123-4567
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // 11-digit starting with 1: +1 (555) 123-4567
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Unknown format: return as-is to preserve international numbers
  // This ensures French (+33), German (+49), Chinese (+86), etc. numbers display correctly
  return String(phone || '');
}
