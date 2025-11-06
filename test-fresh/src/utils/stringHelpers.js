/**
 * String Helper Utilities
 *
 * Centralized string manipulation functions to reduce code duplication
 * and ensure consistent string handling across the application.
 */

/**
 * Safely trim a value, handling null/undefined cases
 * @param {any} value - Value to trim
 * @returns {string} Trimmed string
 *
 * @example
 * safeTrim('  hello  ') // 'hello'
 * safeTrim(null) // ''
 * safeTrim(undefined) // ''
 */
export function safeTrim(value) {
  return String(value || '').trim();
}

/**
 * Normalize a string by trimming and converting to lowercase
 * @param {any} value - Value to normalize
 * @returns {string} Normalized string
 *
 * @example
 * normalizeTrimLowercase('  HELLO  ') // 'hello'
 * normalizeTrimLowercase('John@Email.COM') // 'john@email.com'
 */
export function normalizeTrimLowercase(value) {
  return safeTrim(value).toLowerCase();
}

/**
 * Check if a value has content after trimming
 * @param {any} value - Value to check
 * @returns {boolean} True if value has content
 *
 * @example
 * hasContent('hello') // true
 * hasContent('  ') // false
 * hasContent('') // false
 * hasContent(null) // false
 */
export function hasContent(value) {
  return safeTrim(value).length > 0;
}

/**
 * Filter an array of objects to only include items with non-empty field values
 * @param {Array} items - Array of objects to filter
 * @param {string} field - Field name to check (default: 'value')
 * @returns {Array} Filtered array
 *
 * @example
 * const phones = [
 *   { value: '555-1234' },
 *   { value: '  ' },
 *   { value: '' }
 * ];
 * filterNonEmpty(phones) // [{ value: '555-1234' }]
 */
export function filterNonEmpty(items, field = 'value') {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter(item => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    return hasContent(item[field]);
  });
}

/**
 * Filter an array of strings to only include non-empty values
 * @param {Array} items - Array of strings to filter
 * @returns {Array} Filtered array
 *
 * @example
 * filterNonEmptyStrings(['hello', '', '  ', 'world']) // ['hello', 'world']
 */
export function filterNonEmptyStrings(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter(hasContent);
}

/**
 * Capitalize the first letter of a string
 * @param {any} value - Value to capitalize
 * @returns {string} Capitalized string
 *
 * @example
 * capitalize('hello') // 'Hello'
 * capitalize('HELLO') // 'HELLO'
 */
export function capitalize(value) {
  const str = safeTrim(value);
  if (str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param {any} value - Value to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @param {string} suffix - Suffix to append (default: '...')
 * @returns {string} Truncated string
 *
 * @example
 * truncate('Hello world', 5) // 'Hello...'
 */
export function truncate(value, maxLength = 50, suffix = '...') {
  // Normalize and validate maxLength
  let validatedMaxLength = Number(maxLength);
  validatedMaxLength = Math.floor(validatedMaxLength);

  // If not a finite integer >= 1, fall back to default
  if (!Number.isFinite(validatedMaxLength) || validatedMaxLength < 1) {
    validatedMaxLength = 50;
  }

  const str = safeTrim(value);
  if (str.length <= validatedMaxLength) {
    return str;
  }
  return str.substring(0, validatedMaxLength) + suffix;
}
