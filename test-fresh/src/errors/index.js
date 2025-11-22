/**
 * Centralized Error Handling
 * Single import point for all error classes and utilities
 *
 * Usage:
 *   import { DatabaseError, logger, handleError } from '@/errors';
 */

// Base
export { AppError } from './base/AppError.js';
export {
  ERROR_CODES,
  DB_ERROR_CODES,
  SERVICE_ERROR_CODES,
  UI_ERROR_CODES,
  NETWORK_ERROR_CODES,
} from './base/ErrorCodes.js';

// Database
export { DatabaseError } from './database/DatabaseError.js';

// Services
export { ServiceError } from './services/ServiceError.js';

// UI
export { ValidationError } from './ui/ValidationError.js';
export { UIError } from './ui/UIError.js';

// Utilities
export { logger, withErrorHandling, logErrors } from './utils/errorLogger.js';

export {
  handleError,
  getUserFriendlyError,
  withUIErrorHandling,
  showAlert,
} from './utils/errorHandler.js';

// Re-export for backward compatibility
export { DatabaseError as default } from './database/DatabaseError.js';
