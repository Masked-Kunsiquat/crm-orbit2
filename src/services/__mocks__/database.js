// Jest mock for the unified database API used by services

const mockDb = {
  attachments: {
    create: jest.fn(async (data) => ({ id: 1, ...data })),
    getById: jest.fn(async () => null),
    delete: jest.fn(async () => ({ success: true })),
    getAll: jest.fn(async () => []),
    cleanupOrphaned: jest.fn(async () => ({ success: true, deletedCount: 0 })),
    getTotalSize: jest.fn(async () => 0),
  },
  events: {
    getById: jest.fn(async () => null),
    getRecurringEvents: jest.fn(async () => []),
  },
  eventsReminders: {
    getUnsentRemindersByEvent: jest.fn(async () => []),
    getUnsentReminders: jest.fn(async () => []),
    markReminderSent: jest.fn(async () => ({ success: true })),
  },
  settings: {
    getValue: jest.fn(async () => null),
  },
};

module.exports = mockDb;
module.exports.default = mockDb; // Support both ESM/CJS import styles in tests

