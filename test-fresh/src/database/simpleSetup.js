import { execute } from './index';

export async function createBasicTables() {
  console.log('Creating basic database tables...');

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
        console.log('Adding description column to attachments table...');
        await execute('ALTER TABLE attachments ADD COLUMN description TEXT;');
      }
    } catch (error) {
      console.warn('Error checking/adding description column:', error);
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
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (avatar_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
      )
    `);

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

    // Seed default categories
    await seedDefaultCategories();

    console.log('Basic database tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating basic tables:', error);
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
      console.log('Categories already seeded, skipping...');
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

    console.log('Default categories seeded successfully');
  } catch (error) {
    console.error('Error seeding default categories:', error);
    // Don't throw - allow setup to continue even if seeding fails
  }
}
