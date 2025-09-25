/**
 * Service layer error class for consistent error handling across services
 */
export class ServiceError extends Error {
  constructor(service, operation, originalError, options = {}) {
    super(
      `${service}.${operation} failed: ${originalError?.message || originalError}`
    );
    this.name = 'ServiceError';
    this.service = service;
    this.operation = operation;
    this.originalError = originalError;
    this.code = originalError?.code; // Set fallback code from originalError

    // Only overwrite code if options.errorCode is explicitly provided
    if (options && options.errorCode !== undefined) {
      this.code = options.errorCode;
    }

    // Additional context from options
    if (options && typeof options === 'object') {
      Object.keys(options).forEach(key => {
        if (key !== 'errorCode' && !this.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      });
    }
  }
}
