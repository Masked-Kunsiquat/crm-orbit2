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
    updateReminderDateTime: jest.fn(async (id, datetime) => {
      // Simulate proper datetime formatting like the real implementation
      let formattedDateTime = datetime;
      if (datetime instanceof Date) {
        formattedDateTime = datetime.toISOString();
      } else if (typeof datetime === 'string') {
        // Parse and reformat to simulate SQLite format handling
        const parsed = new Date(datetime);
        formattedDateTime = parsed.toISOString();
      }
      return { id, reminder_datetime: formattedDateTime };
    }),
    markRemindersScheduled: jest.fn(async (items) => items.length),
    markRemindersFailed: jest.fn(async (ids) => ids.length),
    createRecurringReminders: jest.fn(async (data) => data.map((d, i) => ({ id: i + 1, ...d }))),
  },
  settings: {
    getValue: jest.fn(async () => null),
    getValues: jest.fn(async (category, keys) => {
      // Return an object with null values for all requested keys
      const result = {};
      const normalizedKeys = keys.map(k => typeof k === 'string' ? k : k.key);
      normalizedKeys.forEach(key => {
        result[key] = null;
      });
      return result;
    }),
  },
  // Mock transaction method
  transaction: jest.fn(async (callback) => {
    const mockTx = {
      execute: jest.fn(async (sql, params) => ({
        rows: [],
        rowsAffected: 0,
        insertId: null
      }))
    };
    return await callback(mockTx);
  }),
};

module.exports = mockDb;
module.exports.default = mockDb; // Support both ESM/CJS import styles in tests

