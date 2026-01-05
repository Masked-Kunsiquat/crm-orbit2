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

  const byteToHex: string[] = [];
  for (let i = 0; i < 256; i += 1) {
    byteToHex.push((i + 0x100).toString(16).substring(1));
  }

  return (
    byteToHex[bytes[0]] +
    byteToHex[bytes[1]] +
    byteToHex[bytes[2]] +
    byteToHex[bytes[3]] +
    "-" +
    byteToHex[bytes[4]] +
    byteToHex[bytes[5]] +
    "-" +
    byteToHex[bytes[6]] +
    byteToHex[bytes[7]] +
    "-" +
    byteToHex[bytes[8]] +
    byteToHex[bytes[9]] +
    "-" +
    byteToHex[bytes[10]] +
    byteToHex[bytes[11]] +
    byteToHex[bytes[12]] +
    byteToHex[bytes[13]] +
    byteToHex[bytes[14]] +
    byteToHex[bytes[15]]
  );
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
