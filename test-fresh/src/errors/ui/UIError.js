import { AppError } from '../base/AppError.js';
import { UI_ERROR_CODES } from '../base/ErrorCodes.js';

/**
 * UI Error for component and user interaction errors
 */
export class UIError extends AppError {
  /**
   * @param {string} component - Component name where error occurred
   * @param {string} message - Human-readable error message
   * @param {string} [code] - Specific UI error code
   * @param {Error} [originalError] - Original error if any
   * @param {object} [context] - Additional context
   */
  constructor(
    component,
    message,
    code = UI_ERROR_CODES.RENDER_ERROR,
    originalError = null,
    context = {}
  ) {
    super(message, code, originalError, { component, ...context });
    this.name = 'UIError';
    this.component = component;
  }

  /**
   * Create a UIError for operation cancellation
   */
  static cancelled(component, operation) {
    return new UIError(
      component,
      `${operation} was cancelled by user`,
      UI_ERROR_CODES.OPERATION_CANCELLED,
      null,
      { operation }
    );
  }

  /**
   * Create a UIError for timeout
   */
  static timeout(component, operation, timeoutMs) {
    return new UIError(
      component,
      `${operation} timed out after ${timeoutMs}ms`,
      UI_ERROR_CODES.TIMEOUT,
      null,
      { operation, timeoutMs }
    );
  }
}

export default UIError;
