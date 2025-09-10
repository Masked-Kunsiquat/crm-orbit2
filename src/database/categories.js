// Categories database module
// Follows the API pattern defined in src/database/AGENTS.md

import { DatabaseError } from './errors';

const CATEGORY_FIELDS = [
  'name',
  'color',
  'icon', 
  'is_system',
  'sort_order'
];

function pick(obj, fields) {
  const out = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

function placeholders(n) {
  return new Array(n).fill('?').join(', ');
}

/**
 * Create a categories DB API bound to provided DB helpers.
 * @param {{ execute: Function, batch: Function, transaction?: Function }} ctx
 */
export function createCategoriesDB(ctx) {
  const { execute, batch, transaction } = ctx || {};
  if (typeof execute !== 'function' || typeof batch !== 'function') {
    throw new DatabaseError('categoriesDB requires execute and batch helpers', 'MODULE_INIT_ERROR');
  }

  return {
    // Core CRUD
    async create(data) {
      // Validate and normalize name
      if (!data || typeof data.name !== 'string') {
        throw new DatabaseError('name is required', 'VALIDATION_ERROR');
      }
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new DatabaseError('name is required', 'VALIDATION_ERROR');
      }

      const categoryData = pick(data, CATEGORY_FIELDS);
      // Ensure we insert the trimmed name rather than raw input
      categoryData.name = trimmedName;
      
      // Set defaults
      if (!categoryData.color) categoryData.color = '#007AFF';
      if (!categoryData.icon) categoryData.icon = 'folder';
      if (categoryData.is_system === undefined) categoryData.is_system = false;
      if (categoryData.sort_order === undefined) categoryData.sort_order = 0;

      const cols = Object.keys(categoryData);
      const vals = cols.map((k) => categoryData[k]);

      const insertRes = await execute(
        `INSERT INTO categories (${cols.join(', ')}) VALUES (${placeholders(cols.length)});`,
        vals
      );
      
      const id = insertRes.insertId;
      if (!id) {
        throw new DatabaseError('Failed to create category', 'INSERT_FAILED');
      }

      return { id };
    },

    async getById(id) {
      const res = await execute('SELECT * FROM categories WHERE id = ?;', [id]);
      return res.rows[0] || null;
    },

    async getAll(options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'sort_order',
        orderDir = 'ASC',
        includeSystem = true
      } = options;

      const where = [];
      const params = [];

      if (!includeSystem) {
        where.push('is_system = 0');
      }

      const order = ['name', 'sort_order'].includes(orderBy) ? orderBy : 'sort_order';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      const sql = `SELECT * FROM categories ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY ${order} ${dir}, name ASC
                   LIMIT ? OFFSET ?;`;
      
      const res = await execute(sql, [...params, limit, offset]);
      return res.rows;
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      // Check if this is a system category
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }

      if (existing.is_system && 'name' in data) {
        throw new DatabaseError('Cannot modify system category name', 'SYSTEM_CATEGORY_PROTECTED');
      }

      const categoryData = pick(data, CATEGORY_FIELDS);
      
      // Prevent changing is_system flag
      delete categoryData.is_system;

      if (Object.keys(categoryData).length === 0) {
        return existing;
      }

      const sets = Object.keys(categoryData).map((k) => `${k} = ?`);
      const vals = Object.keys(categoryData).map((k) => categoryData[k]);

      await execute(
        `UPDATE categories SET ${sets.join(', ')} WHERE id = ?;`,
        [...vals, id]
      );

      return this.getById(id);
    },

    async delete(id) {
      // Check if this is a system category
      const category = await this.getById(id);
      if (!category) {
        return 0;
      }

      if (category.is_system) {
        throw new DatabaseError('Cannot delete system category', 'SYSTEM_CATEGORY_PROTECTED');
      }

      const res = await execute('DELETE FROM categories WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    // System/User category queries
    async getSystemCategories() {
      const res = await execute(
        'SELECT * FROM categories WHERE is_system = 1 ORDER BY sort_order ASC, name ASC;'
      );
      return res.rows;
    },

    async getUserCategories() {
      const res = await execute(
        'SELECT * FROM categories WHERE is_system = 0 ORDER BY sort_order ASC, name ASC;'
      );
      return res.rows;
    },

    // Contact-category relationship management
    async addContactToCategory(contactId, categoryId) {
      const res = await execute(
        'INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
        [contactId, categoryId]
      );
      return res && res.rowsAffected ? res.rowsAffected > 0 : false;
    },

    async removeContactFromCategory(contactId, categoryId) {
      const res = await execute(
        'DELETE FROM contact_categories WHERE contact_id = ? AND category_id = ?;',
        [contactId, categoryId]
      );
      return res.rowsAffected || 0;
    },

    async getContactsByCategory(categoryId) {
      const res = await execute(
        `SELECT c.*
         FROM contacts c
         INNER JOIN contact_categories cc ON cc.contact_id = c.id
         WHERE cc.category_id = ?
         ORDER BY c.last_name ASC, c.first_name ASC;`,
        [categoryId]
      );
      return res.rows;
    },

    async getCategoriesForContact(contactId) {
      const res = await execute(
        `SELECT cat.*
         FROM categories cat
         INNER JOIN contact_categories cc ON cc.category_id = cat.id
         WHERE cc.contact_id = ?
         ORDER BY cat.sort_order ASC, cat.name ASC;`,
        [contactId]
      );
      return res.rows;
    },

    async updateSortOrder(sortOrderUpdates) {
      if (!Array.isArray(sortOrderUpdates) || sortOrderUpdates.length === 0) {
        throw new DatabaseError('sortOrderUpdates must be a non-empty array', 'VALIDATION_ERROR');
      }

      const statements = sortOrderUpdates.map(({ id, sort_order }) => {
        if (!id || sort_order === undefined) {
          throw new DatabaseError('Each update must have id and sort_order', 'VALIDATION_ERROR');
        }
        return {
          sql: 'UPDATE categories SET sort_order = ? WHERE id = ?;',
          params: [sort_order, id]
        };
      });

      await batch(statements);
      return true;
    }
  };
}

export default createCategoriesDB;
