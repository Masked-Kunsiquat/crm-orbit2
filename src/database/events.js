// Events database module
// Follows the API pattern defined in src/database/AGENTS.md

import { DatabaseError } from './errors';

const EVENT_FIELDS = [
  'contact_id',
  'title',
  'event_type',
  'event_date',
  'recurring',
  'recurrence_pattern',
  'notes',
];

const REMINDER_FIELDS = [
  'event_id',
  'reminder_datetime',
  'reminder_type',
  'is_sent',
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
 * Get the next occurrence date for a recurring event
 * @param {string} eventDate - The original event date (YYYY-MM-DD)
 * @param {string} recurrencePattern - 'yearly' or 'monthly'
 * @param {string} [fromDate] - Calculate from this date (defaults to today)
 * @returns {string|null} Next occurrence date in YYYY-MM-DD format
 */
function calculateNextOccurrence(eventDate, recurrencePattern, fromDate = null) {
  if (!eventDate || !recurrencePattern) return null;
  
  const baseDate = new Date(eventDate + 'T00:00:00');
  const today = fromDate ? new Date(fromDate + 'T00:00:00') : new Date();
  today.setHours(0, 0, 0, 0);
  
  if (recurrencePattern === 'yearly') {
    const nextDate = new Date(baseDate);
    nextDate.setFullYear(today.getFullYear());
    
    // If this year's occurrence has passed, move to next year
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  } else if (recurrencePattern === 'monthly') {
    const nextDate = new Date(baseDate);
    nextDate.setFullYear(today.getFullYear());
    nextDate.setMonth(today.getMonth());
    
    // If this month's occurrence has passed, move to next month
    if (nextDate < today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  }
  
  return null;
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
      if (!data || !data.contact_id || !data.title || !data.event_type || !data.event_date) {
        throw new DatabaseError('Missing required fields: contact_id, title, event_type, event_date', 'VALIDATION_ERROR');
      }

      const eventData = pick(data, EVENT_FIELDS);
      const fields = Object.keys(eventData);
      const values = Object.values(eventData);
      
      const sql = `INSERT INTO events (${fields.join(', ')}, created_at) 
                   VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
      
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
    },

    async getById(id) {
      const res = await execute('SELECT * FROM events WHERE id = ?;', [id]);
      return res.rows[0] || null;
    },

    async getAll(options = {}) {
      const { limit = 50, offset = 0, orderBy = 'event_date', orderDir = 'ASC' } = options;
      const order = ['event_date', 'title', 'event_type', 'created_at'].includes(orderBy) ? orderBy : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      const sql = `SELECT * FROM events ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [limit, offset]);
      return res.rows;
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

    // Search & Filter operations
    async getByContact(contactId, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'event_date', orderDir = 'ASC' } = options;
      const order = ['event_date', 'title', 'event_type', 'created_at'].includes(orderBy) ? orderBy : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      const sql = `SELECT * FROM events WHERE contact_id = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [contactId, limit, offset]);
      return res.rows;
    },

    async getUpcoming(options = {}) {
      const { limit = 50, offset = 0, days = 30 } = options;
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const future = futureDate.toISOString().split('T')[0];
      
      const sql = `SELECT * FROM events WHERE event_date >= ? AND event_date <= ? 
                   ORDER BY event_date ASC LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [today, future, limit, offset]);
      return res.rows;
    },

    async getPast(options = {}) {
      const { limit = 50, offset = 0, days = 30 } = options;
      const today = new Date().toISOString().split('T')[0];
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      const past = pastDate.toISOString().split('T')[0];
      
      const sql = `SELECT * FROM events WHERE event_date < ? AND event_date >= ? 
                   ORDER BY event_date DESC LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [today, past, limit, offset]);
      return res.rows;
    },

    async getByDateRange(startDate, endDate, options = {}) {
      const { limit = 100, offset = 0, orderBy = 'event_date', orderDir = 'ASC' } = options;
      const order = ['event_date', 'title', 'event_type', 'created_at'].includes(orderBy) ? orderBy : 'event_date';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      const sql = `SELECT * FROM events WHERE event_date >= ? AND event_date <= ? 
                   ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [startDate, endDate, limit, offset]);
      return res.rows;
    },

    // Event with reminders operations
    async createWithReminders(eventData, reminders = []) {
      if (!transaction) {
        throw new DatabaseError('Transaction support required for createWithReminders', 'TRANSACTION_REQUIRED');
      }

      return await transaction(async (tx) => {
        // Create the event
        const eventFields = pick(eventData, EVENT_FIELDS);
        const fields = Object.keys(eventFields);
        const values = Object.values(eventFields);
        
        const eventSql = `INSERT INTO events (${fields.join(', ')}, created_at) 
                         VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
        
        const eventRes = await tx.execute(eventSql, values);
        const eventId = eventRes.insertId;
        
        // Create reminders if provided
        if (reminders.length > 0) {
          for (const reminderData of reminders) {
            const reminder = { ...pick(reminderData, REMINDER_FIELDS), event_id: eventId };
            const reminderFields = Object.keys(reminder);
            const reminderValues = Object.values(reminder);
            
            const reminderSql = `INSERT INTO event_reminders (${reminderFields.join(', ')}, created_at) 
                               VALUES (${placeholders(reminderFields.length)}, CURRENT_TIMESTAMP);`;
            
            await tx.execute(reminderSql, reminderValues);
          }
        }
        
        // Update contact's last_interaction_at
        await tx.execute(
          'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [eventData.contact_id]
        );
        
        // Return the event with reminders
        const event = await tx.execute('SELECT * FROM events WHERE id = ?;', [eventId]);
        const reminderRes = await tx.execute('SELECT * FROM event_reminders WHERE event_id = ?;', [eventId]);
        
        return {
          ...event.rows[0],
          reminders: reminderRes.rows
        };
      });
    },

    async updateReminders(eventId, reminders) {
      if (!transaction) {
        throw new DatabaseError('Transaction support required for updateReminders', 'TRANSACTION_REQUIRED');
      }

      return await transaction(async (tx) => {
        // Get the event to update contact interaction
        const eventRes = await tx.execute('SELECT contact_id FROM events WHERE id = ?;', [eventId]);
        const event = eventRes.rows[0];
        
        if (!event) {
          throw new DatabaseError('Event not found', 'NOT_FOUND');
        }

        // Delete existing reminders
        await tx.execute('DELETE FROM event_reminders WHERE event_id = ?;', [eventId]);
        
        // Insert new reminders
        for (const reminderData of reminders) {
          const reminder = { ...pick(reminderData, REMINDER_FIELDS), event_id: eventId };
          const fields = Object.keys(reminder);
          const values = Object.values(reminder);
          
          const sql = `INSERT INTO event_reminders (${fields.join(', ')}, created_at) 
                      VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
          
          await tx.execute(sql, values);
        }
        
        // Update contact's last_interaction_at
        await tx.execute(
          'UPDATE contacts SET last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [event.contact_id]
        );
        
        // Return updated reminders
        const res = await tx.execute('SELECT * FROM event_reminders WHERE event_id = ?;', [eventId]);
        return res.rows;
      });
    },

    // Recurring event operations
    async getNextOccurrence(eventId, fromDate = null) {
      const event = await this.getById(eventId);
      if (!event || !event.recurring) {
        return null;
      }
      
      const nextDate = calculateNextOccurrence(event.event_date, event.recurrence_pattern, fromDate);
      if (!nextDate) return null;
      
      return {
        ...event,
        event_date: nextDate,
        is_calculated: true
      };
    },

    // Birthday-specific operations
    async getTodaysBirthdays() {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      
      const sql = `SELECT e.*, c.first_name, c.last_name, c.display_name 
                   FROM events e 
                   JOIN contacts c ON e.contact_id = c.id 
                   WHERE e.event_type = 'birthday' 
                   AND substr(e.event_date, 6, 5) = ?
                   ORDER BY c.display_name ASC;`;
      
      const res = await execute(sql, [`${month}-${day}`]);
      return res.rows;
    },

    async getUpcomingBirthdays(days = 30) {
      const today = new Date();
      const birthdays = [];
      
      // Get all birthday events
      const sql = `SELECT e.*, c.first_name, c.last_name, c.display_name 
                   FROM events e 
                   JOIN contacts c ON e.contact_id = c.id 
                   WHERE e.event_type = 'birthday' 
                   ORDER BY e.event_date ASC;`;
      
      const res = await execute(sql);
      
      // Calculate next occurrence for each birthday within the date range
      for (const event of res.rows) {
        const nextDate = calculateNextOccurrence(event.event_date, 'yearly');
        if (nextDate) {
          const nextBirthday = new Date(nextDate + 'T00:00:00');
          const daysDiff = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= days) {
            birthdays.push({
              ...event,
              next_occurrence: nextDate,
              days_until: daysDiff
            });
          }
        }
      }
      
      // Sort by days until birthday
      return birthdays.sort((a, b) => a.days_until - b.days_until);
    }
  };
}

export default createEventsDB;