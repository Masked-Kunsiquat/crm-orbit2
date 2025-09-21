/**
 * Service layer error class for consistent error handling across services
 */
export class ServiceError extends Error {
  constructor(service, operation, originalError) {
    super(
      `${service}.${operation} failed: ${originalError?.message || originalError}`
    );
    this.name = 'ServiceError';
    this.service = service;
    this.operation = operation;
    this.originalError = originalError;
  }
}
