// SQL Building Helpers
// Centralized utilities for constructing SQL queries consistently

import { is, isPositiveInteger } from '../utils/validators';

/**
 * Generate SQL parameter placeholders.
 * @param {number} count - Number of placeholders needed
 * @returns {string} Comma-separated placeholders (e.g., "?, ?, ?")
 * @example
 * placeholders(3) // Returns: "?, ?, ?"
 * @throws {Error} When count is not a positive integer
 */
export function placeholders(count) {
  if (!is.number(count) || !isPositiveInteger(count)) {
    if (is.number(count) && count < 1) {
      return ''; // Backwards compatibility: return empty string for count < 1
    }
    throw new Error(`placeholders() requires a positive integer, got: ${count}`);
  }
  return new Array(count).fill('?').join(', ');
}

/**
 * Extract allowed fields from an object, filtering out undefined values.
 * @param {Object} obj - Source object
 * @param {string[]} fields - Array of allowed field names
 * @returns {Object} New object with only allowed fields (excluding undefined)
 * @example
 * pick({ name: 'John', age: 30, extra: 'ignore' }, ['name', 'age'])
 * // Returns: { name: 'John', age: 30 }
 */
export function pick(obj, fields) {
  const out = {};
  for (const key of fields) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      out[key] = obj[key];
    }
  }
  return out;
}

/**
 * Build UPDATE SET clause with corresponding values array.
 * @param {Object} data - Object with fields to update
 * @returns {{ setClause: string, values: any[] }} SET clause and values
 * @example
 * buildUpdateSet({ name: 'John', age: 30 })
 * // Returns: { setClause: "name = ?, age = ?", values: ['John', 30] }
 */
export function buildUpdateSet(data) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return { setClause: '', values: [] };
  }
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  return { setClause, values };
}

/**
 * Build INSERT statement with corresponding values array.
 * @param {string} table - Table name
 * @param {Object} data - Object with fields to insert
 * @returns {{ sql: string, values: any[] }} Complete INSERT SQL and values
 * @example
 * buildInsert('users', { name: 'John', age: 30 })
 * // Returns: {
 * //   sql: "INSERT INTO users (name, age) VALUES (?, ?)",
 * //   values: ['John', 30]
 * // }
 */
export function buildInsert(table, data) {
  const cols = Object.keys(data);
  if (cols.length === 0) {
    throw new Error('Cannot build INSERT with empty data object');
  }
  const values = cols.map(k => data[k]);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders(cols.length)})`;
  return { sql, values };
}
