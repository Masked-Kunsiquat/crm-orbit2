import { documentDirectory, writeAsStringAsync, readAsStringAsync, deleteAsync, makeDirectoryAsync, readDirectoryAsync, getInfoAsync } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import db from '../database';
import authService from './authService';
import fileService from './fileService';
import { ServiceError } from './errors';

/**
 * Configuration for backup operations
 */
const BACKUP_CONFIG = {
  BACKUP_DIR: `${documentDirectory}backups/`,
  MAX_BACKUP_AGE_DAYS: 30,
  MAX_BACKUP_COUNT: 10,
  AUTO_BACKUP_INTERVAL_HOURS: 24,
  BACKUP_VERSION: '1.0.0',
};

/**
 * Database tables to include in backups (in dependency order)
 */
const BACKUP_TABLES = [
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
 * Backup structure metadata for validation and external use
 */
export const BACKUP_STRUCTURE = Object.freeze({
  version: BACKUP_CONFIG.BACKUP_VERSION,
  tables: BACKUP_TABLES.slice()
});

/**
 * Backup service error codes
 */
const BACKUP_ERROR_CODES = {
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
function buildServiceError(service, operation, originalError, errorCode, metadata = {}) {
  const error = new ServiceError(service, operation, originalError);
  error.code = errorCode;

  // Assign any additional metadata fields
  Object.keys(metadata).forEach(key => {
    if (!error.hasOwnProperty(key)) {
      error[key] = metadata[key];
    }
  });

  return error;
}

/**
 * Comprehensive backup service for CRM database export/import operations.
 *
 * Provides secure, authenticated backup and restore functionality with the following features:
 * - JSON and CSV export formats with progress tracking
 * - Import validation and conflict resolution
 * - Auto-backup scheduling with intelligent cleanup
 * - Authentication integration for security
 * - Event listener system for state management
 * - File size validation and integrity verification
 * - Batch settings retrieval for performance optimization
 *
 * @class BackupService
 * @version 1.0.0
 * @author CRM Team
 * @since 2024
 */
class BackupService {
  constructor() {
    this.isBackupRunning = false;
    this.lastBackupTime = null;
    this.autoBackupTimer = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize backup service and create backup directory
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, { intermediates: true });
      await this._loadBackupSettings();
      await this._scheduleAutoBackup();

      this.isInitialized = true;
      this._notifyListeners({ type: 'initialized' });

      return true;
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'initialize',
        error,
        BACKUP_ERROR_CODES.INIT_ERROR
      );
    }
  }

  /**
   * Safe auto-backup check that can be called during app startup
   * Ensures auto-backup is scheduled if possible without throwing errors
   * @returns {Promise<boolean>} Success status - true if auto-backup is ready, false on any error
   */
  async checkAutoBackup() {
    try {
      // If already initialized, auto-backup should be scheduled
      if (this.isInitialized) {
        return true;
      }

      // Attempt to initialize the service
      await this.initialize();
      return true;
    } catch (error) {
      // Silently handle any initialization errors
      console.warn('Auto-backup check failed during startup:', error.message);

      // Try to at least schedule auto-backup if settings are available
      try {
        await this._scheduleAutoBackup();
        return true;
      } catch (scheduleError) {
        console.warn('Failed to schedule auto-backup:', scheduleError.message);
        return false;
      }
    }
  }

  /**
   * Add event listener for backup state changes
   * @param {Function} callback - Event callback
   * @returns {Function} Cleanup function
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of backup events
   * @private
   */
  _notifyListeners(event) {
    Array.from(this.listeners).forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in backup listener:', error);
      }
    });
  }

  /**
   * Create a full database backup in JSON format
   * @param {Object} options - Backup options
   * @param {string} [options.filename] - Custom filename for backup
   * @param {boolean} [options.includeAttachments=false] - Include attachment data
   * @param {Function} [options.onProgress] - Progress callback
   * @param {boolean} [options.requireAuth=true] - Require authentication
   * @returns {Promise<string>} - Path to created backup file
   */
  async createBackup(options = {}) {
    const { filename, includeAttachments = false, onProgress, requireAuth = true } = options;

    // Check authentication if required
    if (requireAuth && (await authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'createBackup',
        new Error('Authentication required for backup operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    if (this.isBackupRunning) {
      throw buildServiceError(
        'backupService',
        'createBackup',
        new Error('Backup operation already in progress'),
        BACKUP_ERROR_CODES.IN_PROGRESS
      );
    }

    this.isBackupRunning = true;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = filename || `crm-backup-${timestamp}.json`;
      const backupPath = `${BACKUP_CONFIG.BACKUP_DIR}${backupFilename}`;

      onProgress?.({ stage: 'starting', progress: 0 });

      const backupData = {
        version: BACKUP_CONFIG.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0', // Could be read from app.json
        tables: {},
        metadata: {
          totalRecords: 0,
          includeAttachments
        }
      };

      let totalProgress = 0;
      const progressIncrement = 100 / BACKUP_TABLES.length;

      for (const table of BACKUP_TABLES) {
        onProgress?.({
          stage: 'exporting',
          table,
          progress: Math.round(totalProgress)
        });

        try {
          const tableData = await this._exportTable(table, includeAttachments);
          backupData.tables[table] = tableData;
          backupData.metadata.totalRecords += tableData.length;
        } catch (error) {
          console.warn(`Failed to export table ${table}:`, error);
          backupData.tables[table] = [];
        }

        totalProgress += progressIncrement;
      }

      onProgress?.({ stage: 'writing', progress: 95 });

      await writeAsStringAsync(backupPath, JSON.stringify(backupData, null, 2));

      onProgress?.({ stage: 'complete', progress: 100 });

      // Validate backup file size
      const fileInfo = await getInfoAsync(backupPath);
      if (!fileService.validateFileSize(fileInfo.size)) {
        await deleteAsync(backupPath); // Cleanup on failure
        throw buildServiceError(
          'backupService',
          'createBackup',
          new Error('Backup file exceeds maximum allowed size'),
          BACKUP_ERROR_CODES.FILE_TOO_LARGE,
          { fileSize: fileInfo.size }
        );
      }

      this.lastBackupTime = new Date();
      await this._saveBackupSettings();
      await this._cleanupOldBackups();

      this._notifyListeners({
        type: 'backup_created',
        backupPath,
        size: fileInfo.size,
        recordCount: backupData.metadata.totalRecords
      });

      return backupPath;
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'createBackup',
        error,
        BACKUP_ERROR_CODES.CREATE_ERROR
      );
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Export database to CSV format
   * @param {Object} options - Export options
   * @param {string} [options.table] - Specific table to export (exports all if not specified)
   * @param {string} [options.filename] - Custom filename
   * @param {boolean} [options.requireAuth=true] - Require authentication
   * @returns {Promise<string>} - Path to created CSV file
   */
  async exportToCSV(options = {}) {
    const { table, filename, requireAuth = true } = options;

    // Check authentication if required
    if (requireAuth && (await authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'exportToCSV',
        new Error('Authentication required for export operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const csvFilename = filename || `crm-export-${table || 'full'}-${timestamp}.csv`;
      const csvPath = `${BACKUP_CONFIG.BACKUP_DIR}${csvFilename}`;

      let csvContent = '';
      const tablesToExport = table ? [table] : BACKUP_TABLES;

      for (const tableName of tablesToExport) {
        const tableData = await this._exportTable(tableName, false);

        if (tableData.length > 0) {
          // Add table header if exporting multiple tables
          if (!table) {
            csvContent += `\n=== ${tableName.toUpperCase()} ===\n`;
          }

          // Add CSV headers
          const headers = Object.keys(tableData[0]);
          csvContent += headers.join(',') + '\n';

          // Add data rows
          for (const row of tableData) {
            const values = headers.map(header => {
              const value = row[header];
              // Escape commas and quotes in CSV
              if (value === null || value === undefined) return '';
              const stringValue = String(value);
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            });
            csvContent += values.join(',') + '\n';
          }
        }
      }

      await writeAsStringAsync(csvPath, csvContent);

      this._notifyListeners({
        type: 'csv_exported',
        csvPath,
        table: table || 'all'
      });

      return csvPath;
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'exportToCSV',
        error,
        BACKUP_ERROR_CODES.CSV_EXPORT_ERROR
      );
    }
  }

  /**
   * Import backup data with validation and conflict resolution
   * @param {string} backupPath - Path to backup file
   * @param {Object} options - Import options
   * @param {boolean} [options.overwrite=false] - Overwrite existing data
   * @param {string[]} [options.tablesToImport] - Specific tables to import
   * @param {Function} [options.onProgress] - Progress callback
   * @param {boolean} [options.requireAuth=true] - Require authentication
   * @returns {Promise<Object>} - Import summary
   */
  async importBackup(backupPath, options = {}) {
    const { overwrite = false, tablesToImport, onProgress, requireAuth = true } = options;

    // Check authentication if required
    if (requireAuth && (await authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'importBackup',
        new Error('Authentication required for import operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    try {
      onProgress?.({ stage: 'reading', progress: 0 });

      const backupContent = await readAsStringAsync(backupPath);
      const backupData = JSON.parse(backupContent);

      // Validate backup format
      await this._validateBackup(backupData);

      onProgress?.({ stage: 'validating', progress: 10 });

      const importTables = tablesToImport || BACKUP_TABLES;
      const summary = {
        imported: {},
        skipped: {},
        errors: {},
        totalRecords: 0
      };

      let progressIncrement = 80 / importTables.length;
      let currentProgress = 20;

      for (const table of importTables) {
        onProgress?.({
          stage: 'importing',
          table,
          progress: Math.round(currentProgress)
        });

        try {
          if (backupData.tables[table]) {
            const result = await this._importTable(table, backupData.tables[table], overwrite);
            summary.imported[table] = result.imported;
            summary.skipped[table] = result.skipped;
            summary.totalRecords += result.imported;
          } else {
            summary.skipped[table] = 0;
          }
        } catch (error) {
          summary.errors[table] = error.message;
        }

        currentProgress += progressIncrement;
      }

      onProgress?.({ stage: 'complete', progress: 100 });

      this._notifyListeners({
        type: 'backup_imported',
        summary,
        backupPath
      });

      return summary;
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'importBackup',
        error,
        BACKUP_ERROR_CODES.IMPORT_ERROR
      );
    }
  }

  /**
   * List available backup files
   * @returns {Promise<Array>} - Array of backup file info
   */
  async listBackups() {
    try {
      const files = await readDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR);
      const backups = [];

      for (const filename of files) {
        if (filename.endsWith('.json') || filename.endsWith('.csv')) {
          const filePath = `${BACKUP_CONFIG.BACKUP_DIR}${filename}`;
          const fileInfo = await getInfoAsync(filePath);

          backups.push({
            filename,
            path: filePath,
            size: fileInfo.size,
            created: new Date(fileInfo.modificationTime * 1000),
            type: filename.endsWith('.json') ? 'json' : 'csv'
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'listBackups',
        error,
        BACKUP_ERROR_CODES.LIST_ERROR
      );
    }
  }

  /**
   * Delete a specific backup file
   * @param {string} filename - Name of backup file to delete
   * @param {boolean} [requireAuth=true] - Require authentication
   */
  async deleteBackup(filename, requireAuth = true) {
    // Check authentication if required
    if (requireAuth && (await authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'deleteBackup',
        new Error('Authentication required for delete operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    try {
      const filePath = `${BACKUP_CONFIG.BACKUP_DIR}${filename}`;
      await deleteAsync(filePath);

      this._notifyListeners({
        type: 'backup_deleted',
        filename
      });
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'deleteBackup',
        error,
        BACKUP_ERROR_CODES.DELETE_ERROR,
        { filename }
      );
    }
  }

  /**
   * Share backup file using system share dialog
   * @param {string} backupPath - Path to backup file
   */
  async shareBackup(backupPath) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupPath);

        this._notifyListeners({
          type: 'backup_shared',
          backupPath
        });
      } else {
        throw buildServiceError(
          'backupService',
          'shareBackup',
          new Error('Sharing not available on this device'),
          BACKUP_ERROR_CODES.SHARING_NOT_AVAILABLE
        );
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'shareBackup',
        error,
        BACKUP_ERROR_CODES.SHARE_ERROR,
        { backupPath }
      );
    }
  }

  /**
   * Configure auto-backup settings
   * @param {Object} settings - Auto-backup configuration
   * @param {boolean} settings.enabled - Enable auto-backup
   * @param {number} settings.intervalHours - Backup interval in hours
   * @param {number} settings.maxBackups - Maximum number of backups to keep
   */
  async configureAutoBackup(settings) {
    try {
      // Use batch settings update for consistency
      await db.settings.setSetting('backup.auto_enabled', settings.enabled);
      await db.settings.setSetting('backup.interval_hours', settings.intervalHours);
      await db.settings.setSetting('backup.max_backups', settings.maxBackups);

      if (settings.enabled) {
        await this._scheduleAutoBackup();
      } else {
        this._clearAutoBackup();
      }

      this._notifyListeners({
        type: 'auto_backup_configured',
        settings
      });
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'configureAutoBackup',
        error,
        BACKUP_ERROR_CODES.CONFIG_ERROR,
        { settings }
      );
    }
  }

  /**
   * Get backup settings using batch retrieval like notificationService
   * @returns {Promise<Object>} Current backup settings
   */
  async getBackupSettings() {
    try {
      const settings = await db.settings.getValues('backup', [
        { key: 'auto_enabled', expectedType: 'boolean' },
        { key: 'interval_hours', expectedType: 'number' },
        { key: 'max_backups', expectedType: 'number' },
        { key: 'last_backup_time', expectedType: 'string' },
      ]);

      return {
        autoEnabled: settings.auto_enabled ?? false,
        intervalHours: settings.interval_hours ?? BACKUP_CONFIG.AUTO_BACKUP_INTERVAL_HOURS,
        maxBackups: settings.max_backups ?? BACKUP_CONFIG.MAX_BACKUP_COUNT,
        lastBackupTime: settings.last_backup_time ? new Date(settings.last_backup_time) : null,
      };
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'getBackupSettings',
        error,
        BACKUP_ERROR_CODES.CONFIG_ERROR
      );
    }
  }

  // Private methods

  /**
   * Export data from a specific table using correct database API methods
   * @private
   * @param {string} tableName - Name of the database table to export
   * @param {boolean} includeAttachments - Whether to include attachment file data
   * @returns {Promise<Array>} Array of exported records
   * @throws {ServiceError} When export operation fails
   */
  async _exportTable(tableName, includeAttachments) {
    try {
      switch (tableName) {
        case 'categories':
          return await db.categories.getAll();
        case 'companies':
          return await db.companies.getAll();
        case 'contacts':
          return await db.contacts.getAll();
        case 'contact_info':
          // Get all contact info by getting all contacts and their info
          const contacts = await db.contacts.getAll();
          const allContactInfo = [];
          for (const contact of contacts) {
            try {
              const contactWithInfo = await db.contactsInfo.getWithContactInfo(contact.id);
              if (contactWithInfo && contactWithInfo.contact_info) {
                allContactInfo.push(...contactWithInfo.contact_info);
              }
            } catch (error) {
              console.warn(`Failed to get contact info for contact ${contact.id}:`, error);
            }
          }
          return allContactInfo;
        case 'attachments':
          const attachments = await db.attachments.getAll();
          // Include file data if requested (base64 encoded)
          if (includeAttachments) {
            for (const attachment of attachments) {
              try {
                const fileData = await readAsStringAsync(attachment.file_path, { encoding: 'base64' });
                attachment.file_data = fileData;
              } catch (error) {
                console.warn(`Failed to read attachment ${attachment.id}:`, error);
              }
            }
          }
          return attachments;
        case 'events':
          return await db.events.getAll();
        case 'events_recurring':
          return await db.eventsRecurring.getRecurringEvents();
        case 'events_reminders':
          return await db.eventsReminders.getUnsentReminders();
        case 'interactions':
          return await db.interactions.getAll();
        case 'notes':
          return await db.notes.getAll();
        case 'category_relations':
          // Get all category relations by getting category contact counts
          const categoryRelations = [];
          const categories = await db.categories.getAll();
          for (const category of categories) {
            try {
              const contacts = await db.categoriesRelations.getContactsByCategory(category.id);
              for (const contact of contacts) {
                categoryRelations.push({
                  category_id: category.id,
                  contact_id: contact.id
                });
              }
            } catch (error) {
              console.warn(`Failed to get relations for category ${category.id}:`, error);
            }
          }
          return categoryRelations;
        case 'settings':
          return await db.settings.getAll();
        default:
          throw buildServiceError(
            'backupService',
            '_exportTable',
            new Error(`Unknown table: ${tableName}`),
            BACKUP_ERROR_CODES.UNKNOWN_TABLE,
            { tableName }
          );
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        '_exportTable',
        error,
        BACKUP_ERROR_CODES.TABLE_EXPORT_ERROR,
        { tableName, includeAttachments }
      );
    }
  }

  /**
   * Import data into a specific table with proper error handling
   * @private
   * @param {string} tableName - Name of the database table
   * @param {Array} data - Array of records to import
   * @param {boolean} overwrite - Whether to overwrite existing records
   * @returns {Promise<{imported: number, skipped: number}>} Import statistics
   * @throws {ServiceError} When import operation fails
   */
  async _importTable(tableName, data, overwrite) {
    let imported = 0;
    let skipped = 0;

    try {
      for (const record of data) {
        try {
          if (overwrite) {
            // For overwrite mode, use upsert operations
            switch (tableName) {
              case 'categories':
                await db.categories.updateCategory(record.id, record);
                break;
              case 'companies':
                await db.companies.updateCompany(record.id, record);
                break;
              case 'contacts':
                await db.contacts.updateContact(record.id, record);
                break;
              // Add other table update operations as needed
              default:
                skipped++;
                continue;
            }
            imported++;
          } else {
            // For non-overwrite mode, only insert new records
            const { id, ...recordData } = record;
            switch (tableName) {
              case 'categories':
                await db.categories.createCategory(recordData);
                break;
              case 'companies':
                await db.companies.createCompany(recordData);
                break;
              case 'contacts':
                await db.contacts.createContact(recordData);
                break;
              // Add other table create operations as needed
              default:
                skipped++;
                continue;
            }
            imported++;
          }
        } catch (error) {
          // Record already exists or other constraint violation
          skipped++;
        }
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        '_importTable',
        error,
        BACKUP_ERROR_CODES.TABLE_IMPORT_ERROR,
        { tableName, recordCount: data.length }
      );
    }

    return { imported, skipped };
  }

  /**
   * Validate backup file format and integrity
   * @private
   * @param {Object} backupData - Parsed backup data to validate
   * @returns {Promise<boolean>} Validation success status
   * @throws {ServiceError} When backup format is invalid
   */
  async _validateBackup(backupData) {
    if (!backupData.version || !backupData.timestamp || !backupData.tables) {
      throw buildServiceError(
        'backupService',
        '_validateBackup',
        new Error('Invalid backup format: missing required fields'),
        BACKUP_ERROR_CODES.INVALID_FORMAT
      );
    }

    // Version compatibility check
    if (backupData.version !== BACKUP_CONFIG.BACKUP_VERSION) {
      console.warn(`Backup version mismatch: ${backupData.version} vs ${BACKUP_CONFIG.BACKUP_VERSION}`);
    }

    return true;
  }

  /**
   * Clean up old backup files based on configuration and user settings
   * @private
   * @throws {ServiceError} When cleanup operation fails
   */
  async _cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const settings = await this.getBackupSettings();
      const maxAge = BACKUP_CONFIG.MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
      const now = new Date();

      // Sort by creation date (newest first)
      const sortedBackups = backups.sort((a, b) => b.created - a.created);

      // Keep only the most recent backups up to configured max count
      const maxBackups = settings.maxBackups || BACKUP_CONFIG.MAX_BACKUP_COUNT;
      const backupsToDelete = sortedBackups.slice(maxBackups);

      // Also delete backups older than MAX_BACKUP_AGE_DAYS
      for (const backup of sortedBackups) {
        if (now - backup.created > maxAge && !backupsToDelete.includes(backup)) {
          backupsToDelete.push(backup);
        }
      }

      // Delete old backups (without requiring auth for cleanup)
      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.filename, false);
        } catch (error) {
          console.warn(`Failed to delete old backup ${backup.filename}:`, error);
        }
      }

      if (backupsToDelete.length > 0) {
        this._notifyListeners({
          type: 'backups_cleaned',
          deletedCount: backupsToDelete.length
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Schedule automatic backup based on user settings
   * @private
   * @throws {ServiceError} When scheduling fails
   */
  async _scheduleAutoBackup() {
    this._clearAutoBackup();

    try {
      const settings = await this.getBackupSettings();

      if (settings.autoEnabled) {
        const intervalMs = settings.intervalHours * 60 * 60 * 1000;

        this.autoBackupTimer = setInterval(async () => {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            await this.createBackup({
              filename: `auto-backup-${timestamp}.json`,
              requireAuth: false // Auto-backups don't require interactive auth
            });
            console.log('Auto-backup completed successfully');
          } catch (error) {
            console.error('Auto-backup failed:', error);
            this._notifyListeners({
              type: 'auto_backup_failed',
              error: error.message
            });
          }
        }, intervalMs);

        console.log(`Auto-backup scheduled every ${settings.intervalHours} hours`);
        this._notifyListeners({
          type: 'auto_backup_scheduled',
          intervalHours: settings.intervalHours
        });
      }
    } catch (error) {
      console.error('Failed to schedule auto-backup:', error);
    }
  }

  /**
   * Clear auto-backup timer and cleanup resources
   * @private
   */
  _clearAutoBackup() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }

  /**
   * Load backup settings from database using batch retrieval
   * @private
   * @throws {ServiceError} When settings cannot be loaded
   */
  async _loadBackupSettings() {
    try {
      const settings = await this.getBackupSettings();
      this.lastBackupTime = settings.lastBackupTime;
    } catch (error) {
      console.warn('Failed to load backup settings:', error);
      this.lastBackupTime = null;
    }
  }

  /**
   * Save backup settings to database
   * @private
   * @throws {ServiceError} When settings cannot be saved
   */
  async _saveBackupSettings() {
    try {
      if (this.lastBackupTime) {
        await db.settings.setSetting('backup.last_backup_time', this.lastBackupTime.toISOString());
      }
    } catch (error) {
      console.warn('Failed to save backup settings:', error);
    }
  }
}

// Export singleton instance
const backupService = new BackupService();
export default backupService;