// Initial schema migration
// Follows the format outlined in migrations/AGENTS.md
// Exports: { version, up(dbOrCtx), down(dbOrCtx) }

import { getExec, runAll, runAllSequential } from './_helpers.js';

const CREATE_TABLES = [
  // 1. Attachments (must be created before companies due to foreign key)
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','note','event','interaction')),
    entity_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER CHECK (file_size >= 0),
    thumbnail_path TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  // 2. Companies (references attachments, must be created before contacts)
  `CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    address TEXT,
    notes TEXT,
    logo_attachment_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (logo_attachment_id) REFERENCES attachments (id) ON DELETE SET NULL
  );`,

  // 3. Contacts (references companies)
  `CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    middle_name TEXT,
    avatar_uri TEXT,
    company_id INTEGER,
    job_title TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    last_interaction_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
  );`,

  // 4. Contact Info
  `CREATE TABLE IF NOT EXISTS contact_info (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    subtype TEXT,
    value TEXT NOT NULL,
    label TEXT,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`,

  // 5. Events
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    recurring BOOLEAN DEFAULT 0,
    recurrence_pattern TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`,

  // 6. Event Reminders
  `CREATE TABLE IF NOT EXISTS event_reminders (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL,
    reminder_datetime DATETIME NOT NULL,
    reminder_type TEXT DEFAULT 'notification',
    is_sent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
  );`,

  // 7. Interactions
  `CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL,
    interaction_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    note TEXT,
    interaction_type TEXT NOT NULL,
    custom_type TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`,

  // 8. Notes
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER,
    title TEXT,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`,

  // 9. Categories
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#007AFF',
    icon TEXT DEFAULT 'folder',
    is_system BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  // 10. Contact-Categories (junction)
  `CREATE TABLE IF NOT EXISTS contact_categories (
    contact_id INTEGER,
    category_id INTEGER,
    PRIMARY KEY (contact_id, category_id),
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  );`,

  // 11. User Preferences
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    data_type TEXT DEFAULT 'string',
    is_enabled BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category, setting_key)
  );`,
];

const CREATE_INDEXES = [
  // Contacts
  `CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts (company_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts (last_name);`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_last_first ON contacts (last_name, first_name);`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts (is_favorite);`,

  // Contact Info
  `CREATE INDEX IF NOT EXISTS idx_contact_info_contact_id ON contact_info (contact_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_info_contact_type ON contact_info (contact_id, type);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_info_primary ON contact_info (contact_id, type, is_primary);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_info_contact_type_created_at ON contact_info (contact_id, type, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_info_value ON contact_info (value);`,

  // Events
  `CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events (contact_id);`,
  `CREATE INDEX IF NOT EXISTS idx_events_event_date ON events (event_date);`,

  // Event Reminders
  `CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders (event_id);`,
  `CREATE INDEX IF NOT EXISTS idx_event_reminders_datetime ON event_reminders (reminder_datetime);`,

  // Interactions
  `CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions (contact_id);`,

  // Notes
  `CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes (contact_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes (is_pinned);`,

  // Categories
  `CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_categories_sort_order_name ON categories (sort_order, name);`,

  // Contact-Categories
  `CREATE INDEX IF NOT EXISTS idx_contact_categories_category_id ON contact_categories (category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_categories_contact_id ON contact_categories (contact_id);`,

  // Attachments
  `CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments (entity_type, entity_id);`,

  // Companies
  `CREATE INDEX IF NOT EXISTS idx_companies_logo_attachment_id ON companies (logo_attachment_id);`,
  `CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);`,

  // User Preferences
  `CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences (category);`,
];

// Ensure updated_at stays fresh without app-side updates
const CREATE_TRIGGERS = [
  // Contacts updated_at
  `CREATE TRIGGER IF NOT EXISTS trg_contacts_updated_at
   AFTER UPDATE ON contacts
   FOR EACH ROW
   WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
   END;`,

  // Notes updated_at
  `CREATE TRIGGER IF NOT EXISTS trg_notes_updated_at
   AFTER UPDATE ON notes
   FOR EACH ROW
   WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
   END;`,

  // User Preferences updated_at
  `CREATE TRIGGER IF NOT EXISTS trg_user_preferences_updated_at
   AFTER UPDATE ON user_preferences
   FOR EACH ROW
   WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
   END;`,
];

const DROP_INDEXES = [
  // Drop in any order (SQLite drops with table too, but explicit for clarity)
  'DROP INDEX IF EXISTS idx_user_preferences_category;',
  'DROP INDEX IF EXISTS idx_companies_name;',
  'DROP INDEX IF EXISTS idx_companies_logo_attachment_id;',
  'DROP INDEX IF EXISTS idx_attachments_entity;',
  'DROP INDEX IF EXISTS idx_contact_categories_contact_id;',
  'DROP INDEX IF EXISTS idx_contact_categories_category_id;',
  'DROP INDEX IF EXISTS idx_categories_sort_order_name;',
  'DROP INDEX IF EXISTS idx_categories_sort_order;',
  'DROP INDEX IF EXISTS idx_notes_is_pinned;',
  'DROP INDEX IF EXISTS idx_notes_contact_id;',
  'DROP INDEX IF EXISTS idx_interactions_contact_id;',
  'DROP INDEX IF EXISTS idx_event_reminders_datetime;',
  'DROP INDEX IF EXISTS idx_event_reminders_event_id;',
  'DROP INDEX IF EXISTS idx_events_event_date;',
  'DROP INDEX IF EXISTS idx_events_contact_id;',
  'DROP INDEX IF EXISTS idx_contact_info_contact_type_created_at;',
  'DROP INDEX IF EXISTS idx_contact_info_primary;',
  'DROP INDEX IF EXISTS idx_contact_info_contact_type;',
  'DROP INDEX IF EXISTS idx_contact_info_value;',
  'DROP INDEX IF EXISTS idx_contact_info_contact_id;',
  'DROP INDEX IF EXISTS idx_contacts_is_favorite;',
  'DROP INDEX IF EXISTS idx_contacts_last_first;',
  'DROP INDEX IF EXISTS idx_contacts_last_name;',
  'DROP INDEX IF EXISTS idx_contacts_company_id;',
];

const DROP_TRIGGERS = [
  'DROP TRIGGER IF EXISTS trg_user_preferences_updated_at;',
  'DROP TRIGGER IF EXISTS trg_notes_updated_at;',
  'DROP TRIGGER IF EXISTS trg_contacts_updated_at;',
];

const DROP_TABLES_REVERSED = [
  // Reverse dependency order: drop referencing tables before referenced ones
  'DROP TABLE IF EXISTS user_preferences;',
  'DROP TABLE IF EXISTS contact_categories;',
  'DROP TABLE IF EXISTS notes;',
  'DROP TABLE IF EXISTS interactions;',
  'DROP TABLE IF EXISTS event_reminders;',
  'DROP TABLE IF EXISTS events;',
  'DROP TABLE IF EXISTS contact_info;',
  'DROP TABLE IF EXISTS contacts;',
  'DROP TABLE IF EXISTS categories;',
  'DROP TABLE IF EXISTS companies;',
  'DROP TABLE IF EXISTS attachments;',
];

export default {
  version: 1,
  name: '001_initial_schema',
  /**
   * Create all tables and indexes.
   * @param {any} dbOrCtx Migration context: expected to provide { batch, execute } helpers.
   */
  up: async dbOrCtx => {
    const exec = getExec(dbOrCtx);

    // Use sequential execution to avoid transaction visibility issues
    // Note: Transaction handling is done by the migration runner
    await runAllSequential(exec, CREATE_TABLES);

    // Then create indexes
    await runAllSequential(exec, CREATE_INDEXES);

    // Finally create triggers
    await runAllSequential(exec, CREATE_TRIGGERS);
  },

  /**
   * Drop all tables and indexes (reverse order where needed).
   * @param {any} dbOrCtx Migration context: expected to provide { batch, execute } helpers.
   */
  down: async dbOrCtx => {
    const exec = getExec(dbOrCtx);
    // Drop indexes explicitly (SQLite would drop with tables, but do it for clarity)
    await runAll(exec, DROP_INDEXES);
    // Drop triggers explicitly
    await runAll(exec, DROP_TRIGGERS);
    // Drop tables respecting dependencies
    await runAll(exec, DROP_TABLES_REVERSED);
  },
};
