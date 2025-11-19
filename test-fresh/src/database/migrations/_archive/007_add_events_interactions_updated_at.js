/**
 * Migration 007: Add updated_at column to events and interactions tables
 *
 * **Purpose**: Add timestamp tracking for events and interactions to support
 * React.memo optimization strategies and audit trails.
 *
 * **Context**: The events.js and interactions.js database modules both attempt
 * to set `updated_at = CURRENT_TIMESTAMP` on UPDATE operations (see events.js:139
 * and interactions.js:157), but the column doesn't exist in the schema. This
 * migration adds the missing column and creates triggers to auto-update it.
 *
 * **Changes**:
 * 1. Add updated_at DATETIME column to events table (defaults to CURRENT_TIMESTAMP)
 * 2. Add updated_at DATETIME column to interactions table (defaults to CURRENT_TIMESTAMP)
 * 3. Create trigger to auto-update events.updated_at on row changes
 * 4. Create trigger to auto-update interactions.updated_at on row changes
 *
 * **Benefits**:
 * - Enables memoization in AddEventModal and AddInteractionModal based on updated_at
 * - Provides audit trail for when events/interactions were last modified
 * - Matches pattern used for contacts, notes, and user_preferences tables
 *
 * **Rollback**: Not supported (SQLite doesn't support DROP COLUMN)
 */

import { getExec } from './_helpers.js';

export default {
  version: 7,
  name: 'add_events_interactions_updated_at',

  async up(ctx) {
    const exec = getExec(ctx);

    // Check if updated_at columns already exist
    const eventsTableInfo = await ctx.execute('PRAGMA table_info(events);');
    const interactionsTableInfo = await ctx.execute('PRAGMA table_info(interactions);');

    let eventsColumns = [];
    if (Array.isArray(eventsTableInfo)) {
      eventsColumns = eventsTableInfo;
    } else if (eventsTableInfo?.rows) {
      eventsColumns = Array.isArray(eventsTableInfo.rows) ? eventsTableInfo.rows : [];
    }

    let interactionsColumns = [];
    if (Array.isArray(interactionsTableInfo)) {
      interactionsColumns = interactionsTableInfo;
    } else if (interactionsTableInfo?.rows) {
      interactionsColumns = Array.isArray(interactionsTableInfo.rows) ? interactionsTableInfo.rows : [];
    }

    const eventsHasUpdatedAt = eventsColumns.some(col => col.name === 'updated_at');
    const interactionsHasUpdatedAt = interactionsColumns.some(col => col.name === 'updated_at');

    const statements = [];

    // Add updated_at to events if it doesn't exist
    if (!eventsHasUpdatedAt) {
      statements.push(`
        ALTER TABLE events
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
      `);
    }

    // Backfill events.updated_at with created_at
    statements.push(`
      UPDATE events
      SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL;
    `);

    // Add updated_at to interactions if it doesn't exist
    if (!interactionsHasUpdatedAt) {
      statements.push(`
        ALTER TABLE interactions
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
      `);
    }

    // Backfill interactions.updated_at with created_at (or interaction_datetime as fallback)
    statements.push(`
      UPDATE interactions
      SET updated_at = COALESCE(created_at, interaction_datetime, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL;
    `);

    // Create trigger for events.updated_at auto-update
    statements.push(`
      CREATE TRIGGER IF NOT EXISTS trg_events_updated_at
      AFTER UPDATE ON events
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Create trigger for interactions.updated_at auto-update
    statements.push(`
      CREATE TRIGGER IF NOT EXISTS trg_interactions_updated_at
      AFTER UPDATE ON interactions
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE interactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    try {
      await exec.batch(statements);
    } catch (error) {
      // Handle duplicate column errors gracefully
      if (error?.message?.includes('duplicate column name: updated_at')) {
        console.warn(
          'Migration 007: updated_at column(s) already exist, continuing...'
        );

        // Re-run only non-ADD COLUMN statements
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
      'Migration 007 rollback not supported: SQLite cannot drop columns. ' +
        'Rolling back would require recreating events and interactions tables with potential data loss.',
      'MIGRATION_ROLLBACK_UNSUPPORTED'
    );
  },
};
