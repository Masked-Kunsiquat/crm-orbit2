// Mock database export function for BackupService tests
const MOCK_TABLE_DATA = {
  categories: [{ id: 1, name: 'Test Category' }],
  companies: [{ id: 1, name: 'Test Company' }],
  contacts: [{ id: 1, name: 'Test Contact' }],
  contact_info: [{ id: 1, contact_id: 1, type: 'email', value: 'test@example.com' }],
  attachments: [{ id: 1, filename: 'test.txt', file_path: '/path/to/test.txt' }],
  events: [{ id: 1, title: 'Test Event' }],
  events_recurring: [{ id: 1, title: 'Test Recurring Event', recurring: 1 }],
  events_reminders: [{ id: 1, event_id: 1, reminder_type: 'notification' }],
  interactions: [{ id: 1, title: 'Test Interaction' }],
  notes: [{ id: 1, text: 'Test Note' }],
  category_relations: [{ category_id: 1, contact_id: 1 }],
  settings: [{ category: 'backup', key: 'auto_enabled', value: false }]
};

module.exports = async (tableName, includeAttachments = false) => {
  // If table doesn't exist, throw an error
  if (!MOCK_TABLE_DATA.hasOwnProperty(tableName)) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  // Special handling for contact_info
  if (tableName === 'contact_info') {
    return MOCK_TABLE_DATA[tableName];
  }

  // Special handling for attachments to support includeAttachments flag
  if (tableName === 'attachments' && includeAttachments) {
    return MOCK_TABLE_DATA[tableName].map(attachment => ({
      ...attachment,
      file_data: 'base64_encoded_file_content'
    }));
  }

  return MOCK_TABLE_DATA[tableName];
};