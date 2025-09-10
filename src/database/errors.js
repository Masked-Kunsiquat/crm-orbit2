/**
 * Typed error for database operations.
 *
 * Provides a stable `code` and optional `originalError` and `context` fields
 * so callers can reliably handle DB failures across the app.
 */
export class DatabaseError extends Error {
  /**
   * @param {string} message Human-readable error message
   * @param {string} [code='DB_ERROR'] Machine-readable error code
   * @param {any} [originalError=null] Underlying error (from SQLite/WebSQL)
   * @param {object} [context=null] Extra context (e.g., sql, params)
   */
  constructor(message, code = 'DB_ERROR', originalError = null, context = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
    this.context = context || undefined;
  }
}

export default DatabaseError;

