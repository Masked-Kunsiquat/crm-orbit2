// Database initialization service
import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return true;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('Initializing database...');
      
      // Open database connection
      this.db = await SQLite.openDatabaseAsync('crm.db');

      // Set recommended pragmas for better reliability and performance
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      await this.db.execAsync('PRAGMA synchronous = NORMAL;');
      // Enable foreign key constraints
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Create tables (minimal schema for now)
      await this._createTables();
      
      console.log('Database initialized successfully');
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  async _createTables() {
    const createTableStatements = [
      // Contacts table
      `CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        middle_name TEXT,
        display_name TEXT,
        avatar_uri TEXT,
        company_id INTEGER,
        job_title TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        last_interaction_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // Contact info table
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
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#007AFF',
        icon TEXT DEFAULT 'folder',
        is_system BOOLEAN DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // Contact categories junction table
      `CREATE TABLE IF NOT EXISTS contact_categories (
        contact_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (contact_id, category_id),
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      );`,
      
      // Notes table
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
      
      // Events table
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
      );`,
      
      // Event reminders table
      `CREATE TABLE IF NOT EXISTS event_reminders (
        id INTEGER PRIMARY KEY,
        event_id INTEGER NOT NULL,
        reminder_datetime DATETIME NOT NULL,
        reminder_type TEXT DEFAULT 'notification',
        is_sent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
      );`,
      
      // Interactions table
      `CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY,
        contact_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        channel TEXT,
        content TEXT,
        interaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
      );`,
      
      // Companies table
      `CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        industry TEXT,
        website TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // Attachments table
      `CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','note','event','interaction')),
        entity_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        thumbnail_path TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        category TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        value TEXT,
        data_type TEXT DEFAULT 'string',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, setting_key)
      );`
    ];

    // Create indexes
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_contacts_last_first ON contacts(last_name, first_name);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_contact_info_contact ON contact_info(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_contact_info_primary ON contact_info(contact_id, type, is_primary);',
      'CREATE INDEX IF NOT EXISTS idx_contact_categories_contact ON contact_categories(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_contact_categories_category ON contact_categories(category_id);',
      'CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);',
      'CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);'
    ];

    // Create triggers to auto-update updated_at columns
    const triggerStatements = [
      `CREATE TRIGGER IF NOT EXISTS update_contacts_updated_at
       AFTER UPDATE ON contacts
       FOR EACH ROW
       BEGIN
         UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END;`,

      `CREATE TRIGGER IF NOT EXISTS update_notes_updated_at
       AFTER UPDATE ON notes
       FOR EACH ROW
       BEGIN
         UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END;`,

      `CREATE TRIGGER IF NOT EXISTS update_events_updated_at
       AFTER UPDATE ON events
       FOR EACH ROW
       BEGIN
         UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END;`,

      `CREATE TRIGGER IF NOT EXISTS update_companies_updated_at
       AFTER UPDATE ON companies
       FOR EACH ROW
       BEGIN
         UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END;`,

      `CREATE TRIGGER IF NOT EXISTS update_settings_updated_at
       AFTER UPDATE ON settings
       FOR EACH ROW
       BEGIN
         UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END;`
    ];

    // Execute all DDL statements in a single transaction for atomicity
    try {
      await this.db.execAsync('BEGIN TRANSACTION;');

      // Execute all table creation statements
      for (const statement of createTableStatements) {
        await this.db.execAsync(statement);
      }

      // Execute all index creation statements
      for (const statement of indexStatements) {
        await this.db.execAsync(statement);
      }

      // Execute all trigger creation statements
      for (const statement of triggerStatements) {
        await this.db.execAsync(statement);
      }

      await this.db.execAsync('COMMIT;');
    } catch (error) {
      // Rollback transaction on any error to maintain database consistency
      try {
        await this.db.execAsync('ROLLBACK;');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }

      console.error('Error creating database schema:', error);
      throw error;
    }
  }

  getDatabase() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  isReady() {
    return this.isInitialized;
  }

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;