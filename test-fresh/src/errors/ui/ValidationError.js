import { AppError } from '../base/AppError.js';
import { UI_ERROR_CODES } from '../base/ErrorCodes.js';

/**
 * Validation Error for form and input validation
 */
export class ValidationError extends AppError {
  /**
   * @param {string} field - Field name that failed validation
   * @param {string} message - Human-readable validation error message
   * @param {string} [code] - Specific validation error code
   * @param {object} [context] - Additional context (value, rule, etc.)
   */
  constructor(
    field,
    message,
    code = UI_ERROR_CODES.VALIDATION_FAILED,
    context = {}
  ) {
    super(message, code, null, { field, ...context });
    this.name = 'ValidationError';
    this.field = field;
  }

  /**
   * Create a validation error for a required field
   */
  static required(field, label = null) {
    const fieldLabel = label || field;
    return new ValidationError(
      field,
      `${fieldLabel} is required`,
      UI_ERROR_CODES.FIELD_REQUIRED
    );
  }

  /**
   * Create a validation error for invalid email
   */
  static invalidEmail(field = 'email') {
    return new ValidationError(
      field,
      'Please enter a valid email address',
      UI_ERROR_CODES.INVALID_EMAIL
    );
  }

  /**
   * Create a validation error for invalid phone
   */
  static invalidPhone(field = 'phone') {
    return new ValidationError(
      field,
      'Please enter a valid phone number',
      UI_ERROR_CODES.INVALID_PHONE
    );
  }

  /**
   * Create a validation error for invalid date
   */
  static invalidDate(field = 'date') {
    return new ValidationError(
      field,
      'Please enter a valid date',
      UI_ERROR_CODES.INVALID_DATE
    );
  }
}

export default ValidationError;
