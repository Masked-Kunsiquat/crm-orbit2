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

/**
 * Create the interactions database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Interactions database API
 */
export function createInteractionsDB({ execute, batch, transaction }) {
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
      
      const sql = `INSERT INTO interactions (${fields.join(', ')}, created_at) 
                   VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
      
      const res = await execute(sql, values);
      if (!res.insertId) {
        throw new DatabaseError('Failed to create interaction', 'CREATE_FAILED');
      }
      
      // Auto-update contact's last_interaction_at
      await execute(
        'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [data.contact_id]
      );
      
      return this.getById(res.insertId);
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
      const res = await execute(sql, [limit, offset]);
      return res.rows;
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      const existing = await this.getById(id);
      if (!existing) {
        throw new DatabaseError('Interaction not found', 'NOT_FOUND');
      }

      const interactionData = pick(data, INTERACTION_FIELDS);
      if (Object.keys(interactionData).length === 0) {
        return existing;
      }

      const sets = Object.keys(interactionData).map(k => `${k} = ?`);
      const vals = Object.values(interactionData);
      
      await execute(
        `UPDATE interactions SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...vals, id]
      );

      // Update contact's last_interaction_at when interaction is modified
      await execute(
        'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [existing.contact_id]
      );

      return this.getById(id);
    },

    async delete(id) {
      const res = await execute('DELETE FROM interactions WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    // Search & Filter operations
    async getByContact(contactId, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions WHERE contact_id = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [contactId, limit, offset]);
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
      const res = await execute(sql, [cutoff, limit]);
      return res.rows;
    },

    async getByType(interactionType, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions WHERE interaction_type = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [interactionType, limit, offset]);
      return res.rows;
    },

    async getByDateRange(startDate, endDate, options = {}) {
      const { limit = 100, offset = 0, orderBy = 'datetime', orderDir = 'DESC' } = options;
      const order = ['datetime', 'title', 'interaction_type', 'created_at'].includes(orderBy) ? orderBy : 'datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const sql = `SELECT * FROM interactions WHERE datetime >= ? AND datetime <= ? 
                   ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [startDate, endDate, limit, offset]);
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
      
      if (startDate) {
        conditions.push('datetime >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        conditions.push('datetime <= ?');
        params.push(endDate);
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
        
        // Schedule contact update calls synchronously (now that we have all contactIds)
        for (const contactId of contactIds) {
          const updatePromise = tx.execute(
            'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
            [contactId]
          );
          executePromises.push(updatePromise);
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
      if (!term) return [];
      
      const searchTerm = `%${term}%`;
      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   WHERE i.title LIKE ? OR i.note LIKE ? OR c.display_name LIKE ?
                   ORDER BY i.datetime DESC 
                   LIMIT ? OFFSET ?;`;
      
      const res = await execute(sql, [searchTerm, searchTerm, searchTerm, limit, offset]);
      return res.rows;
    }
  };
}

export default createInteractionsDB;