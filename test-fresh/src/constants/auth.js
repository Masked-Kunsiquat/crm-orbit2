/**
 * Centralized authentication-related constants
 *
 * Defines security constraints and validation rules for the authentication system.
 * These constants are used throughout the auth module to ensure consistent
 * security policies and validation.
 *
 * @module AuthConstants
 */

/**
 * Minimum allowed PIN length
 * Balances security with usability - 4 digits provides reasonable protection
 * while being easy for users to remember and enter
 * @constant {number}
 */
export const MIN_PIN_LENGTH = 4;

/**
 * Maximum allowed PIN length
 * Prevents overly complex PINs that may be difficult to enter on mobile devices
 * while still allowing for stronger security if desired
 * @constant {number}
 */
export const MAX_PIN_LENGTH = 8;
