// Mock for backup constants
module.exports = {
  BACKUP_TABLES: [
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
    'settings',
  ],
  BACKUP_CONFIG: {
    BACKUP_DIR: '/test/directory/backups/',
    MAX_BACKUP_AGE_DAYS: 30,
    MAX_BACKUP_COUNT: 10,
    AUTO_BACKUP_INTERVAL_HOURS: 24,
    BACKUP_VERSION: '1.0.0',
  },
  BACKUP_ERROR_CODES: {
    INIT_ERROR: 'BACKUP_INIT_ERROR',
    IN_PROGRESS: 'BACKUP_IN_PROGRESS',
    CREATE_ERROR: 'BACKUP_CREATE_ERROR',
    AUTH_REQUIRED: 'BACKUP_AUTH_REQUIRED',
    CSV_EXPORT_ERROR: 'CSV_EXPORT_ERROR',
    INVALID_FORMAT: 'INVALID_BACKUP_FORMAT',
    SHARING_NOT_AVAILABLE: 'SHARING_NOT_AVAILABLE',
    SHARE_ERROR: 'BACKUP_SHARE_ERROR',
  },
  buildServiceError: jest.fn((service, operation, error, code, metadata) => {
    const serviceError = new Error(error);
    serviceError.name = 'ServiceError';
    serviceError.service = service;
    serviceError.operation = operation;
    serviceError.code = code;
    serviceError.metadata = metadata;
    return serviceError;
  }),
};
