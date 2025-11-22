import { AppError } from '../base/AppError.js';
import { SERVICE_ERROR_CODES } from '../base/ErrorCodes.js';

/**
 * Service layer error class for consistent error handling across services
 */
export class ServiceError extends AppError {
  /**
   * @param {string} service - Service name (e.g., 'authService', 'fileService')
   * @param {string} operation - Operation that failed (e.g., 'login', 'uploadFile')
   * @param {Error} originalError - The underlying error
   * @param {object} [options={}] - Additional options (errorCode, context, etc.)
   */
  constructor(service, operation, originalError, options = {}) {
    const message = `${service}.${operation} failed: ${
      originalError?.message || originalError
    }`;

    // Determine error code (prioritize explicit errorCode, fallback to originalError.code)
    const code =
      options.errorCode ||
      originalError?.code ||
      SERVICE_ERROR_CODES.OPERATION_FAILED;

    // Build context from options
    const context = {
      service,
      operation,
      ...options,
    };
    delete context.errorCode; // Remove errorCode from context since it's already in code field

    super(message, code, originalError, context);
    this.name = 'ServiceError';
    this.service = service;
    this.operation = operation;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage() {
    // Provide user-friendly messages for common error codes
    const friendlyMessages = {
      [SERVICE_ERROR_CODES.PERMISSION_DENIED]:
        'Permission denied. Please check your device settings.',
      [SERVICE_ERROR_CODES.FILE_NOT_FOUND]:
        'The requested file could not be found.',
      [SERVICE_ERROR_CODES.AUTH_FAILED]:
        'Authentication failed. Please try again.',
      [SERVICE_ERROR_CODES.SYNC_FAILED]:
        'Failed to sync data. Please try again later.',
    };

    return friendlyMessages[this.code] || this.message;
  }
}

export default ServiceError;
