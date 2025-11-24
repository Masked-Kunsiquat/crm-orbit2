/**
 * Migration 002: Add contact_type field to contacts table
 *
 * Adds a new optional contact_type field to support relationship categorization
 * for proximity scoring calculations.
 *
 * **Valid Values**:
 * - 'best_friend' - Closest personal relationships
 * - 'family' - Family members
 * - 'close_friend' - Close personal friends
 * - 'friend' - Regular friends
 * - 'colleague' - Work relationships
 * - 'acquaintance' - Light connections
 * - 'other' - Miscellaneous
 * - NULL - Not specified (default)
 *
 * **Proximity Score Weights**:
 * - best_friend/family: 100 points
 * - close_friend: 80 points
 * - friend: 60 points
 * - colleague: 40 points
 * - acquaintance: 20 points
 * - other: 10 points
 * - null: 0 points (neutral - relies on interactions only)
 */

export default {
  version: 2,
  name: 'add_contact_type',

  async up(ctx) {
    const { execute } = ctx;

    // Add contact_type column to contacts table
    // SQLite supports ADD COLUMN directly (no need for recreateTable)
    await execute(`
      ALTER TABLE contacts
      ADD COLUMN contact_type TEXT DEFAULT NULL;
    `);

    // Add index for performance on filtering by contact_type
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_contact_type
      ON contacts(contact_type);
    `);
  },

  async down(ctx) {
    const { execute } = ctx;
    const { recreateTable, getTableSchema } = await import('./_helpers.js');

    // SQLite doesn't support DROP COLUMN, so we need to recreate the table
    const indexes = await getTableSchema(ctx, 'contacts', 'index');
    const triggers = await getTableSchema(ctx, 'contacts', 'trigger');

    // Preserve indexes and triggers (excluding the one we added)
    const indexSQL = indexes
      .filter(idx => idx.name !== 'idx_contacts_contact_type')
      .map(idx => idx.sql);
    const triggerSQL = triggers.map(t => t.sql);

    await recreateTable(ctx, {
      tableName: 'contacts',
      newTableSQL: `
        CREATE TABLE contacts (
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
      `,
      dataMigrationSQL: `
        INSERT INTO contacts (
          id, first_name, last_name, middle_name, display_name,
          avatar_uri, avatar_attachment_id, company_id, job_title,
          is_favorite, last_interaction_at, created_at, updated_at
        )
        SELECT
          id, first_name, last_name, middle_name, display_name,
          avatar_uri, avatar_attachment_id, company_id, job_title,
          is_favorite, last_interaction_at, created_at, updated_at
        FROM contacts
      `,
      recreateIndexes: indexSQL,
      recreateTriggers: triggerSQL,
    });
  },
};
