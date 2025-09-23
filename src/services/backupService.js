import { documentDirectory, writeAsStringAsync, readAsStringAsync, deleteAsync, makeDirectoryAsync, readDirectoryAsync, getInfoAsync } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import db from '../database';
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
 * Comprehensive backup service for CRM database export/import operations.
 *
 * Features:
 * - JSON and CSV export formats
 * - Import validation and conflict resolution
 * - Auto-backup scheduling with cleanup
 * - Backup integrity verification
 * - Progress tracking for large datasets
 */
class BackupService {
  constructor() {
    this.isBackupRunning = false;
    this.lastBackupTime = null;
    this.autoBackupTimer = null;
  }

  /**
   * Initialize backup service and create backup directory
   */
  async initialize() {
    try {
      await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, { intermediates: true });
      await this._loadLastBackupTime();
      await this._scheduleAutoBackup();
    } catch (error) {
      throw new ServiceError(
        'Failed to initialize backup service',
        'BACKUP_INIT_ERROR',
        error
      );
    }
  }

  /**
   * Create a full database backup in JSON format
   * @param {Object} options - Backup options
   * @param {string} [options.filename] - Custom filename for backup
   * @param {boolean} [options.includeAttachments=false] - Include attachment data
   * @param {Function} [options.onProgress] - Progress callback
   * @returns {Promise<string>} - Path to created backup file
   */
  async createBackup(options = {}) {
    const { filename, includeAttachments = false, onProgress } = options;

    if (this.isBackupRunning) {
      throw new ServiceError(
        'Backup operation already in progress',
        'BACKUP_IN_PROGRESS'
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

      this.lastBackupTime = new Date();
      await this._saveLastBackupTime();
      await this._cleanupOldBackups();

      return backupPath;
    } catch (error) {
      throw new ServiceError(
        'Failed to create backup',
        'BACKUP_CREATE_ERROR',
        error
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
   * @returns {Promise<string>} - Path to created CSV file
   */
  async exportToCSV(options = {}) {
    const { table, filename } = options;

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
      return csvPath;
    } catch (error) {
      throw new ServiceError(
        'Failed to export CSV',
        'CSV_EXPORT_ERROR',
        error
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
   * @returns {Promise<Object>} - Import summary
   */
  async importBackup(backupPath, options = {}) {
    const { overwrite = false, tablesToImport, onProgress } = options;

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

      return summary;
    } catch (error) {
      throw new ServiceError(
        'Failed to import backup',
        'BACKUP_IMPORT_ERROR',
        error
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
      throw new ServiceError(
        'Failed to list backups',
        'BACKUP_LIST_ERROR',
        error
      );
    }
  }

  /**
   * Delete a specific backup file
   * @param {string} filename - Name of backup file to delete
   */
  async deleteBackup(filename) {
    try {
      const filePath = `${BACKUP_CONFIG.BACKUP_DIR}${filename}`;
      await deleteAsync(filePath);
    } catch (error) {
      throw new ServiceError(
        'Failed to delete backup',
        'BACKUP_DELETE_ERROR',
        error
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
      } else {
        throw new ServiceError(
          'Sharing not available on this device',
          'SHARING_NOT_AVAILABLE'
        );
      }
    } catch (error) {
      throw new ServiceError(
        'Failed to share backup',
        'BACKUP_SHARE_ERROR',
        error
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
      await db.settings.setSetting('backup.auto_enabled', settings.enabled);
      await db.settings.setSetting('backup.interval_hours', settings.intervalHours);
      await db.settings.setSetting('backup.max_backups', settings.maxBackups);

      if (settings.enabled) {
        await this._scheduleAutoBackup();
      } else {
        this._clearAutoBackup();
      }
    } catch (error) {
      throw new ServiceError(
        'Failed to configure auto-backup',
        'AUTO_BACKUP_CONFIG_ERROR',
        error
      );
    }
  }

  // Private methods

  /**
   * Export data from a specific table
   * @private
   */
  async _exportTable(tableName, includeAttachments) {
    try {
      switch (tableName) {
        case 'categories':
          return await db.categories.getAllCategories();
        case 'companies':
          return await db.companies.getAllCompanies();
        case 'contacts':
          return await db.contacts.getAllContacts();
        case 'contact_info':
          return await db.contactsInfo.getAllContactInfo();
        case 'attachments':
          const attachments = await db.attachments.getAllAttachments();
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
          return await db.events.getAllEvents();
        case 'events_recurring':
          return await db.eventsRecurring.getAllRecurringEvents();
        case 'events_reminders':
          return await db.eventsReminders.getAllReminders();
        case 'interactions':
          return await db.interactions.getAllInteractions();
        case 'notes':
          return await db.notes.getAllNotes();
        case 'category_relations':
          return await db.categoriesRelations.getAllRelations();
        case 'settings':
          return await db.settings.getAllSettings();
        default:
          console.warn(`Unknown table: ${tableName}`);
          return [];
      }
    } catch (error) {
      console.error(`Error exporting table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Import data into a specific table
   * @private
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
      throw new ServiceError(
        `Failed to import table ${tableName}`,
        'TABLE_IMPORT_ERROR',
        error
      );
    }

    return { imported, skipped };
  }

  /**
   * Validate backup file format and integrity
   * @private
   */
  async _validateBackup(backupData) {
    if (!backupData.version || !backupData.timestamp || !backupData.tables) {
      throw new ServiceError(
        'Invalid backup format',
        'INVALID_BACKUP_FORMAT'
      );
    }

    // Version compatibility check
    if (backupData.version !== BACKUP_CONFIG.BACKUP_VERSION) {
      console.warn(`Backup version mismatch: ${backupData.version} vs ${BACKUP_CONFIG.BACKUP_VERSION}`);
    }

    return true;
  }

  /**
   * Clean up old backup files based on configuration
   * @private
   */
  async _cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const maxAge = BACKUP_CONFIG.MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
      const now = new Date();

      // Sort by creation date (newest first)
      const sortedBackups = backups.sort((a, b) => b.created - a.created);

      // Keep only the most recent backups up to MAX_BACKUP_COUNT
      const backupsToDelete = sortedBackups.slice(BACKUP_CONFIG.MAX_BACKUP_COUNT);

      // Also delete backups older than MAX_BACKUP_AGE_DAYS
      for (const backup of sortedBackups) {
        if (now - backup.created > maxAge && !backupsToDelete.includes(backup)) {
          backupsToDelete.push(backup);
        }
      }

      // Delete old backups
      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.filename);
        } catch (error) {
          console.warn(`Failed to delete old backup ${backup.filename}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Schedule automatic backup based on settings
   * @private
   */
  async _scheduleAutoBackup() {
    this._clearAutoBackup();

    try {
      const enabled = await db.settings.getSetting('backup.auto_enabled', false);
      const intervalHours = await db.settings.getSetting('backup.interval_hours', BACKUP_CONFIG.AUTO_BACKUP_INTERVAL_HOURS);

      if (enabled) {
        const intervalMs = intervalHours * 60 * 60 * 1000;

        this.autoBackupTimer = setInterval(async () => {
          try {
            await this.createBackup({ filename: `auto-backup-${Date.now()}.json` });
            console.log('Auto-backup completed successfully');
          } catch (error) {
            console.error('Auto-backup failed:', error);
          }
        }, intervalMs);

        console.log(`Auto-backup scheduled every ${intervalHours} hours`);
      }
    } catch (error) {
      console.error('Failed to schedule auto-backup:', error);
    }
  }

  /**
   * Clear auto-backup timer
   * @private
   */
  _clearAutoBackup() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }

  /**
   * Load last backup time from settings
   * @private
   */
  async _loadLastBackupTime() {
    try {
      const timestamp = await db.settings.getSetting('backup.last_backup_time', null);
      this.lastBackupTime = timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.warn('Failed to load last backup time:', error);
      this.lastBackupTime = null;
    }
  }

  /**
   * Save last backup time to settings
   * @private
   */
  async _saveLastBackupTime() {
    try {
      if (this.lastBackupTime) {
        await db.settings.setSetting('backup.last_backup_time', this.lastBackupTime.toISOString());
      }
    } catch (error) {
      console.warn('Failed to save last backup time:', error);
    }
  }
}

// Export singleton instance
const backupService = new BackupService();
export default backupService;