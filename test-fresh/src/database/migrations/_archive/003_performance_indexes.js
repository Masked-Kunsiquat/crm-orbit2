// Performance indexes and optional FTS for interactions/search hotspots
// Exports: { version, name, up, down }

import { getExec, runAll } from './_helpers.js';

const CREATE_INDEXES = [
  // Composite indexes to accelerate common filters + ordering
  `CREATE INDEX IF NOT EXISTS idx_interactions_contact_datetime ON interactions(contact_id, interaction_datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_datetime_desc ON interactions(interaction_datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_type_datetime ON interactions(interaction_type, interaction_datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_custom_type_datetime ON interactions(custom_type, interaction_datetime DESC);`,
];

const DROP_INDEXES = [
  'DROP INDEX IF EXISTS idx_interactions_custom_type_datetime;',
  'DROP INDEX IF EXISTS idx_interactions_type_datetime;',
  'DROP INDEX IF EXISTS idx_interactions_datetime_desc;',
  'DROP INDEX IF EXISTS idx_interactions_contact_datetime;',
];

const DROP_FTS = [
  'DROP TRIGGER IF EXISTS interactions_au;',
  'DROP TRIGGER IF EXISTS interactions_ad;',
  'DROP TRIGGER IF EXISTS interactions_ai;',
  'DROP TABLE IF EXISTS interactions_fts;',
];

export default {
  version: 3,
  name: '003_performance_indexes',
  up: async dbOrCtx => {
    const exec = getExec(dbOrCtx);

    // Create core indexes
    await runAll(exec, CREATE_INDEXES);

    // Optionally enable FTS5 for interactions(title, note) if available
    let ftsReady = false;
    try {
      await runAll(exec, [
        "CREATE VIRTUAL TABLE IF NOT EXISTS interactions_fts USING fts5(title, note, content='interactions', content_rowid='id');",
      ]);
      ftsReady = true;
    } catch (_) {
      // FTS5 not available; skip without failing the migration
      ftsReady = false;
    }

    if (ftsReady) {
      try {
        await runAll(exec, [
          `CREATE TRIGGER IF NOT EXISTS interactions_ai AFTER INSERT ON interactions BEGIN
             INSERT INTO interactions_fts(rowid, title, note) VALUES (new.id, new.title, new.note);
           END;`,
          `CREATE TRIGGER IF NOT EXISTS interactions_ad AFTER DELETE ON interactions BEGIN
             INSERT INTO interactions_fts(interactions_fts, rowid, title, note) VALUES ('delete', old.id, old.title, old.note);
           END;`,
          `CREATE TRIGGER IF NOT EXISTS interactions_au AFTER UPDATE ON interactions BEGIN
             INSERT INTO interactions_fts(interactions_fts, rowid, title, note) VALUES ('delete', old.id, old.title, old.note);
             INSERT INTO interactions_fts(rowid, title, note) VALUES (new.id, new.title, new.note);
           END;`,
        ]);
      } catch (error) {
        // Log warning but continue migration - trigger creation is non-critical
        console.warn(
          'Warning: Failed to create FTS5 triggers:',
          error?.message || error
        );
      }
    }
  },

  down: async dbOrCtx => {
    const exec = getExec(dbOrCtx);
    // Drop FTS objects first, then indexes
    await runAll(exec, DROP_FTS);
    await runAll(exec, DROP_INDEXES);
  },
};
