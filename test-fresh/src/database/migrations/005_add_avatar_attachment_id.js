/**
 * Migration 005: Add avatar_attachment_id column to contacts table
 *
 * This migration adds support for storing contact avatars using the fileService
 * attachment system instead of direct URIs. The avatar_attachment_id references
 * the attachments table where avatar files are properly managed with thumbnails
 * and cleanup support.
 *
 * The legacy avatar_uri column is kept for backward compatibility but will be
 * gradually deprecated in favor of avatar_attachment_id.
 */

export default {
  version: 5,
  name: 'add_avatar_attachment_id',
  dependencies: [4], // Depends on display_name column migration

  async up(db) {
    await db.execute(`
      ALTER TABLE contacts
      ADD COLUMN avatar_attachment_id INTEGER REFERENCES attachments(id) ON DELETE SET NULL;
    `);
  },

  async down(db) {
    // SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
    // For simplicity, we'll leave the column in place during rollback
    console.warn('Migration 005 down: SQLite does not support DROP COLUMN. Column avatar_attachment_id will remain.');
  },
};
