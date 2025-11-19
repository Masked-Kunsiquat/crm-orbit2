import { AppError } from '../base/AppError.js';
import { DB_ERROR_CODES } from '../base/ErrorCodes.js';

/**
 * Typed error for database operations.
 *
 * Provides a stable `code` and optional `originalError` and `context` fields
 * so callers can reliably handle DB failures across the app.
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} [code='DB_ERROR'] - Machine-readable error code
   * @param {any} [originalError=null] - Underlying error (from SQLite/WebSQL)
   * @param {object} [context=null] - Extra context (e.g., sql, params)
   */
  constructor(
    message,
    code = DB_ERROR_CODES.DB_ERROR,
    originalError = null,
    context = null
  ) {
    super(message, code, originalError, context);
    this.name = 'DatabaseError';
  }

  /**
   * Check if this is a specific type of database error
   */
  isConstraintError() {
    return (
      this.code === DB_ERROR_CODES.FOREIGN_KEY_VIOLATION ||
      this.code === DB_ERROR_CODES.UNIQUE_CONSTRAINT ||
      this.code === DB_ERROR_CODES.NOT_NULL_CONSTRAINT
    );
  }

  isNotFoundError() {
    return this.code === DB_ERROR_CODES.RECORD_NOT_FOUND;
  }

  isValidationError() {
    return (
      this.code === DB_ERROR_CODES.VALIDATION_ERROR ||
      this.code === DB_ERROR_CODES.INVALID_PARAM ||
      this.code === DB_ERROR_CODES.REQUIRED_FIELD
    );
  }
}

export default DatabaseError;
