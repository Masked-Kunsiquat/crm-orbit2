// Interactions database module
// Follows the API pattern defined in src/database/AGENTS.md

import { DatabaseError } from './errors';

const INTERACTION_FIELDS = [
  'contact_id',
  'datetime',
  'title',
  'note',
  'interaction_type',
  'custom_type',
  'duration',
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

// Clamp helpers and date range normalization
const MAX_PAGE_SIZE = 500;

function clampLimit(n, max = MAX_PAGE_SIZE) {
  const num = Number(n) || 0;
  if (num < 1) return 1;
  return Math.min(num, max);
}

function clampOffset(n) {
  const num = Number(n) || 0;
  return num < 0 ? 0 : num;
}

function isDateOnlyString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeDateRange(startDate, endDate) {
  let start = startDate;
  let end = endDate;
  let endOp = '<='; // default inclusive end

  if (start && isDateOnlyString(start)) {
    start = new Date(start).toISOString();
  }
  if (end && isDateOnlyString(end)) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() + 1);
    end = d.toISOString();
    endOp = '<';
  }

  return { start, end, endOp };
}

/**
 * Create the interactions database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Interactions database API
 */
export function createInteractionsDB({ execute, batch, transaction }) {
  // Helper to recalculate a contact's last_interaction_at based on existing interactions
  async function recalcContactLastInteraction(contactId) {
    // Set last_interaction_at to MAX(datetime) for the contact, or NULL if none
    await execute(
      'UPDATE contacts SET last_interaction_at = (SELECT MAX(datetime) FROM interactions WHERE contact_id = ?) WHERE id = ?;',
      [contactId, contactId]
    );
  }

  return {
    // Core CRUD operations
    async create(data) {
      if (!data || !data.contact_id || !data.title || !data.interaction_type) {
        throw new DatabaseError('Missing required fields: contact_id, title, interaction_type', 'VALIDATION_ERROR');
      }

      const interactionData = pick(data, INTERACTION_FIELDS);
      
      // Set default datetime if not provided
      if (!interactionData.datetime) {
        interactionData.datetime = new Date().toISOString();
      }

      const fields = Object.keys(interactionData);
      const values = Object.values(interactionData);

      // Perform INSERT + last_interaction_at update atomically in a single transaction
      if (!transaction) {
        throw new DatabaseError('Transaction support required for create', 'TRANSACTION_REQUIRED');
      }

      const insertedId = await transaction((tx) => {
        // Schedule both statements synchronously to ensure they execute in the same transaction
        const insertSql = `INSERT INTO interactions (${fields.join(', ')}, created_at)
                           VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;

        let newId = null;
        const insertPromise = tx.execute(insertSql, values).then((res) => {
          if (!res.insertId) {
            throw new DatabaseError('Failed to create interaction', 'CREATE_FAILED');
          }
          newId = res.insertId;
          return res;
        });

        // Recompute last_interaction_at from interactions to avoid bumping on backfilled records
        const updateContactPromise = tx.execute(
          'UPDATE contacts SET last_interaction_at = (SELECT MAX(datetime) FROM interactions WHERE contact_id = ?) WHERE id = ?;',
          [data.contact_id, data.contact_id]
        );

        return Promise.all([insertPromise, updateContactPromise]).then(() => newId);
      });

      return this.getById(insertedId);
    },

    async getById(id) {
      const res = await execute('SELECT * FROM interactions WHERE id = ?;', [id]);
      return res.rows[0] || null;
    },

    async getAll(options = {}) {
      const { limit = 50, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [clampLimit(limit), clampOffset(offset)]);
      return res.rows;
    },

    async update(id, data) {
      // Ensure the record exists first; throw if not found
      const existing = await this.getById(id);
      if (!existing) {
        throw new DatabaseError('Interaction not found', 'NOT_FOUND');
      }

      // If payload is empty, return existing as a no-op
      if (!data || Object.keys(data).length === 0) {
        return existing;
      }

      const interactionData = pick(data, INTERACTION_FIELDS);
      // If no updatable fields after filtering, return existing as a no-op
      if (Object.keys(interactionData).length === 0) {
        return existing;
      }

      const sets = Object.keys(interactionData).map(k => `${k} = ?`);
      const vals = Object.values(interactionData);

      if (!transaction) {
        throw new DatabaseError('Transaction support required for update', 'TRANSACTION_REQUIRED');
      }

      await transaction((tx) => {
        // 1) Update the interaction row
        const updateSql = `UPDATE interactions SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`;
        const updatePromise = tx.execute(updateSql, [...vals, id]);

        // 2) Determine old/new contact IDs
        const oldContactId = existing.contact_id;
        const newContactId = Object.prototype.hasOwnProperty.call(interactionData, 'contact_id')
          ? interactionData.contact_id
          : oldContactId;

        // 3) Recompute last_interaction_at via MAX(datetime) for each distinct affected contact
        const contactIds = new Set([oldContactId, newContactId]);
        const recalcPromises = [];
        for (const contactId of contactIds) {
          recalcPromises.push(
            tx.execute(
              'UPDATE contacts SET last_interaction_at = (SELECT MAX(datetime) FROM interactions WHERE contact_id = ?) WHERE id = ?;',
              [contactId, contactId]
            )
          );
        }

        return Promise.all([updatePromise, ...recalcPromises]).then(() => true);
      });

      return this.getById(id);
    },

    async delete(id) {
      if (!transaction) {
        throw new DatabaseError('Transaction support required for delete', 'TRANSACTION_REQUIRED');
      }

      // Perform a transactional delete with atomic recalc of the affected contact's last_interaction_at
      // Strategy: compute the post-delete last_interaction_at by taking MAX(datetime) excluding
      // the soon-to-be-deleted interaction, then delete the interaction. This yields the same
      // final state as delete-then-recalc while keeping all operations inside one transaction
      // without needing to await between execute calls.
      const rowsAffected = await transaction((tx) => {
        const updateSql = `UPDATE contacts
                             SET last_interaction_at = (
                               SELECT MAX(datetime) FROM interactions
                               WHERE contact_id = (SELECT contact_id FROM interactions WHERE id = ?)
                                 AND id != ?
                             )
                           WHERE id = (SELECT contact_id FROM interactions WHERE id = ?);`;

        const updatePromise = tx.execute(updateSql, [id, id, id]);
        const deletePromise = tx.execute('DELETE FROM interactions WHERE id = ?;', [id]);

        return Promise.all([updatePromise, deletePromise]).then(([_u, delRes]) => delRes.rowsAffected || 0);
      });

      return rowsAffected;
    },

    // Search & Filter operations
    async getByContact(contactId, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions WHERE contact_id = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [contactId, clampLimit(limit), clampOffset(offset)]);
      return res.rows;
    },

    async getRecent(options = {}) {
      const { limit = 20, days = 7 } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoff = cutoffDate.toISOString();
      
      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   WHERE i.datetime >= ? 
                   ORDER BY i.datetime DESC 
                   LIMIT ?;`;
      const res = await execute(sql, [cutoff, clampLimit(limit)]);
      return res.rows;
    },

    async getByType(interactionType, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions
                   WHERE interaction_type = ? OR (custom_type IS NOT NULL AND custom_type = ?)
                   ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [interactionType, interactionType, clampLimit(limit), clampOffset(offset)]);
      return res.rows;
    },

    async getByDateRange(startDate, endDate, options = {}) {
      const { limit = 100, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const { start, end, endOp } = normalizeDateRange(startDate, endDate);
      const conds = [];
      const params = [];
      if (start) { conds.push('datetime >= ?'); params.push(start); }
      if (end)   { conds.push(`datetime ${endOp} ?`); params.push(end); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT * FROM interactions ${where} ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      params.push(clampLimit(limit), clampOffset(offset));
      const res = await execute(sql, params);
      return res.rows;
    },

    // Statistics operations
    async getStatistics(options = {}) {
      const { contactId, startDate, endDate } = options;
      const conditions = [];
      const params = [];
      
      if (contactId) {
        conditions.push('contact_id = ?');
        params.push(contactId);
      }
      
      const { start, end, endOp } = normalizeDateRange(startDate, endDate);
      if (start) {
        conditions.push('datetime >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(`datetime ${endOp} ?`);
        params.push(end);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get count by type
      const typeCountSql = `SELECT interaction_type, COUNT(*) as count 
                           FROM interactions ${whereClause} 
                           GROUP BY interaction_type 
                           ORDER BY count DESC;`;
      const typeCountRes = await execute(typeCountSql, params);
      
      // Get average duration for calls and meetings
      const avgDurationSql = `SELECT interaction_type, AVG(duration) as avg_duration 
                             FROM interactions 
                             ${whereClause} 
                             ${whereClause ? 'AND' : 'WHERE'} interaction_type IN ('call', 'meeting') 
                             AND duration IS NOT NULL 
                             GROUP BY interaction_type;`;
      const avgDurationRes = await execute(avgDurationSql, params);
      
      // Get total counts
      const totalSql = `SELECT COUNT(*) as total_interactions,
                               COUNT(DISTINCT contact_id) as unique_contacts,
                               MIN(datetime) as earliest_interaction,
                               MAX(datetime) as latest_interaction
                        FROM interactions ${whereClause};`;
      const totalRes = await execute(totalSql, params);
      
      return {
        totalInteractions: totalRes.rows[0]?.total_interactions || 0,
        uniqueContacts: totalRes.rows[0]?.unique_contacts || 0,
        earliestInteraction: totalRes.rows[0]?.earliest_interaction,
        latestInteraction: totalRes.rows[0]?.latest_interaction,
        countByType: typeCountRes.rows.reduce((acc, row) => {
          acc[row.interaction_type] = row.count;
          return acc;
        }, {}),
        averageDuration: avgDurationRes.rows.reduce((acc, row) => {
          acc[row.interaction_type] = Math.round(row.avg_duration);
          return acc;
        }, {})
      };
    },

    // Bulk operations
    async bulkCreate(interactions) {
      if (!Array.isArray(interactions) || interactions.length === 0) {
        throw new DatabaseError('bulkCreate requires a non-empty array of interactions', 'VALIDATION_ERROR');
      }

      if (!transaction) {
        throw new DatabaseError('Transaction support required for bulkCreate', 'TRANSACTION_REQUIRED');
      }

      return await transaction((tx) => {
        const results = [];
        const contactIds = new Set();
        const executePromises = [];
        
        // Collect contact IDs first (synchronously)
        for (const data of interactions) {
          if (!data || !data.contact_id || !data.title || !data.interaction_type) {
            throw new DatabaseError('Each interaction must have contact_id, title, and interaction_type', 'VALIDATION_ERROR');
          }
          contactIds.add(data.contact_id);
        }
        
        // Schedule all SQL calls synchronously to match WebSQL semantics
        for (const data of interactions) {
          const interactionData = pick(data, INTERACTION_FIELDS);
          
          // Set default datetime if not provided
          if (!interactionData.datetime) {
            interactionData.datetime = new Date().toISOString();
          }

          const fields = Object.keys(interactionData);
          const values = Object.values(interactionData);
          
          const sql = `INSERT INTO interactions (${fields.join(', ')}, created_at) 
                       VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
          
          // Schedule execute call synchronously - do not await here
          const executePromise = tx.execute(sql, values).then(res => {
            if (!res.insertId) {
              throw new DatabaseError('Failed to create interaction in bulk operation', 'CREATE_FAILED');
            }
            results.push({ id: res.insertId, ...interactionData });
            return res;
          });
          executePromises.push(executePromise);
        }
        
        // Schedule a single contacts recalc update for all affected contacts
        if (contactIds.size > 0) {
          const ids = Array.from(contactIds);
          const placeholdersList = ids.map(() => '?').join(', ');
          const bulkUpdateSql = `UPDATE contacts
                                   SET last_interaction_at = (
                                     SELECT MAX(i.datetime)
                                     FROM interactions i
                                     WHERE i.contact_id = contacts.id
                                   )
                                 WHERE id IN (${placeholdersList});`;
          const bulkUpdatePromise = tx.execute(bulkUpdateSql, ids);
          executePromises.push(bulkUpdatePromise);
        }
        
        // Return a promise that resolves after all operations complete
        return Promise.all(executePromises).then(() => results);
      });
    },

    // Additional utility methods
    async getContactInteractionSummary(contactId) {
      const sql = `SELECT 
                     interaction_type,
                     COUNT(*) as count,
                     MAX(datetime) as last_interaction,
                     AVG(duration) as avg_duration
                   FROM interactions 
                   WHERE contact_id = ? 
                   GROUP BY interaction_type 
                   ORDER BY count DESC;`;
      
      const res = await execute(sql, [contactId]);
      return res.rows;
    },

    async searchInteractions(query, options = {}) {
      const { limit = 50, offset = 0 } = options;
      const term = String(query || '').trim();
      if (!term || term.length < 2) return [];
      
      const searchTerm = `%${term}%`;
      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   WHERE i.title LIKE ? OR i.note LIKE ? OR c.display_name LIKE ?
                   ORDER BY i.datetime DESC 
                   LIMIT ? OFFSET ?;`;
      
      const res = await execute(sql, [searchTerm, searchTerm, searchTerm, clampLimit(limit), clampOffset(offset)]);
      return res.rows;
    }
  };
}

export default createInteractionsDB;
