// Mock database module for BackupCsvExporter tests
const mockTables = {
  categories: [{ id: 1, name: 'Test Category' }],
  companies: [{ id: 1, name: 'Test Company' }],
  contacts: [{ id: 1, name: 'Test Contact' }],
  contactsInfo: {
    getWithContactInfo: jest.fn(async contactId => ({
      id: contactId,
      contact_info: [{ id: 1, type: 'email', value: 'test@example.com' }],
    })),
  },
  events: [{ id: 1, title: 'Test Event' }],
  interactions: [{ id: 1, type: 'meeting', notes: 'Test Interaction' }],
  notes: [{ id: 1, text: 'Test Note' }],
  attachments: [
    { id: 1, filename: 'test.txt', file_path: '/path/to/test.txt' },
  ],
  settings: [{ category: 'backup', key: 'auto_enabled', value: false }],
};

// Create a mock function to export table data for BackupCsvExporter
const mockExportTable = async tableName => {
  const table = mockTables[tableName];
  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  return table;
};

module.exports = {
  ...mockTables,
  transaction: jest.fn(async callback => {
    const mockTx = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };
    return await callback(mockTx);
  }),
  getAll: jest.fn(async tableName => mockTables[tableName] || []),
  _exportTable: mockExportTable,
};
