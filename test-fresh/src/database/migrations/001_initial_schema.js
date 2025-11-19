/**
 * Migration 001: Consolidated Initial Schema
 *
 * This migration combines the original schema (simpleSetup.js) with all
 * enhancements from migrations 002-008, creating a single baseline for
 * fresh database installations.
 *
 * **Included Components**:
 * - Core tables: attachments, companies, contacts, contact_info, categories, contact_categories
 * - Activity tables: interactions, events, event_reminders, notes
 * - Configuration: user_preferences, saved_searches
 * - Full-text search: interactions_search (FTS5 virtual table with triggers)
 * - Performance indexes: composite indexes on foreign keys and datetime fields
 * - Triggers: display_name auto-computation, updated_at auto-update, FTS sync
 * - Seed data: default categories (Friends, Family, Work, Acquaintances, Clients)
 *
 * **Schema Features**:
 * - TEXT for datetime fields (YYYY-MM-DD HH:MM:SS format)
 * - INTEGER for booleans (0/1)
 * - AUTOINCREMENT primary keys
 * - Foreign key constraints with cascading actions
 * - Default values for timestamps and flags
 *
 * **Version History**:
 * - v1: Consolidated from simpleSetup.js + migrations 002-008
 */

export default {
  version: 1,
  name: 'initial_schema',

  async up(ctx) {
    const { execute } = ctx;

    // ============================================================================
    // PART 1: Core Tables (from simpleSetup.js)
    // ============================================================================

    // Attachments table - stores file data as base64
    await execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        data TEXT,
        thumbnail_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Companies table
    await execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        address TEXT,
        notes TEXT,
        logo_attachment_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (logo_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
      );
    `);

    // Contacts table with display_name and avatar_attachment_id (migrations 004 + 005)
    await execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT,
        company_id INTEGER,
        is_favorite INTEGER DEFAULT 0,
        display_name TEXT,
        avatar_attachment_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (avatar_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
      );
    `);

    // Contact info table (phones, emails, addresses)
    await execute(`
      CREATE TABLE IF NOT EXISTS contact_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('phone','email','address')),
        value TEXT NOT NULL,
        label TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Categories table
    await execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Contact-Category junction table
    await execute(`
      CREATE TABLE IF NOT EXISTS contact_categories (
        contact_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        PRIMARY KEY (contact_id, category_id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    // User preferences table
    await execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        data_type TEXT DEFAULT 'string',
        is_enabled INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE (category, setting_key)
      );
    `);

    // Interactions table with updated_at (migration 007)
    await execute(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        interaction_datetime TEXT NOT NULL,
        title TEXT,
        note TEXT,
        interaction_type TEXT CHECK(interaction_type IN ('call','text','email','meeting','other')),
        custom_type TEXT,
        duration INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Events table with recurring fields and updated_at (migration 007)
    await execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        event_time TEXT,
        location TEXT,
        all_day INTEGER DEFAULT 0,
        recurring INTEGER DEFAULT 0,
        recurrence_pattern TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Event reminders table with updated_at (migration 006)
    await execute(`
      CREATE TABLE IF NOT EXISTS event_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        reminder_time TEXT NOT NULL,
        is_sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `);

    // ============================================================================
    // PART 2: Additional Tables (from database modules not in simpleSetup.js)
    // ============================================================================

    // Notes table (from notes.js module)
    await execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        title TEXT,
        content TEXT NOT NULL,
        is_pinned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Saved searches table (migration 008)
    await execute(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('contacts', 'interactions', 'events')),
        filters TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // ============================================================================
    // PART 3: Performance Indexes (migration 003)
    // ============================================================================

    // Contacts indexes
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_company
      ON contacts(company_id) WHERE company_id IS NOT NULL;
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_favorite
      ON contacts(is_favorite) WHERE is_favorite = 1;
    `);

    // Display name index with case-insensitive collation (migration 004)
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_display_name
      ON contacts(display_name COLLATE NOCASE);
    `);

    // Avatar attachment index (migration 005)
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_avatar_attachment
      ON contacts(avatar_attachment_id) WHERE avatar_attachment_id IS NOT NULL;
    `);

    // Contact info indexes
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contact_info_contact
      ON contact_info(contact_id);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contact_info_type
      ON contact_info(type);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contact_info_primary
      ON contact_info(contact_id, is_primary) WHERE is_primary = 1;
    `);

    // Interaction indexes (migration 003)
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_contact_datetime
      ON interactions(contact_id, interaction_datetime DESC);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_datetime_desc
      ON interactions(interaction_datetime DESC);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_type_datetime
      ON interactions(interaction_type, interaction_datetime DESC)
      WHERE interaction_type IS NOT NULL;
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_interactions_custom_type_datetime
      ON interactions(custom_type, interaction_datetime DESC)
      WHERE custom_type IS NOT NULL;
    `);

    // Events indexes
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_contact
      ON events(contact_id);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_date
      ON events(event_date);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_events_recurring
      ON events(recurring) WHERE recurring = 1;
    `);

    // Event reminders index
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_event_reminders_event
      ON event_reminders(event_id);
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_event_reminders_time
      ON event_reminders(reminder_time, is_sent);
    `);

    // Notes indexes
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_notes_contact
      ON notes(contact_id) WHERE contact_id IS NOT NULL;
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_notes_pinned
      ON notes(is_pinned) WHERE is_pinned = 1;
    `);

    // Saved searches index (migration 008)
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_entity_type
      ON saved_searches(entity_type);
    `);

    // ============================================================================
    // PART 4: Full-Text Search (migration 003)
    // ============================================================================

    // Create FTS5 virtual table for interactions search (optional, skip if FTS5 not available)
    try {
      await execute(`
        CREATE VIRTUAL TABLE IF NOT EXISTS interactions_search USING fts5(
          interaction_id UNINDEXED,
          title,
          note,
          content='',
          tokenize='porter unicode61'
        );
      `);

      // Trigger to keep FTS table in sync on INSERT
      await execute(`
        CREATE TRIGGER IF NOT EXISTS interactions_search_insert
        AFTER INSERT ON interactions
        BEGIN
          INSERT INTO interactions_search(interaction_id, title, note)
          VALUES (NEW.id, NEW.title, NEW.note);
        END;
      `);

      // Trigger to keep FTS table in sync on UPDATE
      await execute(`
        CREATE TRIGGER IF NOT EXISTS interactions_search_update
        AFTER UPDATE ON interactions
        BEGIN
          UPDATE interactions_search
          SET title = NEW.title, note = NEW.note
          WHERE interaction_id = NEW.id;
        END;
      `);

      // Trigger to keep FTS table in sync on DELETE
      await execute(`
        CREATE TRIGGER IF NOT EXISTS interactions_search_delete
        AFTER DELETE ON interactions
        BEGIN
          DELETE FROM interactions_search WHERE interaction_id = OLD.id;
        END;
      `);

      console.log('[Migration 001] FTS5 full-text search enabled for interactions');
    } catch (error) {
      console.warn('[Migration 001] FTS5 not available, skipping full-text search setup:', error.message);
    }

    // ============================================================================
    // PART 5: Triggers (migrations 004, 007)
    // ============================================================================

    // Display name triggers (migration 004)
    await execute(`
      CREATE TRIGGER IF NOT EXISTS contacts_display_name_insert
      AFTER INSERT ON contacts
      FOR EACH ROW
      BEGIN
        UPDATE contacts
        SET display_name = CASE
          WHEN TRIM(
            REPLACE(
              REPLACE(
                REPLACE(
                  TRIM(
                    COALESCE(TRIM(NEW.first_name), '') || ' ' ||
                    COALESCE(NULLIF(TRIM(NEW.middle_name), ''), '') || ' ' ||
                    COALESCE(TRIM(NEW.last_name), '')
                  ),
                  '  ', ' '
                ),
                '  ', ' '
              ),
              '  ', ' '
            )
          ) = '' THEN 'Unnamed Contact'
          ELSE TRIM(
            REPLACE(
              REPLACE(
                REPLACE(
                  TRIM(
                    COALESCE(TRIM(NEW.first_name), '') || ' ' ||
                    COALESCE(NULLIF(TRIM(NEW.middle_name), ''), '') || ' ' ||
                    COALESCE(TRIM(NEW.last_name), '')
                  ),
                  '  ', ' '
                ),
                '  ', ' '
              ),
              '  ', ' '
            )
          )
        END
        WHERE id = NEW.id;
      END;
    `);

    await execute(`
      CREATE TRIGGER IF NOT EXISTS contacts_display_name_update
      AFTER UPDATE OF first_name, middle_name, last_name ON contacts
      FOR EACH ROW
      BEGIN
        UPDATE contacts
        SET display_name = CASE
          WHEN TRIM(
            REPLACE(
              REPLACE(
                REPLACE(
                  TRIM(
                    COALESCE(TRIM(NEW.first_name), '') || ' ' ||
                    COALESCE(NULLIF(TRIM(NEW.middle_name), ''), '') || ' ' ||
                    COALESCE(TRIM(NEW.last_name), '')
                  ),
                  '  ', ' '
                ),
                '  ', ' '
              ),
              '  ', ' '
            )
          ) = '' THEN 'Unnamed Contact'
          ELSE TRIM(
            REPLACE(
              REPLACE(
                REPLACE(
                  TRIM(
                    COALESCE(TRIM(NEW.first_name), '') || ' ' ||
                    COALESCE(NULLIF(TRIM(NEW.middle_name), ''), '') || ' ' ||
                    COALESCE(TRIM(NEW.last_name), '')
                  ),
                  '  ', ' '
                ),
                '  ', ' '
              ),
              '  ', ' '
            )
          )
        END
        WHERE id = NEW.id;
      END;
    `);

    // Updated_at triggers (migration 007)
    await execute(`
      CREATE TRIGGER IF NOT EXISTS trg_events_updated_at
      AFTER UPDATE ON events
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    await execute(`
      CREATE TRIGGER IF NOT EXISTS trg_interactions_updated_at
      AFTER UPDATE ON interactions
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE interactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // ============================================================================
    // PART 6: Seed Data (migration 002)
    // ============================================================================

    // Seed default categories
    await execute(`
      INSERT OR IGNORE INTO categories (name, color, icon, is_system)
      VALUES
        ('Friends', '#4CAF50', 'account-group', 1),
        ('Family', '#2196F3', 'home-heart', 1),
        ('Work', '#FF9800', 'briefcase', 1),
        ('Acquaintances', '#9E9E9E', 'account-multiple', 1),
        ('Clients', '#673AB7', 'domain', 1);
    `);

    console.log('[Migration 001] Initial schema created successfully with all features');
  },

  async down(ctx) {
    const { execute } = ctx;

    // Drop all tables in reverse dependency order
    await execute('DROP TABLE IF EXISTS interactions_search;');
    await execute('DROP TABLE IF EXISTS saved_searches;');
    await execute('DROP TABLE IF EXISTS notes;');
    await execute('DROP TABLE IF EXISTS event_reminders;');
    await execute('DROP TABLE IF EXISTS events;');
    await execute('DROP TABLE IF EXISTS interactions;');
    await execute('DROP TABLE IF EXISTS contact_categories;');
    await execute('DROP TABLE IF EXISTS contact_info;');
    await execute('DROP TABLE IF EXISTS contacts;');
    await execute('DROP TABLE IF EXISTS categories;');
    await execute('DROP TABLE IF EXISTS user_preferences;');
    await execute('DROP TABLE IF EXISTS companies;');
    await execute('DROP TABLE IF EXISTS attachments;');

    console.log('[Migration 001] Schema rolled back successfully');
  },
};
