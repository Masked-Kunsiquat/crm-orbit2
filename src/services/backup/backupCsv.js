import { makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system';
import { BACKUP_CONFIG, BACKUP_TABLES, BACKUP_ERROR_CODES, buildServiceError } from './backupConstants';

/**
 * CSV export operations for backup service
 */
export class BackupCsvExporter {
  constructor(authService, exportTableFunction) {
    this.authService = authService;
    this.exportTable = exportTableFunction;
    this.isBackupRunning = false;
  }

  /**
   * Export database to CSV format
   * @param {Object} options - Export options
   * @param {string} [options.table] - Specific table to export (exports all if not specified)
   * @param {string} [options.filename] - Custom filename
   * @param {boolean} [options.requireAuth=true] - Require authentication
   * @param {Function} [options.onProgress] - Progress callback
   * @param {Function} [options.notifyListeners] - Listener notification callback
   * @returns {Promise<string>} - Path to created CSV file
   */
  async exportToCSV(options = {}) {
    const { table, filename, requireAuth = true, onProgress, notifyListeners } = options;

    // Check authentication if required
    if (requireAuth && (await this.authService.checkIsLocked())) {
      throw buildServiceError(
        'backupService',
        'exportToCSV',
        new Error('Authentication required for export operations'),
        BACKUP_ERROR_CODES.AUTH_REQUIRED
      );
    }

    // Check if backup operation is already in progress
    if (this.isBackupRunning) {
      throw buildServiceError(
        'backupService',
        'exportToCSV',
        new Error('Export operation already in progress'),
        BACKUP_ERROR_CODES.IN_PROGRESS
      );
    }

    this.isBackupRunning = true;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const csvFilename = filename || `crm-export-${table || 'full'}-${timestamp}.csv`;

      // Ensure backup directory exists before constructing file path
      await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, { intermediates: true });

      const csvPath = `${BACKUP_CONFIG.BACKUP_DIR}${csvFilename}`;

      let csvContent = '';
      const tablesToExport = table ? [table] : BACKUP_TABLES;

      for (const tableName of tablesToExport) {
        onProgress?.({ stage: 'exporting', table: tableName });

        const tableData = await this.exportTable(tableName, false);

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
              return this._formatCsvValue(value);
            });
            csvContent += values.join(',') + '\n';
          }
        }
      }

      await writeAsStringAsync(csvPath, csvContent);

      // Notify listeners if callback provided
      notifyListeners?.({
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
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Format a value for CSV output with proper escaping
   * @private
   * @param {*} value - Value to format
   * @returns {string} Formatted CSV value
   */
  _formatCsvValue(value) {
    // Handle null/undefined values
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // Escape commas, quotes, and newlines in CSV
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Set backup running state (used by parent service for concurrency control)
   * @param {boolean} isRunning - Whether backup is running
   */
  setBackupRunning(isRunning) {
    this.isBackupRunning = isRunning;
  }
}

/**
 * Factory function to create CSV exporter instance
 * @param {Object} authService - Authentication service instance
 * @param {Function} exportTableFunction - Function to export table data
 * @returns {BackupCsvExporter} CSV exporter instance
 */
export function createBackupCsvExporter(authService, exportTableFunction) {
  return new BackupCsvExporter(authService, exportTableFunction);
}