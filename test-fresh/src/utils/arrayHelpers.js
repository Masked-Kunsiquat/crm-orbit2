/**
 * Array Helper Utilities
 *
 * Centralized utilities for common array operations
 * to reduce code duplication and ensure consistent array handling.
 */

import { is } from './validators';

/**
 * Split an array into chunks of a specified size
 *
 * Useful for batch processing, pagination, and working around
 * database parameter limits (e.g., SQLite's 999 parameter limit).
 *
 * @param {Array} array - The array to chunk
 * @param {number} size - The size of each chunk (must be positive integer)
 * @returns {Array<Array>} Array of chunks
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * chunk([], 3) // []
 * chunk([1, 2, 3], 10) // [[1, 2, 3]]
 */
export function chunk(array, size) {
  // Input validation
  if (!is.array(array)) {
    throw new TypeError('First argument must be an array');
  }
  if (!is.integer(size) || size < 1) {
    throw new TypeError('Chunk size must be a positive integer');
  }

  // Handle empty array
  if (array.length === 0) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicate values from an array (primitive values)
 *
 * Uses Set for O(n) performance. For objects, use uniqueBy().
 *
 * @param {Array} array - The array to deduplicate
 * @returns {Array} Array with unique values
 * @example
 * unique([1, 2, 2, 3, 1]) // [1, 2, 3]
 * unique(['a', 'b', 'a']) // ['a', 'b']
 * unique([]) // []
 */
export function unique(array) {
  if (!is.array(array)) {
    throw new TypeError('Argument must be an array');
  }

  return [...new Set(array)];
}

/**
 * Remove duplicate objects from an array based on a key or function
 *
 * For primitive arrays, use unique() instead for better performance.
 *
 * @param {Array} array - The array of objects to deduplicate
 * @param {string|Function} key - Property name or function to extract comparison value
 * @returns {Array} Array with unique objects (first occurrence kept)
 * @example
 * uniqueBy([{id: 1}, {id: 2}, {id: 1}], 'id') // [{id: 1}, {id: 2}]
 * uniqueBy([{a: 1, b: 2}, {a: 1, b: 3}], obj => obj.a) // [{a: 1, b: 2}]
 */
export function uniqueBy(array, key) {
  if (!is.array(array)) {
    throw new TypeError('First argument must be an array');
  }
  if (!is.string(key) && !is.function(key)) {
    throw new TypeError('Key must be a string or function');
  }

  const seen = new Set();
  return array.filter(item => {
    const value = is.function(key) ? key(item) : item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
