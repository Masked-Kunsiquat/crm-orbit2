// Migration: Add updated_at column to event_reminders table
// Provides audit trail for reminder edits and reschedules, consistent with other tables

import { getExec } from './_helpers.js';

export default {
  version: 6,
  name: 'add_event_reminders_updated_at',

  async up(ctx) {
    const exec = getExec(ctx);

    // Check if updated_at column already exists
    const tableInfo = await ctx.execute('PRAGMA table_info(event_reminders);');
    let columns = [];
    if (Array.isArray(tableInfo)) {
      columns = tableInfo;
    } else if (tableInfo?.rows) {
      columns = Array.isArray(tableInfo.rows) ? tableInfo.rows : [];
    }

    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');

    // Build statements array conditionally
    const statements = [];

    // Add column only if it doesn't exist
    if (!hasUpdatedAt) {
      statements.push(`
        ALTER TABLE event_reminders
        ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
    }

    // Initialize updated_at for existing rows (set to created_at or current timestamp)
    statements.push(`
      UPDATE event_reminders
      SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL;
    `);

    try {
      await exec.batch(statements);
    } catch (error) {
      // Handle duplicate column errors gracefully
      if (error?.message?.includes('duplicate column name: updated_at')) {
        console.warn(
          'Migration 006: updated_at column already exists, continuing...'
        );

        // Re-run only the UPDATE statement
        const safeStatements = statements.filter(
          stmt => !stmt.includes('ADD COLUMN updated_at')
        );
        if (safeStatements.length > 0) {
          await exec.batch(safeStatements);
        }
      } else {
        throw error;
      }
    }
  },

  async down(ctx) {
    const { execute } = ctx;
    const { DatabaseError } = await import('../errors.js');

    // SQLite doesn't support DROP COLUMN directly - would require full table recreation
    throw new DatabaseError(
      'Migration 006 rollback not supported: SQLite cannot drop columns. ' +
        'Rolling back would require recreating the event_reminders table with potential data loss.',
      'MIGRATION_ROLLBACK_UNSUPPORTED'
    );
  },
};
