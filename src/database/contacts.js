// Contacts database module
// Focused on core contact CRUD operations

import { DatabaseError } from './errors';

const CONTACT_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'display_name',
  'avatar_uri',
  'company_id',
  'job_title',
  'is_favorite',
  'last_interaction_at',
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

function convertNullableFields(row) {
  if (!row) return row;
  const converted = { ...row };
  // Convert undefined nullable fields to null for consistent API
  if (converted.last_interaction_at === undefined) {
    converted.last_interaction_at = null;
  }
  return converted;
}

// (reserved for future helpers)

function computeDisplayName(data) {
  const nameParts = [
    data.first_name?.trim(),
    data.middle_name?.trim(),
    data.last_name?.trim()
  ].filter(Boolean);
  
  if (nameParts.length > 0) {
    return nameParts.join(' ');
  }
  
  return 'Unnamed Contact';
}

/**
 * Create a contacts DB API bound to provided DB helpers.
 * @param {{ execute: Function, batch: Function, transaction?: Function }} ctx
 */
export function createContactsDB(ctx) {
  const { execute, batch, transaction } = ctx || {};
  if (typeof execute !== 'function' || typeof batch !== 'function') {
    throw new DatabaseError('contactsDB requires execute and batch helpers', 'MODULE_INIT_ERROR');
  }

  // Build CRUD helpers
  return {
    // Core CRUD
    async create(data) {
      if (!data || !data.first_name) {
        throw new DatabaseError('first_name is required', 'VALIDATION_ERROR');
      }
      const contactData = pick(data, CONTACT_FIELDS);
      // Compute and assign display_name before building columns/values
      contactData.display_name = computeDisplayName(data);
      const cols = Object.keys(contactData);
      const vals = cols.map((k) => contactData[k]);

      const insertRes = await execute(
        `INSERT INTO contacts (${cols.join(', ')}) VALUES (${placeholders(cols.length)});`,
        vals
      );
      const id = insertRes.insertId;
      if (!id) {
        throw new DatabaseError('Failed to create contact', 'INSERT_FAILED');
      }

      return this.getById(id);
    },

    async getById(id) {
      const res = await execute('SELECT * FROM contacts WHERE id = ?;', [id]);
      return convertNullableFields(res.rows[0]) || null;
    },

    async getAll(options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'last_name',
        orderDir = 'ASC',
        favorites = undefined,
        companyId = undefined,
      } = options;
      const where = [];
      const params = [];
      if (favorites === true) {
        where.push('is_favorite = 1');
      } else if (favorites === false) {
        where.push('is_favorite = 0');
      }
      if (companyId != null) {
        where.push('company_id = ?');
        params.push(companyId);
      }
      const order = ['first_name', 'last_name', 'created_at', 'updated_at', 'last_interaction_at'].includes(
        orderBy
      )
        ? orderBy
        : 'last_name';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = `SELECT * FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY ${order} ${dir}
                   LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [...params, limit, offset]);
      return res.rows.map(convertNullableFields);
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }
      const existing = await this.getById(id);
      const contactData = pick(data, CONTACT_FIELDS);
      const nameKeys = ['first_name', 'middle_name', 'last_name'];
      if (nameKeys.some((k) => k in data) && !('display_name' in data)) {
        const fn = ({ first_name, middle_name, last_name }) =>
          [first_name, middle_name, last_name].filter(Boolean).join(' ').trim();
        contactData.display_name = fn({ ...(existing || {}), ...contactData });
      }
      if (Object.keys(contactData).length === 0) {
        return this.getById(id);
      }
      const sets = Object.keys(contactData).map((k) => `${k} = ?`);
      const vals = Object.keys(contactData).map((k) => contactData[k]);
      await execute(
        `UPDATE contacts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...vals, id]
      );
      const updated = await this.getById(id);
      return updated;
    },

    async delete(id) {
      if (!transaction) {
        // Fallback: delete contact and let foreign keys cascade
        // Note: Attachments need manual cleanup since they don't use FK constraints
        await execute('DELETE FROM attachments WHERE entity_type = ? AND entity_id = ?;', ['contact', id]);
        const res = await execute('DELETE FROM contacts WHERE id = ?;', [id]);
        return res.rowsAffected || 0;
      }

      // Use transaction to ensure atomic deletion
      return await transaction(async (tx) => {
        // Delete attachments first (no FK constraints)
        await tx.execute('DELETE FROM attachments WHERE entity_type = ? AND entity_id = ?;', ['contact', id]);
        
        // Delete contact (other related data cascades via FK constraints)
        const res = await tx.execute('DELETE FROM contacts WHERE id = ?;', [id]);
        return res.rowsAffected || 0;
      });
    },

    async search(query) {
      const term = String(query || '').trim();
      if (!term) return [];
      const q = `%${term}%`;
      const res = await execute(
        `SELECT DISTINCT c.*
         FROM contacts c
         LEFT JOIN contact_info ci ON ci.contact_id = c.id
         WHERE (
           c.first_name LIKE ? OR c.last_name LIKE ? OR c.middle_name LIKE ? OR c.job_title LIKE ?
           OR ci.value LIKE ?
         )
         ORDER BY c.last_name ASC, c.first_name ASC;`,
        [q, q, q, q, q]
      );
      return res.rows.map(convertNullableFields);
    },

    async getByCategory(categoryId) {
      const res = await execute(
        `SELECT c.*
         FROM contacts c
         INNER JOIN contact_categories cc ON cc.contact_id = c.id
         WHERE cc.category_id = ?
         ORDER BY c.last_name ASC, c.first_name ASC;`,
        [categoryId]
      );
      return res.rows.map(convertNullableFields);
    },

    async getFavorites() {
      const res = await execute(
        `SELECT * FROM contacts WHERE is_favorite = 1 ORDER BY last_name ASC, first_name ASC;`
      );
      return res.rows.map(convertNullableFields);
    },


    async getWithCategories(id) {
      const [cRes, catRes] = await Promise.all([
        execute('SELECT * FROM contacts WHERE id = ?;', [id]),
        execute(
          `SELECT cat.*
           FROM categories cat
           INNER JOIN contact_categories cc ON cc.category_id = cat.id
           WHERE cc.contact_id = ?
           ORDER BY cat.sort_order ASC, cat.name ASC;`,
          [id]
        ),
      ]);
      const contact = convertNullableFields(cRes.rows[0]) || null;
      if (!contact) return null;
      return { ...contact, categories: catRes.rows };
    },

    async toggleFavorite(id) {
      await batch([
        { sql: 'UPDATE contacts SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?;', params: [id] },
        { sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;', params: [id] },
      ]);
      const updated = await this.getById(id);
      return updated;
    },

  };
}

export default createContactsDB;
