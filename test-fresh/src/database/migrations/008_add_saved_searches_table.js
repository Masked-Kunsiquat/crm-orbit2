// Migration 008: Add saved_searches table
// Allows users to save filter combinations for quick access

export default {
  version: 8,
  name: 'add_saved_searches_table',

  async up(db) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('contacts', 'interactions', 'events')),
        filters TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Create index on entity_type for faster lookups
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_entity_type
      ON saved_searches(entity_type);
    `);
  },

  async down(db) {
    await db.execAsync('DROP INDEX IF EXISTS idx_saved_searches_entity_type;');
    await db.execAsync('DROP TABLE IF EXISTS saved_searches;');
  },
};
