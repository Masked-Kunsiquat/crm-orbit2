// Migration: Add display_name column to contacts table

export default {
  version: 4,
  name: 'add_display_name_column',
  
  async up(ctx) {
    // Use transaction for atomicity if available, fallback to direct execution
    if (typeof ctx.transaction === 'function') {
      await ctx.transaction(async (tx) => {
        // Add display_name column to contacts table
        await tx.execute(`
          ALTER TABLE contacts
          ADD COLUMN display_name TEXT;
        `);

        // Backfill with collapsed internal whitespace
        await tx.execute(`
          UPDATE contacts
          SET display_name = TRIM(
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
            )
          )
          WHERE display_name IS NULL;
        `);

        // Handle empty display names
        await tx.execute(`
          UPDATE contacts
          SET display_name = 'Unnamed Contact'
          WHERE display_name IS NULL OR display_name = '';
        `);

        // Create case-insensitive index on display_name for performance
        // Drop any existing index first to ensure we get the NOCASE collation
        await tx.execute('DROP INDEX IF EXISTS idx_contacts_display_name;');
        await tx.execute(`
          CREATE INDEX idx_contacts_display_name ON contacts(display_name COLLATE NOCASE);
        `);
      });
    } else {
      // Fallback to direct execution for compatibility
      const { execute } = ctx;

      // Add display_name column to contacts table
      await execute(`
        ALTER TABLE contacts
        ADD COLUMN display_name TEXT;
      `);

      // Backfill with collapsed internal whitespace
      await execute(`
        UPDATE contacts
        SET display_name = TRIM(
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
          )
        )
        WHERE display_name IS NULL;
      `);

      // Handle empty display names
      await execute(`
        UPDATE contacts
        SET display_name = 'Unnamed Contact'
        WHERE display_name IS NULL OR display_name = '';
      `);

      // Create case-insensitive index on display_name for performance
      // Drop any existing index first to ensure we get the NOCASE collation
      await execute('DROP INDEX IF EXISTS idx_contacts_display_name;');
      await execute(`
        CREATE INDEX idx_contacts_display_name ON contacts(display_name COLLATE NOCASE);
      `);
    }
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