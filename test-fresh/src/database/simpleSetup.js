import { execute } from './index';
import { logger } from '../errors/utils/errorLogger';

export async function createBasicTables() {
  logger.info('simpleSetup', 'Creating basic database tables');

  try {
    // Create attachments table first (referenced by contacts for avatars)
    await execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER,
        thumbnail_path TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add description column if it doesn't exist (for existing databases)
    try {
      const tableInfo = await execute('PRAGMA table_info(attachments);');
      const hasDescriptionColumn = tableInfo.rows.some(col => col.name === 'description');
      if (!hasDescriptionColumn) {
        logger.info('simpleSetup', 'Adding description column to attachments table');
        await execute('ALTER TABLE attachments ADD COLUMN description TEXT;');
      }
    } catch (error) {
      logger.warn('simpleSetup', 'Error checking/adding description column', { error: error.message });
    }

    // Create companies table (referenced by contacts)
    await execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        website TEXT,
        industry TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contacts table
    await execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT,
        middle_name TEXT,
        display_name TEXT,
        avatar_uri TEXT,
        avatar_attachment_id INTEGER,
        company_id INTEGER,
        job_title TEXT,
        is_favorite INTEGER DEFAULT 0,
        last_interaction_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (avatar_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
      )
    `);

    // Add avatar_attachment_id column if it doesn't exist (for existing databases)
    try {
      const contactsTableInfo = await execute('PRAGMA table_info(contacts);');
      const hasAvatarAttachmentId = contactsTableInfo.rows.some(col => col.name === 'avatar_attachment_id');
      if (!hasAvatarAttachmentId) {
        logger.info('simpleSetup', 'Adding avatar_attachment_id column to contacts table');
        await execute('ALTER TABLE contacts ADD COLUMN avatar_attachment_id INTEGER REFERENCES attachments(id) ON DELETE SET NULL;');
        logger.success('simpleSetup', 'avatar_attachment_id column added');
      }
    } catch (error) {
      logger.warn('simpleSetup', 'Error checking/adding avatar_attachment_id column', { error: error.message });
    }

    // Create contact_info table for phone, email, etc.
    await execute(`
      CREATE TABLE IF NOT EXISTS contact_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        label TEXT,
        value TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Create categories table (non-destructive)
    await execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#2196f3',
        icon TEXT,
        description TEXT,
        is_system INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contact_categories junction table (non-destructive)
    await execute(`
      CREATE TABLE IF NOT EXISTS contact_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(contact_id, category_id)
      )
    `);

    // Create user_preferences table (for app settings)
    await execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        data_type TEXT DEFAULT 'string',
        is_enabled INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (category, setting_key)
      )
    `);

    // Create interactions table
    await execute(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        interaction_datetime TEXT NOT NULL,
        title TEXT NOT NULL,
        note TEXT,
        interaction_type TEXT NOT NULL,
        custom_type TEXT,
        duration INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for interactions
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_contact
      ON interactions(contact_id)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_datetime
      ON interactions(interaction_datetime DESC)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_type
      ON interactions(interaction_type)
    `);

    // Create events table
    await execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_date TEXT NOT NULL,
        recurring INTEGER DEFAULT 0,
        recurrence_pattern TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Create event_reminders table
    await execute(`
      CREATE TABLE IF NOT EXISTS event_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        reminder_datetime TEXT NOT NULL,
        reminder_type TEXT DEFAULT 'notification',
        is_sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for events
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_contact
      ON events(contact_id)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_date
      ON events(event_date ASC)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_type
      ON events(event_type)
    `);

    // Seed default categories
    await seedDefaultCategories();

    logger.success('simpleSetup', 'Basic database tables created');
    return true;
  } catch (error) {
    logger.error('simpleSetup', 'createBasicTables', error);
    throw error;
  }
}

/**
 * Seed default contact categories if they don't exist.
 */
async function seedDefaultCategories() {
  try {
    // Check if categories already exist
    const existing = await execute('SELECT COUNT(*) as count FROM categories;');
    const count = existing.rows[0]?.count || 0;

    if (count > 0) {
      logger.info('simpleSetup', 'Categories already seeded, skipping');
      return;
    }

    // Define default categories
    const defaultCategories = [
      { name: 'Friends', color: '#4CAF50', icon: 'account-group', sort_order: 1 },
      { name: 'Family', color: '#E91E63', icon: 'home-heart', sort_order: 2 },
      { name: 'Work', color: '#2196F3', icon: 'briefcase', sort_order: 3 },
      { name: 'Acquaintances', color: '#FF9800', icon: 'account-multiple', sort_order: 4 },
      { name: 'Clients', color: '#9C27B0', icon: 'account-tie', sort_order: 5 },
    ];

    // Insert default categories
    for (const category of defaultCategories) {
      await execute(
        'INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?);',
        [category.name, category.color, category.icon, category.sort_order]
      );
    }

    logger.success('simpleSetup', 'Default categories seeded');
  } catch (error) {
    logger.error('simpleSetup', 'seedDefaultCategories', error);
    // Don't throw - allow setup to continue even if seeding fails
  }
}
