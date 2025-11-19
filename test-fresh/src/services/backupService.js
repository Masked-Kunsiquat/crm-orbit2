import {
  documentDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  getInfoAsync,
  EncodingType,
} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import db from '../database';
import authService from './authService';
import fileService from './fileService';
import { ServiceError, logger } from '../errors';
import {
  BACKUP_CONFIG,
  BACKUP_TABLES,
  IMPORTABLE_TABLES,
  BACKUP_FEATURES,
  BACKUP_STRUCTURE,
  BACKUP_ERROR_CODES,
  buildServiceError,
} from './backup/backupConstants';
import { createBackupCsvExporter } from './backup/backupCsv';

// Re-export BACKUP_STRUCTURE for backward compatibility
export { BACKUP_STRUCTURE } from './backup/backupConstants';

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

    // Initialize CSV exporter with dependencies
    this.csvExporter = createBackupCsvExporter(
      authService,
      this._exportTable.bind(this)
    );
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
      await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, {
        intermediates: true,
      });
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
      logger.warn('BackupService', 'Auto-backup check failed during startup', { error: error.message });

      // Try to at least schedule auto-backup if settings are available
      try {
        await this._scheduleAutoBackup();
        return true;
      } catch (scheduleError) {
        logger.warn('BackupService', 'Failed to schedule auto-backup', { error: scheduleError.message });
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
        logger.error('BackupService', 'notifyListeners', { error: error.message });
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
    const {
      filename,
      includeAttachments = false,
      onProgress,
      requireAuth = true,
    } = options;

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
          includeAttachments,
        },
      };

      let totalProgress = 0;
      const progressIncrement = 100 / BACKUP_TABLES.length;

      for (const table of BACKUP_TABLES) {
        onProgress?.({
          stage: 'exporting',
          table,
          progress: Math.round(totalProgress),
        });

        try {
          const tableData = await this._exportTable(table, includeAttachments);
          backupData.tables[table] = tableData;
          backupData.metadata.totalRecords += tableData.length;
        } catch (error) {
          logger.warn('BackupService', 'Failed to export table', { table, error: error.message });
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
        recordCount: backupData.metadata.totalRecords,
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
    // Sync backup running state with CSV exporter
    this.csvExporter.setBackupRunning(this.isBackupRunning);

    // Delegate to CSV exporter with callback functions
    const csvPath = await this.csvExporter.exportToCSV({
      ...options,
      notifyListeners: this._notifyListeners.bind(this),
    });

    // Sync backup running state back from CSV exporter
    this.isBackupRunning = this.csvExporter.isBackupRunning;

    return csvPath;
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
    const {
      overwrite = false,
      tablesToImport,
      onProgress,
      requireAuth = true,
    } = options;

    // Check authentication if required
    if (requireAuth && (await authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'importBackup',
        new Error('Authentication required for import operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    // Check if backup operation is already in progress
    if (this.isBackupRunning) {
      throw buildServiceError(
        'backupService',
        'importBackup',
        new Error('Import operation already in progress'),
        BACKUP_ERROR_CODES.IN_PROGRESS
      );
    }

    try {
      onProgress?.({ stage: 'reading', progress: 0 });

      const backupContent = await readAsStringAsync(backupPath);
      const backupData = JSON.parse(backupContent);

      // Validate backup format
      await this._validateBackup(backupData);

      onProgress?.({ stage: 'validating', progress: 10 });

      // Set flag before starting the long-running import work
      this.isBackupRunning = true;

      const importTables = tablesToImport || BACKUP_TABLES;
      const summary = {
        imported: {},
        skipped: {},
        errors: {},
        totalRecords: 0,
      };

      let progressIncrement = 80 / importTables.length;
      let currentProgress = 20;

      // Create shared ID mapping for non-overwrite mode to maintain referential integrity
      const idMaps = overwrite ? null : new Map();

      for (const table of importTables) {
        onProgress?.({
          stage: 'importing',
          table,
          progress: Math.round(currentProgress),
        });

        try {
          if (backupData.tables[table]) {
            const result = await this._importTable(
              table,
              backupData.tables[table],
              overwrite,
              idMaps
            );
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
        backupPath,
      });

      return summary;
    } catch (error) {
      throw buildServiceError(
        'backupService',
        'importBackup',
        error,
        BACKUP_ERROR_CODES.IMPORT_ERROR
      );
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * List available backup files
   * @returns {Promise<Array>} - Array of backup file info
   */
  async listBackups() {
    try {
      let files;

      try {
        // Try to read directory first
        files = await readDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR);
      } catch (error) {
        // If directory doesn't exist (ENOENT), create it and return empty list
        if (
          error.code === 'ENOENT' ||
          error.message?.includes('ENOENT') ||
          error.message?.includes('does not exist')
        ) {
          await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, {
            intermediates: true,
          });
          files = []; // Empty directory
        } else {
          // Rethrow unexpected errors
          throw error;
        }
      }

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
            type: filename.endsWith('.json') ? 'json' : 'csv',
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
        filename,
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
          backupPath,
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
      // If error is already a ServiceError, preserve its classification
      if (error instanceof ServiceError) {
        throw error;
      }

      // Otherwise, wrap unexpected errors
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
      await db.settings.setSetting(
        'backup.interval_hours',
        settings.intervalHours
      );
      await db.settings.setSetting('backup.max_backups', settings.maxBackups);

      if (settings.enabled) {
        await this._scheduleAutoBackup();
      } else {
        this._clearAutoBackup();
      }

      this._notifyListeners({
        type: 'auto_backup_configured',
        settings,
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
        intervalHours:
          settings.interval_hours ?? BACKUP_CONFIG.AUTO_BACKUP_INTERVAL_HOURS,
        maxBackups: settings.max_backups ?? BACKUP_CONFIG.MAX_BACKUP_COUNT,
        lastBackupTime: settings.last_backup_time
          ? new Date(settings.last_backup_time)
          : null,
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
        case 'contact_info': {
          // Get all contact info by getting all contacts and their info
          const contacts = await db.contacts.getAll();
          const allContactInfo = [];
          for (const contact of contacts) {
            try {
              const contactWithInfo = await db.contactsInfo.getWithContactInfo(
                contact.id
              );
              if (contactWithInfo && contactWithInfo.contact_info) {
                allContactInfo.push(...contactWithInfo.contact_info);
              }
            } catch (error) {
              logger.warn('BackupService', 'Failed to get contact info for contact', { contactId: contact.id, error: error.message });
            }
          }
          return allContactInfo;
        }
        case 'attachments': {
          const attachments = await db.attachments.getAll();
          // Include file data if requested (base64 encoded)
          if (includeAttachments) {
            for (const attachment of attachments) {
              try {
                const fileData = await readAsStringAsync(attachment.file_path, {
                  encoding: EncodingType.Base64,
                });
                attachment.file_data = fileData;
              } catch (error) {
                logger.warn('BackupService', 'Failed to read attachment', { attachmentId: attachment.id, error: error.message });
              }
            }
          }
          return attachments;
        }
        case 'events':
          return await db.events.getAll();
        case 'events_recurring':
          return await db.eventsRecurring.getRecurringEvents();
        case 'events_reminders':
          return await db.eventsReminders.getAll();
        case 'interactions':
          return await db.interactions.getAll();
        case 'notes':
          return await db.notes.getAll();
        case 'category_relations': {
          // Get all category relations by getting category contact counts
          const categoryRelations = [];
          const categories = await db.categories.getAll();
          for (const category of categories) {
            try {
              const contacts =
                await db.categoriesRelations.getContactsByCategory(category.id);
              for (const contact of contacts) {
                categoryRelations.push({
                  category_id: category.id,
                  contact_id: contact.id,
                });
              }
            } catch (error) {
              logger.warn('BackupService', 'Failed to get relations for category', { categoryId: category.id, error: error.message });
            }
          }
          return categoryRelations;
        }
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
   * @param {Map<string, Map<number, number>>} [idMaps] - ID mapping for referential integrity in non-overwrite mode
   * @returns {Promise<{imported: number, skipped: number}>} Import statistics
   * @throws {ServiceError} When import operation fails
   */
  async _importTable(tableName, data, overwrite, idMaps = null) {
    let imported = 0;
    let skipped = 0;

    // Initialize ID mapping if not provided and in non-overwrite mode
    if (!overwrite && !idMaps) {
      idMaps = new Map();
    }

    // Define root entities that create new IDs and dependent entities that need mapping
    const rootEntities = ['categories', 'companies', 'contacts', 'events'];
    const dependentEntities = {
      contact_info: ['contact_id'],
      attachments: ['entity_id'], // Assuming entity_id references contacts/companies
      category_relations: ['category_id', 'contact_id'],
      interactions: ['contact_id', 'company_id'],
      notes: ['entity_id'], // Assuming entity_id references contacts/companies/events
      events_reminders: ['event_id'],
    };

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
              case 'contact_info':
                await db.contactsInfo.updateContactInfo(record.id, record);
                break;
              case 'attachments': {
                let dataToUpdate = { ...record };
                if (record.file_data) {
                  try {
                    const attachDir = `${documentDirectory}attachments/`;
                    await makeDirectoryAsync(attachDir, {
                      intermediates: true,
                    });
                    const targetPath =
                      record.file_path ||
                      `${attachDir}${record.filename || `attachment-${Date.now()}.bin`}`;
                    await writeAsStringAsync(targetPath, record.file_data, {
                      encoding: EncodingType.Base64,
                    });
                    dataToUpdate.file_path = targetPath;
                    delete dataToUpdate.file_data;
                  } catch (fsErr) {
                    logger.warn('BackupService', 'Failed to restore attachment file', { error: fsErr.message });
                  }
                }
                await db.attachments.update(record.id, dataToUpdate);
                break;
              }
              case 'events':
                await db.events.update(record.id, record);
                break;
              case 'interactions':
                await db.interactions.update(record.id, record);
                break;
              case 'notes':
                await db.notes.update(record.id, record);
                break;
              case 'settings':
                await db.settings.setSetting(
                  record.category + '.' + record.key,
                  record.value
                );
                break;
              // Complex tables that may need special handling
              case 'events_recurring': {
                if (BACKUP_FEATURES.IMPORT_RECURRING_EVENTS) {
                  await this._importRecurringEvent(record, true);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping events_recurring import: feature disabled', { featureFlag: 'IMPORT_RECURRING_EVENTS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              case 'events_reminders': {
                if (BACKUP_FEATURES.IMPORT_EVENT_REMINDERS) {
                  await this._importEventReminder(record, true);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping events_reminders import: feature disabled', { featureFlag: 'IMPORT_EVENT_REMINDERS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              case 'category_relations': {
                if (BACKUP_FEATURES.IMPORT_CATEGORY_RELATIONS) {
                  await this._importCategoryRelation(record, true);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping category_relations import: feature disabled', { featureFlag: 'IMPORT_CATEGORY_RELATIONS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              default: {
                logger.error('BackupService', 'Unknown table during overwrite import', { tableName });
                throw buildServiceError(
                  'backupService',
                  '_importTable',
                  new Error(`Unknown table '${tableName}' during overwrite import`),
                  BACKUP_ERROR_CODES.UNKNOWN_TABLE,
                  { tableName }
                );
              }
            }
            imported++;
          } else {
            // For non-overwrite mode with ID mapping for referential integrity
            const oldId = record.id;
            const { id, ...recordData } = record;

            // Apply ID mapping for dependent records
            if (dependentEntities[tableName]) {
              for (const foreignKey of dependentEntities[tableName]) {
                if (recordData[foreignKey]) {
                  // Determine the referenced table from foreign key name
                  const referencedTable =
                    this._getReferencedTableFromForeignKey(foreignKey);

                  if (idMaps.has(referencedTable)) {
                    const tableMap = idMaps.get(referencedTable);
                    const newId = tableMap.get(recordData[foreignKey]);

                    if (newId !== undefined) {
                      recordData[foreignKey] = newId;
                    } else {
                      logger.warn('BackupService', 'Missing ID mapping: skipping record', { tableName, foreignKey, oldId: recordData[foreignKey] });
                      skipped++;
                      continue;
                    }
                  } else {
                    logger.warn('BackupService', 'No ID mapping table found: skipping record', { referencedTable, tableName, foreignKey });
                    skipped++;
                    continue;
                  }
                }
              }
            }

            let newRecord = null;
            switch (tableName) {
              case 'categories': {
                newRecord = await db.categories.createCategory(recordData);
                if (oldId && newRecord?.id) {
                  if (!idMaps.has('categories'))
                    idMaps.set('categories', new Map());
                  idMaps.get('categories').set(oldId, newRecord.id);
                }
                break;
              }
              case 'companies': {
                newRecord = await db.companies.createCompany(recordData);
                if (oldId && newRecord?.id) {
                  if (!idMaps.has('companies'))
                    idMaps.set('companies', new Map());
                  idMaps.get('companies').set(oldId, newRecord.id);
                }
                break;
              }
              case 'contacts': {
                newRecord = await db.contacts.createContact(recordData);
                if (oldId && newRecord?.id) {
                  if (!idMaps.has('contacts'))
                    idMaps.set('contacts', new Map());
                  idMaps.get('contacts').set(oldId, newRecord.id);
                }
                break;
              }
              case 'contact_info':
                await db.contactsInfo.addContactInfo(
                  recordData.contact_id,
                  recordData
                );
                break;
              case 'attachments': {
                let dataToCreate = { ...recordData };
                if (recordData.file_data) {
                  try {
                    const attachDir = `${documentDirectory}attachments/`;
                    await makeDirectoryAsync(attachDir, {
                      intermediates: true,
                    });
                    const targetPath =
                      recordData.file_path ||
                      `${attachDir}${recordData.filename || `attachment-${Date.now()}.bin`}`;
                    await writeAsStringAsync(targetPath, recordData.file_data, {
                      encoding: EncodingType.Base64,
                    });
                    dataToCreate.file_path = targetPath;
                    delete dataToCreate.file_data;
                  } catch (fsErr) {
                    logger.warn('BackupService', 'Failed to restore attachment file', { error: fsErr.message });
                  }
                }
                await db.attachments.create(dataToCreate);
                break;
              }
              case 'events': {
                newRecord = await db.events.create(recordData);
                if (oldId && newRecord?.id) {
                  if (!idMaps.has('events')) idMaps.set('events', new Map());
                  idMaps.get('events').set(oldId, newRecord.id);
                }
                break;
              }
              case 'interactions':
                await db.interactions.create(recordData);
                break;
              case 'notes':
                await db.notes.create(recordData);
                break;
              case 'settings':
                await db.settings.setSetting(
                  recordData.category + '.' + recordData.key,
                  recordData.value
                );
                break;
              // Complex tables that may need special handling
              case 'events_recurring': {
                if (BACKUP_FEATURES.IMPORT_RECURRING_EVENTS) {
                  await this._importRecurringEvent(recordData, false);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping events_recurring import: feature disabled', { featureFlag: 'IMPORT_RECURRING_EVENTS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              case 'events_reminders': {
                if (BACKUP_FEATURES.IMPORT_EVENT_REMINDERS) {
                  await this._importEventReminder(recordData, false);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping events_reminders import: feature disabled', { featureFlag: 'IMPORT_EVENT_REMINDERS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              case 'category_relations': {
                if (BACKUP_FEATURES.IMPORT_CATEGORY_RELATIONS) {
                  await this._importCategoryRelation(recordData, false);
                } else {
                  if (!BACKUP_FEATURES.SKIP_IMPORT_WARNINGS) {
                    logger.warn('BackupService', 'Skipping category_relations import: feature disabled', { featureFlag: 'IMPORT_CATEGORY_RELATIONS' });
                  }
                  skipped++;
                  continue; // Skip the post-switch imported++ increment
                }
                break;
              }
              default: {
                logger.error('BackupService', 'Unknown table during non-overwrite import', { tableName });
                throw buildServiceError(
                  'backupService',
                  '_importTable',
                  new Error(`Unknown table '${tableName}' during non-overwrite import`),
                  BACKUP_ERROR_CODES.UNKNOWN_TABLE,
                  { tableName }
                );
              }
            }
            imported++;
          }
        } catch (error) {
          // Log the actual error for debugging, but continue processing
          logger.warn('BackupService', 'Failed to import record in table', { tableName, error: error.message });

          // Check if it's a constraint violation (record already exists) or a real error
          const errorMessage = error.message || String(error);
          const isConstraintError =
            errorMessage.includes('UNIQUE constraint failed') ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('duplicate');

          if (isConstraintError) {
            // Expected constraint violation - record already exists
            skipped++;
          } else {
            // Unexpected error - should be logged and potentially fail the import
            logger.error('BackupService', 'Unexpected error importing record in table', { tableName, error: error.message });
            skipped++;

            // For critical errors, you might want to throw here instead of continuing:
            // throw error;
          }
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
      logger.warn('BackupService', 'Backup version mismatch', { backupVersion: backupData.version, currentVersion: BACKUP_CONFIG.BACKUP_VERSION });
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
        if (
          now - backup.created > maxAge &&
          !backupsToDelete.includes(backup)
        ) {
          backupsToDelete.push(backup);
        }
      }

      // Delete old backups (without requiring auth for cleanup)
      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.filename, false);
        } catch (error) {
          logger.warn('BackupService', 'Failed to delete old backup', { filename: backup.filename, error: error.message });
        }
      }

      if (backupsToDelete.length > 0) {
        this._notifyListeners({
          type: 'backups_cleaned',
          deletedCount: backupsToDelete.length,
        });
      }
    } catch (error) {
      logger.error('BackupService', 'Failed to cleanup old backups', { error: error.message });
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
              requireAuth: false, // Auto-backups don't require interactive auth
            });
            logger.info('BackupService', 'Auto-backup completed successfully');
          } catch (error) {
            logger.error('BackupService', 'Auto-backup failed', { error: error.message });
            this._notifyListeners({
              type: 'auto_backup_failed',
              error: error.message,
            });
          }
        }, intervalMs);

        logger.info('BackupService', 'Auto-backup scheduled', { intervalHours: settings.intervalHours });
        this._notifyListeners({
          type: 'auto_backup_scheduled',
          intervalHours: settings.intervalHours,
        });
      }
    } catch (error) {
      logger.error('BackupService', 'Failed to schedule auto-backup', { error: error.message });
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
      logger.warn('BackupService', 'Failed to load backup settings', { error: error.message });
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
        await db.settings.setSetting(
          'backup.last_backup_time',
          this.lastBackupTime.toISOString()
        );
      }
    } catch (error) {
      logger.warn('BackupService', 'Failed to save backup settings', { error: error.message });
    }
  }

  /**
   * Import a recurring event record
   * Recurring events are stored in the main events table with recurring flag set
   * @private
   * @param {Object} record - Recurring event record to import
   * @param {boolean} overwrite - Whether to overwrite existing records
   * @throws {ServiceError} When import fails
   */
  async _importRecurringEvent(record, overwrite) {
    try {
      // Recurring events are actually regular events with recurring=1
      // Ensure the record has the recurring flag set
      const eventRecord = {
        ...record,
        recurring: 1, // Ensure this is marked as recurring
      };

      if (overwrite) {
        // Use the regular events update method for overwrite
        await db.events.update(eventRecord.id, eventRecord);
      } else {
        // For non-overwrite mode, remove the ID and create new
        const { id, ...eventData } = eventRecord;
        await db.events.create(eventData);
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        '_importRecurringEvent',
        error,
        BACKUP_ERROR_CODES.TABLE_IMPORT_ERROR,
        { tableName: 'events_recurring', recordId: record.id || 'unknown' }
      );
    }
  }

  /**
   * Import an event reminder record
   * @private
   * @param {Object} record - Event reminder record to import
   * @param {boolean} overwrite - Whether to overwrite existing records
   * @throws {ServiceError} When import fails
   */
  async _importEventReminder(record, overwrite) {
    try {
      if (overwrite) {
        // For overwrite mode, delete existing reminder and create new one
        // since eventsReminders doesn't have a generic update method
        try {
          await db.eventsReminders.deleteReminder(record.id);
        } catch (deleteError) {
          // Ignore if reminder doesn't exist
        }

        // Create new reminder with original ID preserved
        const reminderData = { ...record };
        await db.eventsReminders.createReminder(reminderData);
      } else {
        // For non-overwrite mode, remove the ID and create new
        const { id, ...reminderData } = record;
        await db.eventsReminders.createReminder(reminderData);
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        '_importEventReminder',
        error,
        BACKUP_ERROR_CODES.TABLE_IMPORT_ERROR,
        { tableName: 'events_reminders', recordId: record.id || 'unknown' }
      );
    }
  }

  /**
   * Import a category relation record
   * Category relations link contacts to categories
   * @private
   * @param {Object} record - Category relation record to import
   * @param {boolean} overwrite - Whether to overwrite existing records
   * @throws {ServiceError} When import fails
   */
  async _importCategoryRelation(record, overwrite) {
    try {
      if (!record.category_id || !record.contact_id) {
        throw new Error(
          'Category relation record missing required fields: category_id, contact_id'
        );
      }

      // For both overwrite and non-overwrite modes, just add the relation
      // The addContactToCategory method handles duplicates gracefully
      const wasAdded = await db.categoriesRelations.addContactToCategory(
        record.contact_id,
        record.category_id
      );

      if (!wasAdded && overwrite) {
        // Relation already exists, which is expected for overwrite mode
        // No need to do anything - the relation is already in place
      }
    } catch (error) {
      throw buildServiceError(
        'backupService',
        '_importCategoryRelation',
        error,
        BACKUP_ERROR_CODES.TABLE_IMPORT_ERROR,
        {
          tableName: 'category_relations',
          recordId: `${record.category_id || 'unknown'}-${record.contact_id || 'unknown'}`,
        }
      );
    }
  }

  /**
   * Helper method to determine referenced table from foreign key name
   * @private
   * @param {string} foreignKey - Foreign key field name
   * @returns {string} Referenced table name
   */
  _getReferencedTableFromForeignKey(foreignKey) {
    // Map foreign key patterns to table names
    const fkMappings = {
      contact_id: 'contacts',
      company_id: 'companies',
      category_id: 'categories',
      event_id: 'events',
      entity_id: 'contacts', // Default entity_id to contacts, could be enhanced
      parent_id: 'contacts', // Default parent_id to contacts, could be enhanced
    };

    return fkMappings[foreignKey] || foreignKey.replace('_id', 's'); // Fallback: pluralize
  }

  /**
   * Reset service state for testing
   * Clears all singleton state to ensure clean test execution
   * @returns {void}
   * @since 1.0.0
   */
  reset() {
    // Clear auto-backup timer to prevent orphaned timers
    this._clearAutoBackup();

    // Reset operational state
    this.isBackupRunning = false;
    this.lastBackupTime = null;
    this.isInitialized = false;

    // Clear event listeners to prevent memory leaks
    this.listeners.clear();

    // Reset timer reference (already cleared by _clearAutoBackup, but be explicit)
    this.autoBackupTimer = null;

    // Reset CSV exporter state
    this.csvExporter.setBackupRunning(false);
  }
}

// Export singleton instance
const backupService = new BackupService();
export default backupService;
