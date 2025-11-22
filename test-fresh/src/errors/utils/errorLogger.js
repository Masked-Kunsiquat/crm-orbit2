/**
 * Centralized Error Logging Utility
 *
 * Based on AUDIT-RESULTS.md Section 5: Error Handling & Console Logging
 * Addresses 50+ console.error patterns and 186+ try-catch blocks
 *
 * Usage:
 *   import { logger } from '@/errors/utils/errorLogger';
 *   logger.error('ContactService', 'createContact', error, { contactId: 123 });
 */

/**
 * Determine if we're in development mode
 * Safely checks for development environment across different runtimes
 */
const isDevelopment = () => {
  // Check React Native __DEV__ global
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return true;
  }

  // Fall back to Node.js process.env check
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development'
  ) {
    return true;
  }

  return false;
};

/**
 * Format timestamp for logs
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Format error for logging
 */
const formatError = error => {
  if (!error) return 'Unknown error';

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    };
  }

  return String(error);
};

/**
 * Centralized logger with component/operation context
 */
export const logger = {
  /**
   * Log an error with context
   * @param {string} component - Component/service/module name
   * @param {string} operation - Operation that failed
   * @param {Error|string} error - The error object or message
   * @param {object} context - Additional context for debugging
   */
  error(component, operation, error, context = {}) {
    const timestamp = getTimestamp();
    const formattedError = formatError(error);

    console.error(
      `[${timestamp}] [${component}] ${operation} failed:`,
      formattedError,
      context
    );

    // In development, also log the full error object for debugging
    if (isDevelopment() && error instanceof Error) {
      console.error('Full error:', error);
    }
  },

  /**
   * Log a warning
   * @param {string} component - Component/service/module name
   * @param {string} message - Warning message
   * @param {object} context - Additional context
   */
  warn(component, message, context = {}) {
    const timestamp = getTimestamp();
    console.warn(`[${timestamp}] [${component}] ${message}`, context);
  },

  /**
   * Log info message (development only)
   * @param {string} component - Component/service/module name
   * @param {string} message - Info message
   * @param {object} context - Additional context
   */
  info(component, message, context = {}) {
    if (isDevelopment()) {
      const timestamp = getTimestamp();
      console.log(`[${timestamp}] [${component}] ${message}`, context);
    }
  },

  /**
   * Log debug message (development only)
   * @param {string} component - Component/service/module name
   * @param {string} message - Debug message
   * @param {*} data - Data to log
   */
  debug(component, message, data = {}) {
    if (isDevelopment()) {
      const timestamp = getTimestamp();
      console.debug(`[${timestamp}] [${component}] ${message}`, data);
    }
  },

  /**
   * Log success message
   * @param {string} component - Component/service/module name
   * @param {string} operation - Operation that succeeded
   * @param {object} context - Additional context
   */
  success(component, operation, context = {}) {
    if (isDevelopment()) {
      const timestamp = getTimestamp();
      console.log(
        `[${timestamp}] [${component}] ${operation} succeeded`,
        context
      );
    }
  },
};

/**
 * Higher-order function to wrap async operations with error handling
 *
 * Based on AUDIT-RESULTS.md Section 5: Try-Catch Wrapper Pattern (186+ instances)
 *
 * Usage:
 *   const safeOperation = withErrorHandling(
 *     async (id) => { ... },
 *     'ContactService',
 *     'getContact'
 *   );
 *
 * @param {Function} fn - Async function to wrap
 * @param {string} component - Component/service/module name
 * @param {string} operation - Operation name
 * @param {object} options - Options (rethrow, fallback, etc.)
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, component, operation, options = {}) {
  const { rethrow = true, fallback = null, onError = null } = options;

  return async (...args) => {
    try {
      const result = await fn(...args);
      logger.success(component, operation);
      return result;
    } catch (error) {
      logger.error(component, operation, error, {
        args: isDevelopment() ? args : undefined,
      });

      // Custom error handler
      if (onError) {
        onError(error);
      }

      // Rethrow or return fallback
      if (rethrow) {
        throw error;
      }

      return fallback;
    }
  };
}

/**
 * Decorator for class methods to add error logging
 *
 * Usage (with decorators proposal):
 *   class ContactService {
 *     @logErrors('ContactService', 'createContact')
 *     async createContact(data) { ... }
 *   }
 *
 * Or manually:
 *   createContact = logErrors('ContactService', 'createContact')(
 *     async (data) => { ... }
 *   );
 */
export function logErrors(component, operation) {
  return function decorator(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = withErrorHandling(originalMethod, component, operation);

    return descriptor;
  };
}

export default logger;
