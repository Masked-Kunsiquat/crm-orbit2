// Migration: Add display_name column to contacts table

import { getExec, runAll } from './_helpers.js';

export default {
  version: 4,
  name: 'add_display_name_column',
  
  async up(ctx) {
    // Migration runner provides transaction context, use atomic batch operations
    const exec = getExec(ctx);

    // Check if display_name column already exists
    const tableInfo = await ctx.execute('PRAGMA table_info(contacts);');
    // Handle both SQL.js format (array) and Expo SQLite format (rows property)
    const columns = Array.isArray(tableInfo) ? tableInfo : (tableInfo?.rows || []);
    const hasDisplayNameColumn = columns.some(col => col.name === 'display_name');

    // Build statements array conditionally
    const statements = [];

      // Add column only if it doesn't exist
      if (!hasDisplayNameColumn) {
        statements.push(`
          ALTER TABLE contacts
          ADD COLUMN display_name TEXT;
        `);
      }

      // Backfill and setup statements
      statements.push(
        // Backfill with collapsed internal whitespace
        `UPDATE contacts
         SET display_name = TRIM(
           REPLACE(
             REPLACE(
               REPLACE(
                 TRIM(
                   COALESCE(TRIM(first_name), '') || ' ' ||
                   COALESCE(NULLIF(TRIM(middle_name), ''), '') || ' ' ||
                   COALESCE(TRIM(last_name), '')
                 ),
                 '  ', ' '
               ),
               '  ', ' '
             ),
             '  ', ' '
           )
         )
         WHERE display_name IS NULL;`,

        // Handle empty display names
        `UPDATE contacts
         SET display_name = 'Unnamed Contact'
         WHERE display_name IS NULL OR display_name = '';`,

        // Drop existing triggers to avoid duplicates
        'DROP TRIGGER IF EXISTS contacts_display_name_insert;',
        'DROP TRIGGER IF EXISTS contacts_display_name_update;',

        // Create INSERT trigger to auto-compute display_name
        `CREATE TRIGGER contacts_display_name_insert
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
         END;`,

        // Create UPDATE trigger to auto-compute display_name when name fields change
        `CREATE TRIGGER contacts_display_name_update
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
         END;`,

        // Drop any existing index first to ensure we get the NOCASE collation
        'DROP INDEX IF EXISTS idx_contacts_display_name;',

        // Create case-insensitive index on display_name for performance
        `CREATE INDEX idx_contacts_display_name ON contacts(display_name COLLATE NOCASE);`
      );

    // Use runAll for atomic batch execution when available, fallback to sequential
    await runAll(exec, statements);
  },
  
  async down(ctx) {
    const { execute } = ctx;

    // Import DatabaseError for proper error handling
    const { DatabaseError } = await import('../errors.js');

    // Drop the display_name index first
    await execute('DROP INDEX IF EXISTS idx_contacts_display_name;');

    // SQLite doesn't support DROP COLUMN directly - would require full table recreation
    // This migration is effectively irreversible without data loss risk
    throw new DatabaseError(
      'Migration 004 rollback not supported: SQLite cannot drop columns. ' +
      'Rolling back would require recreating the contacts table with potential data loss.',
      'MIGRATION_ROLLBACK_UNSUPPORTED'
    );
  }
};