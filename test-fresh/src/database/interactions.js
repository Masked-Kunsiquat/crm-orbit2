// Interactions database module
// Focused on core CRUD operations and basic filtering

import { DatabaseError } from './errors';
import { pick, placeholders, buildUpdateSet } from './sqlHelpers';

const INTERACTION_FIELDS = [
  'contact_id',
  'interaction_datetime',
  'title',
  'note',
  'interaction_type',
  'custom_type',
  'duration',
];

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
        throw new DatabaseError(
          'Missing required fields: contact_id, title, interaction_type',
          'VALIDATION_ERROR'
        );
      }

      const interactionData = pick(data, INTERACTION_FIELDS);

      // Set default interaction_datetime if not provided
      if (!interactionData.interaction_datetime) {
        interactionData.interaction_datetime = new Date().toISOString();
      }

      const fields = Object.keys(interactionData);
      const values = Object.values(interactionData);

      // Perform INSERT + last_interaction_at update atomically in a single transaction
      if (!transaction) {
        throw new DatabaseError(
          'Transaction support required for create',
          'TRANSACTION_REQUIRED'
        );
      }

      const insertedId = await transaction(tx => {
        // Schedule both statements synchronously to ensure they execute in the same transaction
        const insertSql = `INSERT INTO interactions (${fields.join(', ')}, created_at)
                           VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;

        let newId = null;
        const insertPromise = tx.execute(insertSql, values).then(res => {
          if (!res.insertId) {
            throw new DatabaseError(
              'Failed to create interaction',
              'CREATE_FAILED'
            );
          }
          newId = res.insertId;
          return res;
        });

        // Recompute last_interaction_at from interactions to avoid bumping on backfilled records
        const updateContactPromise = tx.execute(
          'UPDATE contacts SET last_interaction_at = (SELECT MAX(interaction_datetime) FROM interactions WHERE contact_id = ?) WHERE id = ?;',
          [data.contact_id, data.contact_id]
        );

        return Promise.all([insertPromise, updateContactPromise]).then(
          () => newId
        );
      });

      return this.getById(insertedId);
    },

    async getById(id) {
      const res = await execute('SELECT * FROM interactions WHERE id = ?;', [
        id,
      ]);
      return res.rows[0] || null;
    },

    async getAll(options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'interaction_datetime',
        orderDir = 'DESC',
      } = options;
      const order = [
        'interaction_datetime',
        'title',
        'interaction_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'interaction_datetime';
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

      const { setClause, values } = buildUpdateSet(interactionData);

      if (!transaction) {
        throw new DatabaseError(
          'Transaction support required for update',
          'TRANSACTION_REQUIRED'
        );
      }

      await transaction(tx => {
        // 1) Update the interaction row
        const updateSql = `UPDATE interactions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`;
        const updatePromise = tx.execute(updateSql, [...values, id]);

        // 2) Determine old/new contact IDs
        const oldContactId = existing.contact_id;
        const newContactId = Object.prototype.hasOwnProperty.call(
          interactionData,
          'contact_id'
        )
          ? interactionData.contact_id
          : oldContactId;

        // 3) Recompute last_interaction_at via MAX(datetime) for each distinct affected contact
        const contactIds = new Set([oldContactId, newContactId]);
        const recalcPromises = [];
        for (const contactId of contactIds) {
          recalcPromises.push(
            tx.execute(
              'UPDATE contacts SET last_interaction_at = (SELECT MAX(interaction_datetime) FROM interactions WHERE contact_id = ?) WHERE id = ?;',
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
        throw new DatabaseError(
          'Transaction support required for delete',
          'TRANSACTION_REQUIRED'
        );
      }

      // Perform a transactional delete with atomic recalc of the affected contact's last_interaction_at
      // Strategy: compute the post-delete last_interaction_at by taking MAX(datetime) excluding
      // the soon-to-be-deleted interaction, then delete the interaction. This yields the same
      // final state as delete-then-recalc while keeping all operations inside one transaction
      // without needing to await between execute calls.
      const rowsAffected = await transaction(tx => {
        const updateSql = `UPDATE contacts
                             SET last_interaction_at = (
                               SELECT MAX(interaction_datetime) FROM interactions
                               WHERE contact_id = (SELECT contact_id FROM interactions WHERE id = ?)
                                 AND id != ?
                             )
                           WHERE id = (SELECT contact_id FROM interactions WHERE id = ?);`;

        const updatePromise = tx.execute(updateSql, [id, id, id]);
        const deletePromise = tx.execute(
          'DELETE FROM interactions WHERE id = ?;',
          [id]
        );

        return Promise.all([updatePromise, deletePromise]).then(
          ([_u, delRes]) => delRes.rowsAffected || 0
        );
      });

      return rowsAffected;
    },

    // Bulk operations
    async bulkCreate(interactions) {
      if (!Array.isArray(interactions) || interactions.length === 0) {
        throw new DatabaseError(
          'bulkCreate requires a non-empty array of interactions',
          'VALIDATION_ERROR'
        );
      }

      if (!transaction) {
        throw new DatabaseError(
          'Transaction support required for bulkCreate',
          'TRANSACTION_REQUIRED'
        );
      }

      return await transaction(tx => {
        const results = [];
        const contactIds = new Set();
        const executePromises = [];

        // Collect contact IDs first (synchronously)
        for (const data of interactions) {
          if (
            !data ||
            !data.contact_id ||
            !data.title ||
            !data.interaction_type
          ) {
            throw new DatabaseError(
              'Each interaction must have contact_id, title, and interaction_type',
              'VALIDATION_ERROR'
            );
          }
          contactIds.add(data.contact_id);
        }

        // Schedule all SQL calls synchronously to match WebSQL semantics
        for (const data of interactions) {
          const interactionData = pick(data, INTERACTION_FIELDS);

          // Set default interaction_datetime if not provided
          if (!interactionData.interaction_datetime) {
            interactionData.interaction_datetime = new Date().toISOString();
          }

          const fields = Object.keys(interactionData);
          const values = Object.values(interactionData);

          const sql = `INSERT INTO interactions (${fields.join(', ')}, created_at) 
                       VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;

          // Schedule execute call synchronously - do not await here
          const executePromise = tx.execute(sql, values).then(res => {
            if (!res.insertId) {
              throw new DatabaseError(
                'Failed to create interaction in bulk operation',
                'CREATE_FAILED'
              );
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
                                     SELECT MAX(i.interaction_datetime)
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
  };
}

export default createInteractionsDB;
