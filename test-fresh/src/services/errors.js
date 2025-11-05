/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please import from 'errors' instead:
 *   import { ServiceError } from '../errors';
 *
 * This will be removed in a future version.
 */

// Re-export from centralized errors module
export { ServiceError } from '../errors/services/ServiceError.js';
export { ServiceError as default } from '../errors/services/ServiceError.js';
