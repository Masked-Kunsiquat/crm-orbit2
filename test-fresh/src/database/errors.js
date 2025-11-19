/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please import from 'errors' instead:
 *   import { DatabaseError } from '../errors';
 *
 * This will be removed in a future version.
 */

// Re-export from centralized errors module
export { DatabaseError } from '../errors/database/DatabaseError.js';
export { DatabaseError as default } from '../errors/database/DatabaseError.js';
