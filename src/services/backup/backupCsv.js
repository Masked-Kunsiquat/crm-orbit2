import { makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system';
import { BACKUP_CONFIG, BACKUP_TABLES, BACKUP_ERROR_CODES, buildServiceError } from './backupConstants';

/**
 * Sanitize and validate filename for CSV export
 * @private
 * @param {string} filename - Input filename to sanitize
 * @returns {string} Sanitized filename ending with .csv
 * @throws {Error} If filename is invalid or contains path traversal
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Filename cannot contain path separators or parent directory references');
  }

  // Extract basename only (in case of any remaining path components)
  const basename = filename.split(/[/\\]/).pop();

  // Validate against whitelist of safe characters (alphanumeric, dash, underscore, dot)
  const safeCharPattern = /^[a-zA-Z0-9._-]+$/;
  if (!safeCharPattern.test(basename)) {
    throw new Error('Filename can only contain alphanumeric characters, dots, dashes, and underscores');
  }

  // Ensure filename ends with .csv
  const sanitized = basename.endsWith('.csv') ? basename : `${basename}.csv`;

  // Additional validation - ensure it's not just ".csv"
  if (sanitized === '.csv') {
    throw new Error('Filename cannot be empty before .csv extension');
  }

  return sanitized;
}

/**
 * Safely construct CSV file path within backup directory
 * @private
 * @param {string} backupDir - Base backup directory
 * @param {string} filename - Sanitized filename
 * @returns {string} Safe file path
 * @throws {Error} If resulting path would be outside backup directory
 */
function safePathJoin(backupDir, filename) {
  // Normalize the backup directory path
  const normalizedBackupDir = backupDir.endsWith('/') ? backupDir : `${backupDir}/`;
  const csvPath = `${normalizedBackupDir}${filename}`;

  // Verify the resulting path is still within the backup directory
  if (!csvPath.startsWith(normalizedBackupDir)) {
    throw new Error('Resulting file path would be outside backup directory');
  }

  return csvPath;
}

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
      let csvFilename;

      if (filename) {
        // Sanitize user-provided filename
        try {
          csvFilename = sanitizeFilename(filename);
        } catch (sanitizeError) {
          throw buildServiceError(
            'backupService',
            'exportToCSV',
            sanitizeError,
            BACKUP_ERROR_CODES.VALIDATION_ERROR,
            { providedFilename: filename }
          );
        }
      } else {
        // Generate safe default filename
        csvFilename = `crm-export-${table || 'full'}-${timestamp}.csv`;
      }

      // Ensure backup directory exists before constructing file path
      await makeDirectoryAsync(BACKUP_CONFIG.BACKUP_DIR, { intermediates: true });

      // Safely construct the full path
      let csvPath;
      try {
        csvPath = safePathJoin(BACKUP_CONFIG.BACKUP_DIR, csvFilename);
      } catch (pathError) {
        throw buildServiceError(
          'backupService',
          'exportToCSV',
          pathError,
          BACKUP_ERROR_CODES.VALIDATION_ERROR,
          { filename: csvFilename }
        );
      }

      let csvContent = '';
      const tablesToExport = table ? [table] : BACKUP_TABLES;
      let allHeaders = new Set();
      let allTableData = [];

      // First pass: collect all data and compute union of all column keys
      for (const tableName of tablesToExport) {
        onProgress?.({ stage: 'exporting', table: tableName });

        const tableData = await this.exportTable(tableName, false);

        if (tableData.length > 0) {
          // Collect all unique column keys across all rows
          for (const row of tableData) {
            Object.keys(row).forEach(key => allHeaders.add(key));
          }

          // Store data with table name for later processing
          allTableData.push({ tableName, data: tableData });
        }
      }

      if (allTableData.length > 0) {
        // Convert set to stable ordered array (preserves first-seen order)
        const dataHeaders = Array.from(allHeaders);

        // For multi-table exports, add _table column at the beginning
        const headers = !table ? ['_table', ...dataHeaders] : dataHeaders;

        // Write escaped header row
        const escapedHeaders = headers.map(header => this._formatCsvValue(header));
        csvContent += escapedHeaders.join(',') + '\n';

        // Second pass: write data rows with consistent column structure
        for (const { tableName, data } of allTableData) {
          for (const row of data) {
            const values = headers.map(header => {
              if (header === '_table') {
                return this._formatCsvValue(tableName);
              }
              // Use empty string for missing keys, escape all values
              const value = row.hasOwnProperty(header) ? row[header] : '';
              return this._formatCsvValue(value);
            });
            csvContent += values.join(',') + '\n';
          }
        }
      }

      await writeAsStringAsync(csvPath, csvContent);

      onProgress?.({ stage: 'complete', table: table || 'all', progress: 100 });

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
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
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