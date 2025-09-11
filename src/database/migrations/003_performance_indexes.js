// Performance indexes and optional FTS for interactions/search hotspots
// Exports: { version, name, up, down }

import { getExec, runAll } from './_helpers';

const CREATE_INDEXES = [
  // Composite indexes to accelerate common filters + ordering
  `CREATE INDEX IF NOT EXISTS idx_interactions_contact_datetime ON interactions(contact_id, datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_datetime_desc ON interactions(datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_type_datetime ON interactions(interaction_type, datetime DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_custom_type_datetime ON interactions(custom_type, datetime DESC);`,
];

const DROP_INDEXES = [
  'DROP INDEX IF EXISTS idx_interactions_custom_type_datetime;',
  'DROP INDEX IF EXISTS idx_interactions_type_datetime;',
  'DROP INDEX IF EXISTS idx_interactions_datetime_desc;',
  'DROP INDEX IF EXISTS idx_interactions_contact_datetime;',
  'DROP INDEX IF EXISTS idx_contacts_display_name;',
];

const DROP_FTS = [
  'DROP TRIGGER IF EXISTS interactions_au;',
  'DROP TRIGGER IF EXISTS interactions_ad;',
  'DROP TRIGGER IF EXISTS interactions_ai;',
  'DROP TABLE IF EXISTS interactions_fts;',
];

function rowsFromExecuteResult(res) {
  if (Array.isArray(res)) return res; // sql.js variant sometimes returns array
  if (res?.rows?._array) return res.rows._array;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

export default {
  version: 3,
  name: '003_performance_indexes',
  up: async (dbOrCtx) => {
    const exec = getExec(dbOrCtx);

    // Create core indexes
    await runAll(exec, CREATE_INDEXES);

    // Conditionally create contacts(display_name) index if the column exists
    try {
      const res = await exec.execute("PRAGMA table_info('contacts');");
      const cols = rowsFromExecuteResult(res).map((r) => r.name || r.column_name || r.Column || r.column || r[1]);
      const hasDisplayName = cols && cols.some((n) => String(n).toLowerCase() === 'display_name');
      if (hasDisplayName) {
        await exec.execute('CREATE INDEX IF NOT EXISTS idx_contacts_display_name ON contacts(display_name);');
      }
    } catch (_) {
      // Ignore pragma errors in environments that do not support it
    }

    // Optionally enable FTS5 for interactions(title, note) if available
    let ftsReady = false;
    try {
      await exec.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS interactions_fts USING fts5(title, note, content='interactions', content_rowid='id');"
      );
      ftsReady = true;
    } catch (_) {
      // FTS5 not available; skip without failing the migration
      ftsReady = false;
    }

    if (ftsReady) {
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
    }
  },

  down: async (dbOrCtx) => {
    const exec = getExec(dbOrCtx);
    // Drop FTS objects first, then indexes
    await runAll(exec, DROP_FTS);
    await runAll(exec, DROP_INDEXES);
  },
};

