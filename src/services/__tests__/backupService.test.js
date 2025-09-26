// Unit tests for backupService behavior with mocked Expo modules and DB

// Mock Expo File System
jest.mock('expo-file-system');

// Mock Expo Sharing
jest.mock('expo-sharing');

// Ensure the database module is mocked before importing the service
jest.mock('../../database');

// Mock authService
jest.mock('../authService', () => ({
  default: {
    checkIsLocked: jest.fn(async () => false), // false means unlocked/authenticated
  }
}), { virtual: true });

// Mock fileService
jest.mock('../fileService', () => ({
  default: {
    validateFileSize: jest.fn(() => true),
  }
}), { virtual: true });

// Mock ServiceError class
jest.mock('../../services/errors', () => ({
  ServiceError: class ServiceError extends Error {
    constructor(service, operation, originalError, options = {}) {
      super(
        `${service}.${operation} failed: ${originalError?.message || originalError}`
      );
      this.name = 'ServiceError';
      this.service = service;
      this.operation = operation;
      this.originalError = originalError;
      this.code = options.errorCode;

      // Additional context from options
      if (options && typeof options === 'object') {
        Object.keys(options).forEach(key => {
          if (key !== 'errorCode' && !this.hasOwnProperty(key)) {
            this[key] = options[key];
          }
        });
      }
    }
  },
}), { virtual: true });

// Import the service after mocks are in place
const backupService = require('../backupService').default;
const FileSystem = require('expo-file-system');
const Sharing = require('expo-sharing');
const db = require('../../database');
const authService = require('../authService').default;

// Additional import for CSV-related tests
const { BackupCsvExporter, createBackupCsvExporter } = require('../backup/backupCsv');

describe('backupService', () => {
  // Mocked modules
  const { documentDirectory } = require('expo-file-system');

  beforeEach(() => {
    // Reset the backupService instance for each test
    backupService.reset();
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset FileSystem mocks
    FileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tables: {
        contacts: [{ id: 1, name: 'Test Contact' }],
      },
    }));
    FileSystem.readDirectoryAsync.mockResolvedValue([
      'backup-1.json',
      'backup-2.json',
    ]);

    // Reset auth service mocks
    authService.checkIsLocked.mockResolvedValue(false); // Default to authenticated (unlocked)

    // Reset database module mocks
    const mockTables = ['categories', 'companies', 'contacts', 'attachments', 'events', 'interactions', 'notes'];
    mockTables.forEach(table => {
      const mockData = [{ id: 1, name: `Test ${table}` }];
      const mockFn = jest.fn(async () => mockData);

      db[table] = {
        // Legacy method names (for compatibility)
        [`getAll${table.charAt(0).toUpperCase() + table.slice(1)}`]: mockFn,
        // Correct method names expected by backupService
        getAll: mockFn,
      };
    });

    // Special database table mocks with different methods
    db.contactsInfo = {
      getWithContactInfo: jest.fn(async (contactId) => ({
        id: contactId,
        contact_info: [{ id: 1, type: 'email', value: 'test@example.com' }]
      })),
      getAll: jest.fn(async () => [{ id: 1, type: 'email', value: 'test@example.com' }])
    };

    db.eventsRecurring = {
      getRecurringEvents: jest.fn(async () => [{ id: 1, title: 'Test Recurring Event' }]),
      getAll: jest.fn(async () => [{ id: 1, title: 'Test Recurring Event' }])
    };

    db.eventsReminders = {
      getUnsentReminders: jest.fn(async () => [{ id: 1, event_id: 1, reminder_type: 'notification' }]),
      getAll: jest.fn(async () => [{ id: 1, event_id: 1, reminder_type: 'notification' }])
    };

    db.categoriesRelations = {
      getContactsByCategory: jest.fn(async (categoryId) => [{ id: 1, name: 'Test Contact' }]),
      getAll: jest.fn(async () => [{ category_id: 1, contact_id: 1 }])
    };

    // Additional database mocks
    db.transaction = jest.fn(async callback => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      };
      return await callback(mockTx);
    });

    // Reset settings mocks
    db.settings = {
      setSetting: jest.fn(async () => {}),
      getSetting: jest.fn(async () => false),
      getAll: jest.fn(async () => [{ category: 'backup', key: 'auto_enabled', value: false }]),
      getValues: jest.fn(async () => ({
        auto_enabled: false,
        interval_hours: 24,
        max_backups: 10,
        last_backup_time: null
      }))
    };
  });

  describe('initialization', () => {
    test('creates backup directory successfully', async () => {
      await backupService.initialize();

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        `${documentDirectory}backups/`,
        { intermediates: true }
      );
    });

    test('handles initialization errors', async () => {
      FileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(backupService.initialize()).rejects.toMatchObject({
        code: 'BACKUP_INIT_ERROR',
        message: expect.stringContaining('Failed to initialize backup service'),
      });
    });

    test('checkAutoBackup returns true when service is already initialized', async () => {
      await backupService.initialize();
      const result = await backupService.checkAutoBackup();
      expect(result).toBe(true);
    });

    test('checkAutoBackup safely handles initialization failures', async () => {
      // Mock makeDirectory to fail initially
      FileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await backupService.checkAutoBackup();

      // Should return false but not throw
      expect(result).toBe(false);
    });

    test('checkAutoBackup attempts to schedule auto-backup on initialization failure', async () => {
      // Mock initialization to fail but allow scheduling
      FileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      // Spy on the private method
      const scheduleSpy = jest.spyOn(backupService, '_scheduleAutoBackup').mockResolvedValueOnce();

      const result = await backupService.checkAutoBackup();

      expect(scheduleSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('createBackup', () => {
    test('creates a backup with default options', async () => {
      const backupPath = await backupService.createBackup();

      expect(backupPath).toMatch(/crm-backup-.*\.json/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('/backups/crm-backup-'),
        expect.any(String)
      );
    });

    test('creates a backup with custom filename', async () => {
      const backupPath = await backupService.createBackup({
        filename: 'custom-backup.json'
      });

      expect(backupPath).toContain('custom-backup.json');
    });

    test('uses progress callback during backup', async () => {
      const onProgress = jest.fn();
      await backupService.createBackup({ onProgress });

      // Verify onProgress was called at least twice (start and complete)
      expect(onProgress).toHaveBeenCalled();

      // Verify initial progress call
      expect(onProgress.mock.calls[0][0]).toEqual({
        stage: 'starting',
        progress: 0,
      });

      // Verify final progress call
      const lastCallIndex = onProgress.mock.calls.length - 1;
      expect(onProgress.mock.calls[lastCallIndex][0]).toEqual({
        stage: 'complete',
        progress: 100,
      });
    });

    test('prevents multiple simultaneous backups', async () => {
      const firstBackup = backupService.createBackup();
      await expect(backupService.createBackup()).rejects.toMatchObject({
        code: 'BACKUP_IN_PROGRESS',
      });

      await firstBackup; // Resolve the first backup
    });

    test('handles backup table export errors', async () => {
      // Mock one table to fail
      db.categories.getAll.mockRejectedValueOnce(new Error('Database error'));

      const backupPath = await backupService.createBackup();

      // Verify the backup still works, with the failed table being skipped
      expect(backupPath).toMatch(/crm-backup-.*\.json/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"categories": []')
      );
    });

    test('requires authentication for backup operations', async () => {
      // Mock the user as locked (not authenticated)
      authService.checkIsLocked.mockResolvedValueOnce(true);

      await expect(backupService.createBackup()).rejects.toMatchObject({
        code: 'BACKUP_AUTH_REQUIRED',
        message: expect.stringContaining('Authentication required for backup operations'),
      });
    });

    test('allows backup operations when requireAuth is false', async () => {
      // Mock the user as locked (not authenticated)
      authService.checkIsLocked.mockResolvedValueOnce(true);

      // Should still work when requireAuth=false
      const backupPath = await backupService.createBackup({ requireAuth: false });
      expect(backupPath).toMatch(/crm-backup-.*\.json/);
    });
  });

  describe('exportToCSV', () => {
    test('exports full database to CSV', async () => {
      const csvPath = await backupService.exportToCSV();

      expect(csvPath).toMatch(/crm-export-full-.*\.csv/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('categories')
      );
    });

    test('exports specific table to CSV', async () => {
      const csvPath = await backupService.exportToCSV({ table: 'contacts' });

      expect(csvPath).toMatch(/crm-export-contacts-.*\.csv/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('id,name')
      );
    });

    test('handles CSV export errors', async () => {
      // Mock database query to fail
      db.contacts.getAll.mockRejectedValueOnce(new Error('Database error'));

      await expect(backupService.exportToCSV()).rejects.toMatchObject({
        code: 'CSV_EXPORT_ERROR',
      });
    });
  });

  describe('importBackup', () => {
    const mockBackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tables: {
        contacts: [{ id: 1, name: 'Imported Contact' }],
        companies: [{ id: 1, name: 'Imported Company' }],
      },
    };

    beforeEach(() => {
      FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockBackupData));
    });

    test('imports backup with default options', async () => {
      const onProgress = jest.fn();
      const result = await backupService.importBackup('/path/to/backup.json', { onProgress });

      expect(result.imported.contacts).toBe(1);
      expect(result.imported.companies).toBe(1);
      expect(result.totalRecords).toBe(2);

      // Verify progress callback
      expect(onProgress.mock.calls[0][0]).toEqual({
        stage: 'reading',
        progress: 0,
      });
      expect(onProgress.mock.calls[1][0]).toEqual({
        stage: 'validating',
        progress: 10,
      });
      expect(onProgress.mock.calls[onProgress.mock.calls.length - 1][0]).toEqual({
        stage: 'complete',
        progress: 100,
      });
    });

    test('imports specific tables', async () => {
      const result = await backupService.importBackup('/path/to/backup.json', {
        tablesToImport: ['contacts'],
      });

      expect(result.imported.contacts).toBe(1);
      expect(result.imported.companies).toBeUndefined();
    });

    test('imports with overwrite option', async () => {
      const result = await backupService.importBackup('/path/to/backup.json', {
        overwrite: true,
      });

      expect(result.imported.contacts).toBe(1);
      expect(result.imported.companies).toBe(1);
    });

    test('handles backup format validation errors', async () => {
      FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify({
        // Invalid backup missing required fields
        tables: {}
      }));

      await expect(backupService.importBackup('/path/to/backup.json')).rejects.toMatchObject({
        code: 'INVALID_BACKUP_FORMAT',
      });
    });
  });

  describe('listBackups', () => {
    test('lists backup files sorted by creation time', async () => {
      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].filename).toBe('backup-2.json');
      expect(backups[1].filename).toBe('backup-1.json');
    });

    test('handles listing backup errors', async () => {
      FileSystem.readDirectoryAsync.mockRejectedValueOnce(new Error('Read error'));

      await expect(backupService.listBackups()).rejects.toMatchObject({
        code: 'BACKUP_LIST_ERROR',
      });
    });
  });

  describe('deleteBackup', () => {
    test('deletes a specific backup', async () => {
      await backupService.deleteBackup('backup-1.json');

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${documentDirectory}backups/backup-1.json`
      );
    });

    test('handles backup deletion errors', async () => {
      FileSystem.deleteAsync.mockRejectedValueOnce(new Error('Delete error'));

      await expect(backupService.deleteBackup('backup-1.json')).rejects.toMatchObject({
        code: 'BACKUP_DELETE_ERROR',
      });
    });
  });

  describe('shareBackup', () => {
    test('shares a backup file', async () => {
      await backupService.shareBackup('/path/to/backup.json');

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith('/path/to/backup.json');
    });

    test('handles sharing not available', async () => {
      Sharing.isAvailableAsync.mockResolvedValueOnce(false);

      await expect(backupService.shareBackup('/path/to/backup.json')).rejects.toMatchObject({
        code: 'SHARING_NOT_AVAILABLE',
      });
    });
  });

  describe('configureAutoBackup', () => {
    test('enables auto-backup with default interval', async () => {
      await backupService.configureAutoBackup({
        enabled: true,
        intervalHours: 24,
        maxBackups: 10,
      });

      expect(db.settings.setSetting).toHaveBeenCalledWith('backup.auto_enabled', true);
      expect(db.settings.setSetting).toHaveBeenCalledWith('backup.interval_hours', 24);
      expect(db.settings.setSetting).toHaveBeenCalledWith('backup.max_backups', 10);
    });

    test('disables auto-backup', async () => {
      await backupService.configureAutoBackup({
        enabled: false,
        intervalHours: 24,
        maxBackups: 10,
      });

      expect(db.settings.setSetting).toHaveBeenCalledWith('backup.auto_enabled', false);
    });

    test('handles auto-backup configuration errors', async () => {
      db.settings.setSetting.mockRejectedValueOnce(new Error('Settings error'));

      await expect(backupService.configureAutoBackup({
        enabled: true,
        intervalHours: 24,
        maxBackups: 10,
      })).rejects.toMatchObject({
        code: 'AUTO_BACKUP_CONFIG_ERROR',
      });
    });
  });

  // Private method tests with implementation-aware checks
  describe('private methods', () => {
    test('_cleanupOldBackups removes old backup files', async () => {
      // Mock backup files with different creation times
      const now = Date.now();
      FileSystem.getInfoAsync
        .mockResolvedValueOnce({ size: 1024, modificationTime: (now - 40 * 24 * 60 * 60 * 1000) / 1000 }) // 40 days old
        .mockResolvedValueOnce({ size: 1024, modificationTime: (now - 10 * 24 * 60 * 60 * 1000) / 1000 }); // 10 days old

      // Create more than 10 backup files to trigger max backup count cleanup
      FileSystem.readDirectoryAsync.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => `backup-${i}.json`)
      );

      // Spy on deleteBackup method
      const deleteBackupSpy = jest.spyOn(backupService, 'deleteBackup');

      // Call private cleanup method via createBackup which should trigger it
      await backupService.createBackup();

      // Verify that old and excess backups were deleted
      expect(deleteBackupSpy).toHaveBeenCalledTimes(5); // 40-day old + excess backup files
    });

    test('_validateBackup rejects invalid backup format', async () => {
      const invalidBackups = [
        { version: null },
        { version: '1.0.0', tables: null },
        {},
      ];

      for (const invalidBackup of invalidBackups) {
        await expect(
          backupService['_validateBackup'](invalidBackup)
        ).rejects.toMatchObject({
          code: 'INVALID_BACKUP_FORMAT',
        });
      }
    });
  });
});