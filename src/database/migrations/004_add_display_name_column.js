// Migration: Add display_name column to contacts table

export default {
  version: 4,
  name: 'add_display_name_column',
  
  async up(ctx) {
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

    // Create index on display_name for performance
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_contacts_display_name ON contacts(display_name);
    `);
  },
  
  async down(ctx) {
    const { execute } = ctx;

    // Drop the display_name index first
    await execute('DROP INDEX IF EXISTS idx_contacts_display_name;');

    // Remove display_name column
    // Note: SQLite doesn't support DROP COLUMN directly
    // This would require recreating the table in a real rollback scenario
    console.warn('Rollback for display_name column not implemented - requires table recreation');
  }
};