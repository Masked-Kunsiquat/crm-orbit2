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

  // Fallback polyfill using a cryptographically secure RNG.
  const getSecureRandomBytes = (length: number): Uint8Array => {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.getRandomValues === "function"
    ) {
      const bytes = new Uint8Array(length);
      globalThis.crypto.getRandomValues(bytes);
      return bytes;
    }

    // Node.js fallback using built-in crypto.randomBytes
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto") as typeof import("crypto");
    return nodeCrypto.randomBytes(length);
  };

  const bytes = getSecureRandomBytes(16);

  // Per RFC 4122 section 4.4: set the version to 4 and the RFC 4122 variant.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
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
