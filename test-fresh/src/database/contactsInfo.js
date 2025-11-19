// Contacts Info database module
// Focused on contact_info table operations and relationships

import { DatabaseError } from './errors';
import { pick, placeholders, buildUpdateSet } from './sqlHelpers';
import { is } from '../utils/validators';
import { unique } from '../utils/arrayHelpers';

const INFO_FIELDS = ['type', 'subtype', 'value', 'label', 'is_primary'];

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
        execute(
          `SELECT c.*, comp.name as company_name, comp.industry as company_industry
           FROM contacts c
           LEFT JOIN companies comp ON c.company_id = comp.id
           WHERE c.id = ?;`,
          [id]
        ),
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
      const items = is.array(infoData) ? infoData : [infoData];

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
      if (!is.array(ids) || ids.length === 0) {
        return [];
      }

      const fetched = await execute(
        `SELECT * FROM contact_info WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC;`,
        ids
      );
      return fetched.rows;
    },

    /**
     * Replace all contact_info rows for a contact atomically.
     * Deletes existing rows and inserts the provided items in a single transaction.
     * @param {number} contactId
     * @param {Array<{type:string, value:string, label?:string, is_primary?:number|boolean}>} infoData
     * @returns {Promise<boolean>} True on success
     */
    async replaceContactInfo(contactId, infoData, txOverride) {
      const items = is.array(infoData) ? infoData : [infoData];
      // Always allow empty replace to just clear info
      const doStatementsBuild = () => {
        const statements = [];
        // Clear all existing info for this contact
        statements.push({
          sql: 'DELETE FROM contact_info WHERE contact_id = ?;',
          params: [contactId],
        });

        for (const info of items) {
          if (!info) continue;
          const record = pick(info, INFO_FIELDS);
          if (!record.type || !record.value) continue;
          if (record.is_primary !== undefined) {
            record.is_primary =
              record.is_primary === true ||
              record.is_primary === 1 ||
              record.is_primary === '1'
                ? 1
                : 0;
          }
          record.contact_id = contactId;
          const fields = Object.keys(record);
          const values = Object.values(record);
          statements.push({
            sql: `INSERT INTO contact_info (${fields.join(', ')}, created_at) VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`,
            params: values,
          });
        }

        // Touch parent contact for last interaction timestamp
        statements.push({
          sql: 'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          params: [contactId],
        });
        return statements;
      };

      if (txOverride && txOverride.execute) {
        await txOverride.execute(
          'DELETE FROM contact_info WHERE contact_id = ?;',
          [contactId]
        );
        for (const info of items) {
          if (!info) continue;
          const record = pick(info, INFO_FIELDS);
          if (!record.type || !record.value) continue;
          if (record.is_primary !== undefined) {
            record.is_primary =
              record.is_primary === true ||
              record.is_primary === 1 ||
              record.is_primary === '1'
                ? 1
                : 0;
          }
          record.contact_id = contactId;
          const fields = Object.keys(record);
          const values = Object.values(record);
          await txOverride.execute(
            `INSERT INTO contact_info (${fields.join(', ')}, created_at) VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`,
            values
          );
        }
        await txOverride.execute(
          'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [contactId]
        );
        return true;
      }

      if (transaction) {
        await transaction(async tx => {
          await tx.execute('DELETE FROM contact_info WHERE contact_id = ?;', [
            contactId,
          ]);
          for (const info of items) {
            if (!info) continue;
            const record = pick(info, INFO_FIELDS);
            if (!record.type || !record.value) continue;
            if (record.is_primary !== undefined) {
              record.is_primary =
                record.is_primary === true ||
                record.is_primary === 1 ||
                record.is_primary === '1'
                  ? 1
                  : 0;
            }
            record.contact_id = contactId;
            const fields = Object.keys(record);
            const values = Object.values(record);
            await tx.execute(
              `INSERT INTO contact_info (${fields.join(', ')}, created_at) VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`,
              values
            );
          }
          await tx.execute(
            'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
            [contactId]
          );
        });
        return true;
      }

      // Fallback to batch which also runs inside a transaction in our DB layer
      const statements = doStatementsBuild();
      await batch(statements);
      return true;
    },

    /**
     * Fetch all contact_info rows for a set of contact IDs in a single query.
     * @param {number[]} contactIds
     * @returns {Promise<Array<object>>}
     */
    async getAllInfoForContacts(contactIds) {
      if (!is.array(contactIds) || contactIds.length === 0) {
        return [];
      }
      const uniqueIds = unique(contactIds);
      const res = await execute(
        `SELECT * FROM contact_info WHERE contact_id IN (${uniqueIds.map(() => '?').join(', ')})
         ORDER BY contact_id ASC, is_primary DESC, id ASC;`,
        uniqueIds
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
      const { setClause, values } = buildUpdateSet(infoData);

      // Build batch statements
      const statements = [];

      if (setClause) {
        statements.push({
          sql: `UPDATE contact_info SET ${setClause} WHERE id = ?;`,
          params: [...values, infoId],
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
