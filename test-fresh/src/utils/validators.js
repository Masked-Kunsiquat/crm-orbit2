// Validation Helpers
// Centralized utilities for type checking, format validation, and data validation

/**
 * Type checking utilities
 */
export const is = {
  string: (val) => typeof val === 'string',
  number: (val) => typeof val === 'number' && !isNaN(val),
  integer: (val) => Number.isInteger(val),
  boolean: (val) => typeof val === 'boolean',
  array: (val) => Array.isArray(val),
  object: (val) => val !== null && typeof val === 'object' && !Array.isArray(val),
  date: (val) => val instanceof Date && !isNaN(val.getTime()),
  function: (val) => typeof val === 'function',
  null: (val) => val === null,
  undefined: (val) => val === undefined,
  nullish: (val) => val == null,
  empty: (val) => {
    if (val == null) return true;
    if (typeof val === 'string') return val.trim().length === 0;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  }
};

/**
 * Email validation using standard regex pattern
 *
 * NOTE: This provides basic email format validation suitable for contact storage
 * in a CRM context. It is intentionally permissive to avoid rejecting legitimate
 * but unusual email formats. For production applications requiring stricter
 * validation (e.g., authentication, payment processing), consider:
 * - RFC 5322 compliant validation
 * - Using a library like email-validator or validator.js
 * - Optional DNS MX record validation for critical flows
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 * @example
 * isValidEmail('user@example.com') // Returns: true
 * isValidEmail('invalid-email') // Returns: false
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
}

/**
 * Phone number validation (US format)
 * Accepts 10-digit numbers or 11-digit numbers starting with 1
 * @param {string} phone - Phone number to validate (can include formatting)
 * @returns {boolean} True if phone format is valid
 * @example
 * isValidPhone('(555) 123-4567') // Returns: true
 * isValidPhone('1-555-123-4567') // Returns: true
 * isValidPhone('123') // Returns: false
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Validate that a value is a positive integer
 * @param {*} value - Value to validate
 * @returns {boolean} True if value is a positive integer (>= 1)
 */
export function isPositiveInteger(value) {
  return Number.isInteger(value) && value >= 1;
}

/**
 * Validate that a value is a non-negative integer (includes 0)
 * @param {*} value - Value to validate
 * @returns {boolean} True if value is a non-negative integer (>= 0)
 */
export function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validate required fields in an object
 * @param {Object} data - Object containing field values
 * @param {Array<string|Object>} rules - Array of field names or rule objects
 * @returns {{ valid: boolean, errors: Object }} Validation result
 * @example
 * validateRequired(
 *   { name: 'John', age: '' },
 *   ['name', { field: 'age', label: 'Age' }]
 * )
 * // Returns: { valid: false, errors: { age: 'Age is required' } }
 */
export function validateRequired(data, rules) {
  const errors = {};

  for (const rule of rules) {
    const field = typeof rule === 'string' ? rule : rule.field;
    const label = typeof rule === 'string' ? field : rule.label || field;
    const value = data[field];

    // Check if value is empty (handles strings, null, undefined)
    if (value == null || (typeof value === 'string' && value.trim().length === 0)) {
      errors[field] = `${label} is required`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Check if a value is truthy and not an empty string
 * @param {*} value - Value to check
 * @returns {boolean} True if value has meaningful content
 */
export function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}
