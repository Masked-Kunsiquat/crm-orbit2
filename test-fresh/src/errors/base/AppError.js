/**
 * Base Application Error
 * All custom errors extend from this class for consistent error handling
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} code - Machine-readable error code
   * @param {Error} [originalError=null] - Underlying error that caused this error
   * @param {object} [context=null] - Additional context for debugging
   */
  constructor(message, code = 'APP_ERROR', originalError = null, context = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;
    this.context = context || undefined;
    this.timestamp = new Date().toISOString();

    // Preserve causal chain where supported (Node 16+/modern runtimes)
    try {
      this.cause = originalError ?? undefined;
    } catch (_) {
      // Ignore if cause is not supported
    }

    // Maintain proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a plain object for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage() {
    return this.message;
  }
}

export default AppError;
