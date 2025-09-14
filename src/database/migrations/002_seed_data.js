// Seed data migration
// Follows the format outlined in migrations/AGENTS.md
// Exports: { version, name, up(dbOrCtx), down(dbOrCtx) }

import { getExec, runAll, runAllSequential } from './_helpers.js';

// 1) System categories that cannot be deleted (is_system = 1)
const SYSTEM_CATEGORIES = [
  { name: 'Family', color: '#FF6B6B', icon: 'home', sort_order: 10 },
  { name: 'Friends', color: '#4ECDC4', icon: 'people', sort_order: 20 },
  { name: 'Work', color: '#5E72E4', icon: 'briefcase', sort_order: 30 },
  { name: 'VIP', color: '#F4C430', icon: 'star', sort_order: 40 },
  { name: 'Clients', color: '#2DCE89', icon: 'handshake', sort_order: 50 },
  { name: 'Leads', color: '#11CDEF', icon: 'person-add', sort_order: 60 },
  { name: 'Vendors', color: '#FB6340', icon: 'cart', sort_order: 70 },
  { name: 'Personal', color: '#8965E0', icon: 'person', sort_order: 80 },
];

const INSERT_CATEGORIES = SYSTEM_CATEGORIES.map((c) => ({
  sql:
    'INSERT INTO categories (name, color, icon, is_system, sort_order) VALUES (?, ?, ?, 1, ?) ' +
    'ON CONFLICT(name) DO UPDATE SET color = excluded.color, icon = excluded.icon, sort_order = excluded.sort_order, is_system = 1;',
  params: [c.name, c.color, c.icon, c.sort_order],
}));

// 2) Default user preferences
const DEFAULT_PREFERENCES = [
  // Notifications
  { category: 'notifications', key: 'enable_push', value: 'true', data_type: 'boolean', is_enabled: 1 },
  { category: 'notifications', key: 'daily_summary', value: 'true', data_type: 'boolean', is_enabled: 1 },
  { category: 'notifications', key: 'reminder_lead_time_minutes', value: '30', data_type: 'number', is_enabled: 1 },
  { category: 'notifications', key: 'interaction_notifications', value: 'true', data_type: 'boolean', is_enabled: 1 },

  // Display
  { category: 'display', key: 'theme', value: 'system', data_type: 'string', is_enabled: 1 },
  { category: 'display', key: 'compact_mode', value: 'false', data_type: 'boolean', is_enabled: 1 },
  { category: 'display', key: 'items_per_page', value: '25', data_type: 'number', is_enabled: 1 },

  // Security
  { category: 'security', key: 'biometrics_enabled', value: 'false', data_type: 'boolean', is_enabled: 1 },
  { category: 'security', key: 'auto_lock_minutes', value: '5', data_type: 'number', is_enabled: 1 },

  // Backup
  { category: 'backup', key: 'auto_backup_enabled', value: 'true', data_type: 'boolean', is_enabled: 1 },
  { category: 'backup', key: 'backup_frequency_days', value: '7', data_type: 'number', is_enabled: 1 },
  { category: 'backup', key: 'include_attachments', value: 'true', data_type: 'boolean', is_enabled: 1 },
];

const INSERT_PREFERENCES = DEFAULT_PREFERENCES.map((p) => ({
  sql:
    'INSERT INTO user_preferences (category, setting_key, setting_value, data_type, is_enabled) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(category, setting_key) DO NOTHING;',
  params: [p.category, p.key, p.value, p.data_type, p.is_enabled],
}));

// Build targeted deletes for down migration
const CATEGORY_NAMES = SYSTEM_CATEGORIES.map((c) => c.name);
const DELETE_CATEGORIES = [
  {
    sql: `DELETE FROM categories WHERE is_system = 1 AND name IN (${CATEGORY_NAMES.map(() => '?').join(', ')});`,
    params: CATEGORY_NAMES,
  },
];

const DELETE_PREFERENCES = DEFAULT_PREFERENCES.map((p) => ({
  sql: 'DELETE FROM user_preferences WHERE category = ? AND setting_key = ?;',
  params: [p.category, p.key],
}));

// Pre-delete links to avoid FK violations on categories deletion
const DELETE_CONTACT_CATEGORY_LINKS = [
  {
    sql: `DELETE FROM contact_categories
          WHERE category_id IN (
            SELECT id FROM categories
            WHERE is_system = 1 AND name IN (${CATEGORY_NAMES.map(() => '?').join(', ')})
          );`,
    params: CATEGORY_NAMES,
  },
];

export default {
  version: 2,
  name: '002_seed_data',
  /**
   * Insert system categories and default user preferences.
   * @param {any} dbOrCtx Migration context: expected to provide { batch, execute } helpers.
   */
  up: async (dbOrCtx) => {
    const exec = getExec(dbOrCtx);
    await runAll(exec, [...INSERT_CATEGORIES, ...INSERT_PREFERENCES]);
  },

  /**
   * Remove only the seeded data (system categories inserted here and default preferences).
   * @param {any} dbOrCtx Migration context: expected to provide { batch, execute } helpers.
   */
  down: async (dbOrCtx) => {
    const exec = getExec(dbOrCtx);
    // 1) Remove preferences (by exact keys)
    await runAllSequential(exec, DELETE_PREFERENCES);
    // 2) Unlink any contact-category references for these system categories
    await runAllSequential(exec, DELETE_CONTACT_CATEGORY_LINKS);
    // 3) Remove categories
    await runAllSequential(exec, DELETE_CATEGORIES);
  },
};
