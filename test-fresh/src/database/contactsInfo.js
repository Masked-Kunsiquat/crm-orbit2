// Contacts Info database module
// Focused on contact_info table operations and relationships

import { DatabaseError } from './errors';

const INFO_FIELDS = ['type', 'subtype', 'value', 'label', 'is_primary'];

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

/**
 * Create the contacts info database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Contacts info database API
 */
export function createContactsInfoDB({ execute, batch, transaction }) {
  return {
    async getWithContactInfo(id) {
      const [contactRes, infoRes] = await Promise.all([
        execute('SELECT * FROM contacts WHERE id = ?;', [id]),
        execute(
          'SELECT * FROM contact_info WHERE contact_id = ? ORDER BY is_primary DESC, type ASC;',
          [id]
        ),
      ]);

      const contact = contactRes.rows[0];
      if (!contact) return null;

      return {
        ...contact,
        contact_info: infoRes.rows,
      };
    },

    async addContactInfo(contactId, infoData) {
      // Handle both single object and array of objects
      const items = Array.isArray(infoData) ? infoData : [infoData];

      if (items.length === 0) {
        throw new DatabaseError(
          'Contact info data is required',
          'VALIDATION_ERROR'
        );
      }

      const contactRes = await execute(
        'SELECT id FROM contacts WHERE id = ?;',
        [contactId]
      );
      if (contactRes.rows.length === 0) {
        throw new DatabaseError('Contact not found', 'NOT_FOUND');
      }

      const statements = [];
      const insertIdx = [];

      items.forEach(info => {
        if (!info || !info.type || !info.value) {
          throw new DatabaseError(
            'Missing required fields: type, value',
            'VALIDATION_ERROR'
          );
        }

        const data = pick(info, INFO_FIELDS);
        data.contact_id = contactId;

        const fields = Object.keys(data);
        const values = Object.values(data);

        // Handle primary uniqueness if requested
        if (data.is_primary) {
          statements.push({
            sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ?;',
            params: [contactId, data.type],
          });
        }

        // Insert new contact info
        statements.push({
          sql: `INSERT INTO contact_info (${fields.join(', ')}, created_at) VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`,
          params: values,
        });
        insertIdx.push(statements.length - 1);
      });

      // Always update last interaction when contact info is modified
      statements.push({
        sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
        params: [contactId],
      });

      const results = await batch(statements);
      const insertedIds = insertIdx
        .map(i => results[i]?.insertId)
        .filter(x => !!x);

      if (!insertedIds.length) return [];

      // Return the inserted records
      const res = await execute(
        `SELECT * FROM contact_info WHERE id IN (${insertedIds.map(() => '?').join(', ')}) ORDER BY id ASC;`,
        insertedIds
      );
      return res.rows;
    },

    async getContactInfoList(ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return [];
      }

      const fetched = await execute(
        `SELECT * FROM contact_info WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC;`,
        ids
      );
      return fetched.rows;
    },

    /**
     * Fetch all contact_info rows for a set of contact IDs in a single query.
     * @param {number[]} contactIds
     * @returns {Promise<Array<object>>}
     */
    async getAllInfoForContacts(contactIds) {
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return [];
      }
      const unique = [...new Set(contactIds)];
      const res = await execute(
        `SELECT * FROM contact_info WHERE contact_id IN (${unique.map(() => '?').join(', ')})
         ORDER BY contact_id ASC, is_primary DESC, id ASC;`,
        unique
      );
      return res.rows;
    },

    async updateContactInfo(infoId, data) {
      if (!data || Object.keys(data).length === 0) {
        const res = await execute('SELECT * FROM contact_info WHERE id = ?;', [
          infoId,
        ]);
        return res.rows[0] || null;
      }

      const currentRes = await execute(
        'SELECT contact_id, type, is_primary FROM contact_info WHERE id = ?;',
        [infoId]
      );
      const current = currentRes.rows[0];
      if (!current) return null;

      const infoData = pick(data, INFO_FIELDS);
      const sets = Object.keys(infoData).map(k => `${k} = ?`);
      const vals = Object.keys(infoData).map(k => infoData[k]);

      // Build batch statements
      const statements = [];

      if (sets.length) {
        statements.push({
          sql: `UPDATE contact_info SET ${sets.join(', ')} WHERE id = ?;`,
          params: [...vals, infoId],
        });
      }

      // Handle primary uniqueness
      if (infoData.is_primary) {
        // Explicitly setting as primary - clear others for the new/current type
        statements.push({
          sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ? AND id <> ?;',
          params: [current.contact_id, infoData.type || current.type, infoId],
        });
      } else if (
        infoData.type &&
        current.is_primary &&
        infoData.is_primary === undefined
      ) {
        // Type is changing and current record is primary, but is_primary not explicitly provided
        // Clear other primaries for the new type to preserve uniqueness
        statements.push({
          sql: 'UPDATE contact_info SET is_primary = 0 WHERE contact_id = ? AND type = ? AND id <> ?;',
          params: [current.contact_id, infoData.type, infoId],
        });
      }

      // Always update last interaction when contact info is modified
      if (statements.length > 0) {
        statements.push({
          sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          params: [current.contact_id],
        });
        await batch(statements);
      }

      const res = await execute('SELECT * FROM contact_info WHERE id = ?;', [
        infoId,
      ]);
      return res.rows[0] || null;
    },

    async deleteContactInfo(infoId) {
      if (!transaction) {
        // Fallback to batch if transaction not available
        const currentRes = await execute(
          'SELECT contact_id FROM contact_info WHERE id = ?;',
          [infoId]
        );
        const current = currentRes.rows[0];
        if (!current) return 0;

        const results = await batch([
          { sql: 'DELETE FROM contact_info WHERE id = ?;', params: [infoId] },
          {
            sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
            params: [current.contact_id],
          },
        ]);
        return results[0]?.rowsAffected || 0;
      }

      // Use transaction for atomic operation
      return await transaction(async tx => {
        // Get contact_id before deletion
        const currentRes = await tx.execute(
          'SELECT contact_id FROM contact_info WHERE id = ?;',
          [infoId]
        );
        const current = currentRes.rows[0];
        if (!current) return 0;

        // Delete contact info record
        const deleteRes = await tx.execute(
          'DELETE FROM contact_info WHERE id = ?;',
          [infoId]
        );
        const rowsAffected = deleteRes.rowsAffected || 0;

        // Update parent contact's last interaction timestamp
        if (rowsAffected > 0) {
          await tx.execute(
            'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
            [current.contact_id]
          );
        }

        return rowsAffected;
      });
    },

    async getContactInfoByType(contactId, type) {
      const res = await execute(
        'SELECT * FROM contact_info WHERE contact_id = ? AND type = ? ORDER BY is_primary DESC, created_at ASC;',
        [contactId, type]
      );
      return res.rows;
    },

    async getPrimaryContactInfo(contactId, type) {
      const res = await execute(
        'SELECT * FROM contact_info WHERE contact_id = ? AND type = ? AND is_primary = 1 LIMIT 1;',
        [contactId, type]
      );
      return res.rows[0] || null;
    },
  };
}

export default createContactsInfoDB;
