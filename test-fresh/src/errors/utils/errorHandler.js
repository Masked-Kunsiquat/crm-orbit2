/**
 * Global Error Handler
 * Integrates with Alert for user-friendly error messages
 */

import { Alert } from 'react-native';
import { logger } from './errorLogger.js';
import { DatabaseError } from '../database/DatabaseError.js';
import { ServiceError } from '../services/ServiceError.js';
import { ValidationError } from '../ui/ValidationError.js';
import { UIError } from '../ui/UIError.js';

/**
 * Show an error alert to the user
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Array} buttons - Alert buttons
 */
function showErrorAlert(title, message, buttons = [{ text: 'OK' }]) {
  Alert.alert(title, message, buttons);
}

/**
 * Get user-friendly error message based on error type
 * @param {Error} error - The error object
 * @returns {object} { title, message } for user display
 */
export function getUserFriendlyError(error) {
  // ValidationError - show specific field errors
  if (error instanceof ValidationError) {
    return {
      title: 'Validation Error',
      message: error.message,
    };
  }

  // DatabaseError - generic database error message
  if (error instanceof DatabaseError) {
    if (error.isNotFoundError()) {
      return {
        title: 'Not Found',
        message: 'The requested item could not be found.',
      };
    }

    if (error.isConstraintError()) {
      return {
        title: 'Invalid Operation',
        message: 'This operation violates data constraints. Please check your input.',
      };
    }

    return {
      title: 'Database Error',
      message: 'A database error occurred. Please try again.',
    };
  }

  // ServiceError - use getUserMessage if available
  if (error instanceof ServiceError) {
    return {
      title: 'Operation Failed',
      message: error.getUserMessage(),
    };
  }

  // UIError
  if (error instanceof UIError) {
    return {
      title: 'Error',
      message: error.message,
    };
  }

  // Generic error
  return {
    title: 'Error',
    message: error?.message || 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Handle an error globally
 * Logs the error and optionally shows an alert to the user
 *
 * @param {Error} error - The error to handle
 * @param {object} options - Options for error handling
 * @param {string} options.component - Component where error occurred
 * @param {string} options.operation - Operation that failed
 * @param {boolean} options.showAlert - Whether to show alert to user (default: true)
 * @param {object} options.context - Additional context for logging
 * @param {string} options.context.customMessage - Custom message to use in alert (overrides getUserFriendlyError)
 * @param {string} options.context.customTitle - Custom title to use in alert (overrides getUserFriendlyError)
 * @param {Function} options.onError - Custom error handler callback
 */
export function handleError(error, options = {}) {
  const {
    component = 'Unknown',
    operation = 'operation',
    showAlert = true,
    context = {},
    onError = null,
  } = options;

  // Log the error
  logger.error(component, operation, error, context);

  // Custom error handler
  if (onError) {
    onError(error);
  }

  // Show alert to user
  if (showAlert) {
    // Check for custom message in context first
    let title, message;

    if (context.customMessage || context.customTitle) {
      // Use custom message/title if provided
      const defaultError = getUserFriendlyError(error);
      title = context.customTitle || defaultError.title;
      message = context.customMessage || defaultError.message;
    } else {
      // Fall back to getUserFriendlyError
      const errorInfo = getUserFriendlyError(error);
      title = errorInfo.title;
      message = errorInfo.message;
    }

    showErrorAlert(title, message);
  }
}

/**
 * Higher-order function to wrap UI handlers with error handling
 *
 * Usage in React components:
 *   const handleSubmit = withUIErrorHandling(
 *     async (data) => { ... },
 *     'AddContactModal',
 *     'createContact'
 *   );
 *
 * @param {Function} fn - Function to wrap
 * @param {string} component - Component name
 * @param {string} operation - Operation name
 * @param {object} options - Additional options
 * @returns {Function} Wrapped function
 */
export function withUIErrorHandling(fn, component, operation, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, {
        component,
        operation,
        ...options,
      });

      // Rethrow if needed (e.g., for form validation to stop submission)
      if (error instanceof ValidationError) {
        throw error;
      }
    }
  };
}

/**
 * Alert helpers based on AUDIT-RESULTS.md Section 6 (55 instances)
 */
export const showAlert = {
  error(message, title = 'Error') {
    Alert.alert(title, message);
  },

  success(message, title = 'Success') {
    Alert.alert(title, message);
  },

  info(message, title = 'Info') {
    Alert.alert(title, message);
  },

  confirm(title, message, onConfirm, onCancel = null) {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'OK', onPress: onConfirm },
    ]);
  },

  confirmDelete(title, message, onConfirm) {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  },
};

export default handleError;
