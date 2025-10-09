// Mock for backup CSV exporter
class BackupCsvExporter {
  constructor(authService, exportTableFunction) {
    this.authService = authService;
    this.exportTable = exportTableFunction;
    this.isBackupRunning = false;
  }

  setBackupRunning(isRunning) {
    this.isBackupRunning = isRunning;
  }

  async exportToCSV(options = {}) {
    const { table, filename, onProgress, notifyListeners } = options;

    // Simulate progress and export
    onProgress?.({ stage: 'exporting', table: table || 'all' });
    onProgress?.({ stage: 'complete', table: table || 'all', progress: 100 });

    // Notify listeners
    notifyListeners?.({
      type: 'csv_exported',
      csvPath: `/test/directory/backups/${filename || `crm-export-${table || 'full'}.csv`}`,
      table: table || 'all',
    });

    return `/test/directory/backups/${filename || `crm-export-${table || 'full'}.csv`}`;
  }
}

const createBackupCsvExporter = jest.fn((authService, exportTableFunction) => {
  const instance = {
    authService,
    exportTable: exportTableFunction,
    isBackupRunning: false,

    setBackupRunning(isRunning) {
      instance.isBackupRunning = isRunning;
    },

    async exportToCSV(options = {}) {
      const { table, filename, onProgress, notifyListeners } = options;

      // Simulate progress and export
      onProgress?.({ stage: 'exporting', table: table || 'all' });
      onProgress?.({ stage: 'complete', table: table || 'all', progress: 100 });

      // Notify listeners
      notifyListeners?.({
        type: 'csv_exported',
        csvPath: `/test/directory/backups/${filename || `crm-export-${table || 'full'}.csv`}`,
        table: table || 'all',
      });

      return `/test/directory/backups/${filename || `crm-export-${table || 'full'}.csv`}`;
    },
  };

  return instance;
});

module.exports = {
  BackupCsvExporter,
  createBackupCsvExporter,
};
