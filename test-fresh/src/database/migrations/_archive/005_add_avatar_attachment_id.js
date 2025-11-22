// Migration: Add avatar_attachment_id column to contacts table
// This replaces the legacy avatar_uri pattern with attachment-based avatars

import { getExec } from './_helpers.js';

export default {
  version: 5,
  name: 'add_avatar_attachment_id',

  async up(ctx) {
    const exec = getExec(ctx);

    // Check if avatar_attachment_id column already exists
    const tableInfo = await ctx.execute('PRAGMA table_info(contacts);');
    let columns = [];
    if (Array.isArray(tableInfo)) {
      columns = tableInfo;
    } else if (tableInfo?.rows) {
      columns = Array.isArray(tableInfo.rows) ? tableInfo.rows : [];
    }

    const hasAvatarAttachmentId = columns.some(
      col => col.name === 'avatar_attachment_id'
    );

    // Build statements array conditionally
    const statements = [];

    // Add column only if it doesn't exist
    if (!hasAvatarAttachmentId) {
      statements.push(`
        ALTER TABLE contacts
        ADD COLUMN avatar_attachment_id INTEGER
        REFERENCES attachments(id) ON DELETE SET NULL;
      `);
    }

    // Add index for performance (avatar lookups are common)
    statements.push(
      'DROP INDEX IF EXISTS idx_contacts_avatar_attachment;',
      `CREATE INDEX IF NOT EXISTS idx_contacts_avatar_attachment
       ON contacts(avatar_attachment_id) WHERE avatar_attachment_id IS NOT NULL;`
    );

    try {
      await exec.batch(statements);
    } catch (error) {
      // Handle duplicate column errors gracefully
      if (
        error?.message?.includes('duplicate column name: avatar_attachment_id')
      ) {
        console.warn(
          'Migration 005: avatar_attachment_id column already exists, continuing with index creation...'
        );

        // Re-run only the index creation statements
        const safeStatements = statements.filter(
          stmt => !stmt.includes('ADD COLUMN avatar_attachment_id')
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

    // Drop the index first
    await execute('DROP INDEX IF EXISTS idx_contacts_avatar_attachment;');

    // SQLite doesn't support DROP COLUMN directly - would require full table recreation
    throw new DatabaseError(
      'Migration 005 rollback not supported: SQLite cannot drop columns. ' +
        'Rolling back would require recreating the contacts table with potential data loss.',
      'MIGRATION_ROLLBACK_UNSUPPORTED'
    );
  },
};
