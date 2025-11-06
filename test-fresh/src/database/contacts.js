// Contacts database module
// Focused on core contact CRUD operations

import { DatabaseError } from './errors';
import { safeTrim, filterNonEmptyStrings } from '../utils/stringHelpers';

const CONTACT_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'display_name',
  'avatar_uri',
  'avatar_attachment_id',
  'company_id',
  'job_title',
  'is_favorite',
  'last_interaction_at',
];

function pick(obj, fields) {
  const out = {};
  for (const key of fields) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
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
  const nameParts = filterNonEmptyStrings([
    data.first_name,
    data.middle_name,
    data.last_name,
  ]);

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
    throw new DatabaseError(
      'contactsDB requires execute and batch helpers',
      'MODULE_INIT_ERROR'
    );
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
      const vals = cols.map(k => contactData[k]);

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

    async getById(id, execOverride) {
      const execFn = execOverride?.execute ? execOverride.execute : execute;
      const res = await execFn('SELECT * FROM contacts WHERE id = ?;', [id]);
      return convertNullableFields(res.rows[0]) || null;
    },

    async getByIds(ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return [];
      }
      // Filter out invalid IDs and remove duplicates
      const validIds = [...new Set(ids.filter(id => id != null))];
      if (validIds.length === 0) {
        return [];
      }
      const res = await execute(
        `SELECT * FROM contacts WHERE id IN (${placeholders(validIds.length)});`,
        validIds
      );
      return res.rows.map(convertNullableFields);
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
      const order = [
        'first_name',
        'last_name',
        'created_at',
        'updated_at',
        'last_interaction_at',
      ].includes(orderBy)
        ? orderBy
        : 'last_name';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = `SELECT * FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY ${order} ${dir}
                   LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [...params, limit, offset]);
      return res.rows.map(convertNullableFields);
    },

    async update(id, data, tx) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id, tx);
      }
      const existing = await this.getById(id, tx);
      const contactData = pick(data, CONTACT_FIELDS);
      const nameKeys = ['first_name', 'middle_name', 'last_name'];
      if (nameKeys.some(k => k in data) && !('display_name' in data)) {
        const merged = { ...(existing || {}), ...contactData };
        contactData.display_name = computeDisplayName(merged);
      }
      if (Object.keys(contactData).length === 0) {
        return this.getById(id, tx);
      }
      const sets = Object.keys(contactData).map(k => `${k} = ?`);
      const vals = Object.keys(contactData).map(k => contactData[k]);
      const execFn = tx?.execute ? tx.execute : execute;
      await execFn(
        `UPDATE contacts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...vals, id]
      );
      const updated = await this.getById(id, tx);
      return updated;
    },

    async delete(id) {
      // Perform explicit transactional cleanup to avoid orphaned rows
      // (do not rely on PRAGMA foreign_keys state across environments)
      if (typeof transaction === 'function') {
        return await transaction(async tx => {
          await tx.execute('DELETE FROM contact_info WHERE contact_id = ?;', [id]);
          await tx.execute('DELETE FROM contact_categories WHERE contact_id = ?;', [id]);
          await tx.execute('DELETE FROM interactions WHERE contact_id = ?;', [id]);
          // Delete the contact last
          const delRes = await tx.execute('DELETE FROM contacts WHERE id = ?;', [id]);
          return delRes.rowsAffected || 0;
        });
      }

      // Fallback to batch (runs inside a transaction in our DB layer)
      const results = await batch([
        { sql: 'DELETE FROM contact_info WHERE contact_id = ?;', params: [id] },
        { sql: 'DELETE FROM contact_categories WHERE contact_id = ?;', params: [id] },
        { sql: 'DELETE FROM interactions WHERE contact_id = ?;', params: [id] },
        { sql: 'DELETE FROM contacts WHERE id = ?;', params: [id] },
      ]);
      return results?.[3]?.rowsAffected || 0;
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

    async findByName(firstName, lastName, exactMatch = true) {
      if (exactMatch) {
        const res = await execute(
          `SELECT * FROM contacts
           WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(?))
           AND LOWER(TRIM(last_name)) = LOWER(TRIM(?))
           ORDER BY created_at ASC;`,
          [firstName || '', lastName || '']
        );
        return res.rows.map(convertNullableFields);
      } else {
        const firstQ = `%${firstName || ''}%`;
        const lastQ = `%${lastName || ''}%`;
        const res = await execute(
          `SELECT * FROM contacts
           WHERE LOWER(first_name) LIKE LOWER(?)
           AND LOWER(last_name) LIKE LOWER(?)
           ORDER BY last_name ASC, first_name ASC;`,
          [firstQ, lastQ]
        );
        return res.rows.map(convertNullableFields);
      }
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
        {
          sql: 'UPDATE contacts SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?;',
          params: [id],
        },
        {
          sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          params: [id],
        },
      ]);
      const updated = await this.getById(id);
      return updated;
    },
  };
}

export default createContactsDB;
