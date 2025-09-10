// Contacts database module
// Follows the API pattern defined in src/database/AGENTS.md

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

const INFO_FIELDS = ['type', 'subtype', 'value', 'label', 'is_primary'];

function pick(obj, fields) {
  const out = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

function keys(obj) {
  return Object.keys(obj);
}

function placeholders(n) {
  return new Array(n).fill('?').join(', ');
}

function nowISO() {
  return new Date().toISOString();
}

function computeDisplayName(data) {
  const nameParts = [
    data.first_name?.trim(),
    data.middle_name?.trim(),
    data.last_name?.trim()
  ].filter(Boolean);
  
  if (nameParts.length > 0) {
    return nameParts.join(' ');
  }
  
  // Fall back to contact info if no name parts available
  const contactInfo = data.contactInfo || data.contact_info || [];
  for (const info of contactInfo) {
    if (info?.type === 'email' && info.value?.trim()) {
      return info.value.trim();
    }
  }
  for (const info of contactInfo) {
    if (info?.type === 'phone' && info.value?.trim()) {
      return info.value.trim();
    }
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
      const infoList = Array.isArray(data.contactInfo)
        ? data.contactInfo
        : Array.isArray(data.contact_info)
        ? data.contact_info
        : [];

      const contactData = pick(data, CONTACT_FIELDS);
      // Compute and assign display_name before building columns/values
      contactData.display_name = computeDisplayName(data);
      const cols = keys(contactData);
      const vals = cols.map((k) => contactData[k]);

      // Insert contact
      const insertRes = await execute(
        `INSERT INTO contacts (${cols.join(', ')}) VALUES (${placeholders(cols.length)});`,
        vals
      );
      const id = insertRes.insertId;
      if (!id) {
        throw new DatabaseError('Failed to create contact', 'INSERT_FAILED');
      }

      // Optional: insert contact info in a batch
      if (infoList && infoList.length) {
        const statements = [];
        const insertPositions = [];
        infoList.forEach((info) => {
          const row = pick(info || {}, INFO_FIELDS);
          const infoCols = keys(row);
          const infoVals = infoCols.map((k) => row[k]);
          // Ensure primary uniqueness per (contact_id, type)
          if (row.is_primary) {
            statements.push({
              sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ?;',
              params: [id, row.type],
            });
          }
          statements.push({
            sql: `INSERT INTO contact_info (contact_id, ${infoCols.join(', ')}) VALUES (?, ${placeholders(
              infoCols.length
            )});`,
            params: [id, ...infoVals],
          });
          insertPositions.push(statements.length - 1);
        });
        const results = await batch(statements);
        const insertedIds = insertPositions
          .map((idx) => results[idx]?.insertId)
          .filter((x) => !!x);
        // Not strictly needed to return, but useful
        return { id, contact_info_ids: insertedIds };
      }

      return { id };
    },

    async getById(id) {
      const res = await execute('SELECT * FROM contacts WHERE id = ?;', [id]);
      return res.rows[0] || null;
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
      return res.rows;
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }
      const contactData = pick(data, CONTACT_FIELDS);
      if (Object.keys(contactData).length === 0) {
        return this.getById(id);
      }
      const sets = Object.keys(contactData).map((k) => `${k} = ?`);
      const vals = Object.keys(contactData).map((k) => contactData[k]);
      await execute(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?;`, [...vals, id]);
      const updated = await this.getById(id);
      return updated;
    },

    async delete(id) {
      const res = await execute('DELETE FROM contacts WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    async search(query) {
      const q = `%${String(query || '').trim()}%`;
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
      return res.rows;
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
      return res.rows;
    },

    async getFavorites() {
      const res = await execute(
        `SELECT * FROM contacts WHERE is_favorite = 1 ORDER BY last_name ASC, first_name ASC;`
      );
      return res.rows;
    },

    async getWithContactInfo(id) {
      const [cRes, iRes] = await Promise.all([
        execute('SELECT * FROM contacts WHERE id = ?;', [id]),
        execute(
          'SELECT * FROM contact_info WHERE contact_id = ? ORDER BY type ASC, is_primary DESC, id ASC;',
          [id]
        ),
      ]);
      const contact = cRes.rows[0] || null;
      if (!contact) return null;
      return { ...contact, contact_info: iRes.rows };
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
      const contact = cRes.rows[0] || null;
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

    async addContactInfo(contactId, infoData) {
      const items = Array.isArray(infoData) ? infoData : [infoData];
      const statements = [];
      const insertIdx = [];
      items.forEach((info) => {
        const row = pick(info || {}, INFO_FIELDS);
        const cols = keys(row);
        const vals = cols.map((k) => row[k]);
        if (!row.type || !row.value) {
          throw new DatabaseError('Contact info requires type and value', 'VALIDATION_ERROR');
        }
        if (row.is_primary) {
          statements.push({
            sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ?;',
            params: [contactId, row.type],
          });
        }
        statements.push({
          sql: `INSERT INTO contact_info (contact_id, ${cols.join(', ')}) VALUES (?, ${placeholders(
            cols.length
          )});`,
          params: [contactId, ...vals],
        });
        insertIdx.push(statements.length - 1);
      });
      // Auto-update last interaction when info is added
      const results = await batch([...statements, { sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;', params: [contactId] }]);
      const ids = insertIdx.map((i) => results[i]?.insertId).filter((x) => !!x);
      if (!ids.length) return [];
      const fetched = await execute(
        `SELECT * FROM contact_info WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC;`,
        ids
      );
      return fetched.rows;
    },

    async updateContactInfo(infoId, data) {
      if (!data || Object.keys(data).length === 0) {
        const res = await execute('SELECT * FROM contact_info WHERE id = ?;', [infoId]);
        return res.rows[0] || null;
      }
      const currentRes = await execute('SELECT contact_id, type, is_primary FROM contact_info WHERE id = ?;', [infoId]);
      const current = currentRes.rows[0];
      if (!current) return null;

      const infoData = pick(data, INFO_FIELDS);
      const sets = Object.keys(infoData).map((k) => `${k} = ?`);
      const vals = Object.keys(infoData).map((k) => infoData[k]);
      
      // Build batch statements
      const statements = [];
      
      if (sets.length) {
        statements.push({ sql: `UPDATE contact_info SET ${sets.join(', ')} WHERE id = ?;`, params: [...vals, infoId] });
      }
      
      // Handle primary uniqueness
      if (infoData.is_primary) {
        // Explicitly setting as primary - clear others for the new/current type
        statements.push({
          sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ? AND id <> ?;',
          params: [current.contact_id, infoData.type || current.type, infoId],
        });
      } else if (infoData.type && current.is_primary && infoData.is_primary === undefined) {
        // Type is changing and current record is primary, but is_primary not explicitly provided
        // Clear other primaries for the new type to preserve uniqueness
        statements.push({
          sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ? AND id <> ?;',
          params: [current.contact_id, infoData.type, infoId],
        });
      }
      
      // Always update last interaction when contact info is modified
      if (statements.length > 0) {
        statements.push({ sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;', params: [current.contact_id] });
        await batch(statements);
      }
      const res = await execute('SELECT * FROM contact_info WHERE id = ?;', [infoId]);
      return res.rows[0] || null;
    },

    async deleteContactInfo(infoId) {
      const res = await execute('DELETE FROM contact_info WHERE id = ?;', [infoId]);
      return res.rowsAffected || 0;
    },
  };
}

export default createContactsDB;
