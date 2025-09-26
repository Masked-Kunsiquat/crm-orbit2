import { documentDirectory } from 'expo-file-system';
import { ServiceError } from '../errors';

/**
 * Configuration for backup operations
 */
export const BACKUP_CONFIG = {
  BACKUP_DIR: `${documentDirectory}backups/`,
  MAX_BACKUP_AGE_DAYS: 30,
  MAX_BACKUP_COUNT: 10,
  AUTO_BACKUP_INTERVAL_HOURS: 24,
  BACKUP_VERSION: '1.0.0',
};

/**
 * Database tables to include in backups (in dependency order)
 */
export const BACKUP_TABLES = [
  'categories',
  'companies',
  'contacts',
  'contact_info',
  'attachments',
  'events',
  'events_recurring',
  'events_reminders',
  'interactions',
  'notes',
  'category_relations',
  'settings'
];

/**
 * Tables that support full import functionality
 * Complex relational tables may be export-only for now
 */
export const IMPORTABLE_TABLES = [
  'categories',
  'companies',
  'contacts',
  'contact_info',
  'attachments',
  'events',
  'interactions',
  'notes',
  'settings'
];

/**
 * Feature flags for backup/import functionality
 */
export const BACKUP_FEATURES = {
  IMPORT_COMPLEX_RELATIONS: true, // events_recurring, events_reminders, category_relations
  SKIP_IMPORT_WARNINGS: false, // Show warnings for skipped tables during import
  IMPORT_RECURRING_EVENTS: true, // Individual flag for events_recurring
  IMPORT_EVENT_REMINDERS: true, // Individual flag for events_reminders
  IMPORT_CATEGORY_RELATIONS: true, // Individual flag for category_relations
};

/**
 * Backup structure metadata for validation and external use
 */
export const BACKUP_STRUCTURE = Object.freeze({
  version: BACKUP_CONFIG.BACKUP_VERSION,
  tables: BACKUP_TABLES.slice()
});

/**
 * Backup service error codes
 */
export const BACKUP_ERROR_CODES = {
  INIT_ERROR: 'BACKUP_INIT_ERROR',
  IN_PROGRESS: 'BACKUP_IN_PROGRESS',
  CREATE_ERROR: 'BACKUP_CREATE_ERROR',
  CSV_EXPORT_ERROR: 'CSV_EXPORT_ERROR',
  IMPORT_ERROR: 'BACKUP_IMPORT_ERROR',
  LIST_ERROR: 'BACKUP_LIST_ERROR',
  DELETE_ERROR: 'BACKUP_DELETE_ERROR',
  SHARE_ERROR: 'BACKUP_SHARE_ERROR',
  CONFIG_ERROR: 'AUTO_BACKUP_CONFIG_ERROR',
  VALIDATION_ERROR: 'BACKUP_VALIDATION_ERROR',
  TABLE_EXPORT_ERROR: 'TABLE_EXPORT_ERROR',
  TABLE_IMPORT_ERROR: 'TABLE_IMPORT_ERROR',
  AUTH_REQUIRED: 'BACKUP_AUTH_REQUIRED',
  SHARING_NOT_AVAILABLE: 'SHARING_NOT_AVAILABLE',
  FILE_TOO_LARGE: 'BACKUP_FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_BACKUP_FORMAT',
  UNKNOWN_TABLE: 'UNKNOWN_TABLE'
};

/**
 * Helper function to build ServiceError with proper code and metadata assignment
 * @param {string} service - Service name
 * @param {string} operation - Operation name
 * @param {Error} originalError - Original error
 * @param {string} errorCode - Error code from BACKUP_ERROR_CODES
 * @param {Object} [metadata] - Additional error metadata
 * @returns {ServiceError} Properly configured ServiceError
 */
export function buildServiceError(service, operation, originalError, errorCode, metadata = {}) {
  return new ServiceError(service, operation, originalError, {
    errorCode,
    ...metadata,
  });
}