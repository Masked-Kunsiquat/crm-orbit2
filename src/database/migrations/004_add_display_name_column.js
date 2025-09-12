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
    
    // Update existing contacts with computed display names
    await execute(`
      UPDATE contacts 
      SET display_name = TRIM(
        COALESCE(first_name || ' ', '') ||
        COALESCE(middle_name || ' ', '') ||
        COALESCE(last_name, '')
      )
      WHERE display_name IS NULL;
    `);
    
    // Handle empty display names
    await execute(`
      UPDATE contacts 
      SET display_name = 'Unnamed Contact'
      WHERE display_name IS NULL OR display_name = '';
    `);
  },
  
  async down(ctx) {
    const { execute } = ctx;
    
    // Remove display_name column
    // Note: SQLite doesn't support DROP COLUMN directly
    // This would require recreating the table in a real rollback scenario
    console.warn('Rollback for display_name column not implemented - requires table recreation');
  }
};