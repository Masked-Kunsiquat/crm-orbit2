/**
 * ID Generator for offline-first, multi-device CRM
 *
 * Generates globally unique IDs that are safe for:
 * - Multiple devices (no collisions across devices)
 * - Offline operation (deterministic, no server required)
 * - Event sourcing (immutable, permanent IDs)
 *
 * Format: {prefix}-{uuid}
 * Example: "org-550e8400-e29b-41d4-a716-446655440000"
 */

/**
 * Generate a UUID v4 (random)
 * Falls back to a polyfill for environments without crypto.randomUUID
 */
const generateUUID = (): string => {
  // Use native crypto.randomUUID if available (Node 19+, modern browsers, Expo)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback polyfill using Math.random (less secure but works everywhere)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Generate a globally unique entity ID
 *
 * @param prefix - Entity type prefix (e.g., "org", "account", "contact")
 * @returns Globally unique ID in format: {prefix}-{uuid}
 *
 * @example
 * nextId("org") // "org-550e8400-e29b-41d4-a716-446655440000"
 * nextId("account") // "account-7c9e6679-7425-40de-944b-e07fc1f90ae7"
 */
export const nextId = (prefix: string): string => {
  return `${prefix}-${generateUUID()}`;
};
