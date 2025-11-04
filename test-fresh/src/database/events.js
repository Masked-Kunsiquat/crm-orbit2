// Events database module
// Focused on core event CRUD and search operations

import { DatabaseError } from './errors';
import { addDays, formatDateToString } from '../utils/dateUtils';

const EVENT_FIELDS = [
  'contact_id',
  'title',
  'event_type',
  'event_date',
  'recurring',
  'recurrence_pattern',
  'notes',
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

function convertBooleanFields(row) {
  if (!row) return row;
  const converted = { ...row };
  const booleanFields = ['recurring'];
  for (const key of booleanFields) {
    if (key in converted) {
      const v = converted[key];
      converted[key] = v === true || v === 1 || v === '1';
    }
  }
  return converted;
}

/**
 * Create the events database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Events database API
 */
export function createEventsDB({ execute, batch, transaction }) {
  return {
    // Core CRUD operations
    async create(data) {
      if (
        !data ||
        !data.contact_id ||
        !data.title ||
        !data.event_type ||
        !data.event_date
      ) {
        throw new DatabaseError(
          'Missing required fields: contact_id, title, event_type, event_date',
          'VALIDATION_ERROR'
        );
      }

      const eventData = pick(data, EVENT_FIELDS);
      const fields = Object.keys(eventData);
      const values = Object.values(eventData);

      const sql = `INSERT INTO events (${fields.join(', ')}, created_at) 
                   VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;

      try {
        const res = await execute(sql, values);
        if (!res.insertId) {
          throw new DatabaseError('Failed to create event', 'CREATE_FAILED');
        }

        // Update contact's last_interaction_at
        await execute(
          'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [data.contact_id]
        );

        return this.getById(res.insertId);
      } catch (error) {
        // Handle foreign key constraint errors - check message and nested error properties
        const errorMessage =
          error.message || error.cause?.message || error.originalError?.message;
        if (
          errorMessage &&
          errorMessage.includes('FOREIGN KEY constraint failed')
        ) {
          throw new DatabaseError('Contact not found', 'NOT_FOUND', error);
        }
        // Re-throw other errors as-is
        throw error;
      }
    },

    async getById(id) {
      const res = await execute('SELECT * FROM events WHERE id = ?;', [id]);
      return convertBooleanFields(res.rows[0]) || null;
    },

    async getAll(options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'event_date',
        orderDir = 'ASC',
      } = options;
      const order = [
        'event_date',
        'title',
        'event_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM events ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      const existing = await this.getById(id);
      if (!existing) {
        throw new DatabaseError('Event not found', 'NOT_FOUND');
      }

      const eventData = pick(data, EVENT_FIELDS);
      if (Object.keys(eventData).length === 0) {
        return existing;
      }

      const sets = Object.keys(eventData).map(k => `${k} = ?`);
      const vals = Object.values(eventData);

      await execute(
        `UPDATE events SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...vals, id]
      );

      // Update contact's last_interaction_at
      await execute(
        'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [existing.contact_id]
      );

      return this.getById(id);
    },

    async delete(id) {
      const res = await execute('DELETE FROM events WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    // Search and filter operations
    async getByContact(contactId, options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'event_date',
        orderDir = 'ASC',
      } = options;
      const order = [
        'event_date',
        'title',
        'event_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM events WHERE contact_id = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [contactId, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    async getUpcoming(options = {}) {
      const { limit = 50, offset = 0, days = 30 } = options;
      const today = formatDateToString(new Date());
      const futureDate = addDays(new Date(), days) || new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const future = formatDateToString(futureDate);

      const sql = `SELECT * FROM events WHERE event_date >= ? AND event_date <= ?
                   ORDER BY event_date ASC LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [today, future, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    async getPast(options = {}) {
      const { limit = 50, offset = 0, days = 30 } = options;
      const today = formatDateToString(new Date());
      const pastDate = addDays(new Date(), -days) || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const past = formatDateToString(pastDate);

      const sql = `SELECT * FROM events WHERE event_date < ? AND event_date >= ?
                   ORDER BY event_date DESC LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [today, past, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    async getByDateRange(startDate, endDate, options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'event_date',
        orderDir = 'ASC',
      } = options;
      const order = [
        'event_date',
        'title',
        'event_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM events WHERE event_date >= ? AND event_date <= ? 
                   ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [startDate, endDate, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    // Event type filtering
    async getByType(eventType, options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'event_date',
        orderDir = 'ASC',
      } = options;
      const order = ['event_date', 'title', 'created_at'].includes(orderBy)
        ? orderBy
        : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM events WHERE event_type = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [eventType, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },
  };
}

export default createEventsDB;
