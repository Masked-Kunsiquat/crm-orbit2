// Events Reminders database module
// Focused on event reminder management

import { DatabaseError } from './errors';

const REMINDER_FIELDS = [
  'event_id',
  'reminder_datetime',
  'reminder_type',
  'is_sent',
];

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
 * Format date for SQLite comparison (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatSQLiteDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Create the events reminders database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Events reminders database API
 */
export function createEventsRemindersDB({ execute, batch, transaction }) {
  return {
    /**
     * Create an event with reminders in a single transaction
     * @param {object} eventData - Event data
     * @param {object[]} [reminders=[]] - Array of reminder data
     * @returns {Promise<object>} Created event with reminders
     */
    async createEventWithReminders(eventData, reminders = []) {
      if (!transaction) {
        throw new DatabaseError('Transaction support required for createEventWithReminders', 'TRANSACTION_REQUIRED');
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

    /**
     * Get all reminders for an event
     * @param {number} eventId - Event ID
     * @returns {Promise<object[]>} Event reminders
     */
    async getEventReminders(eventId) {
      const res = await execute('SELECT * FROM event_reminders WHERE event_id = ? ORDER BY reminder_datetime ASC;', [eventId]);
      return res.rows;
    },

    /**
     * Create a reminder for an event
     * @param {object} reminderData - Reminder data including event_id
     * @returns {Promise<object>} Created reminder
     */
    async createReminder(reminderData) {
      if (!reminderData || !reminderData.event_id || !reminderData.reminder_datetime) {
        throw new DatabaseError('Missing required fields: event_id, reminder_datetime', 'VALIDATION_ERROR');
      }

      const reminder = pick(reminderData, REMINDER_FIELDS);
      const fields = Object.keys(reminder);
      const values = Object.values(reminder);
      
      const sql = `INSERT INTO event_reminders (${fields.join(', ')}, created_at) 
                  VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;
      
      try {
        const res = await execute(sql, values);
        if (!res.insertId) {
          throw new DatabaseError('Failed to create reminder', 'CREATE_FAILED');
        }
        
        const created = await execute('SELECT * FROM event_reminders WHERE id = ?;', [res.insertId]);
        return created.rows[0];
      } catch (error) {
        // Handle foreign key constraint errors
        if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
          throw new DatabaseError('Event not found', 'NOT_FOUND', error);
        }
        // Re-throw other errors as-is
        throw error;
      }
    },

    /**
     * Update reminders for an event (replaces all existing)
     * @param {number} eventId - Event ID
     * @param {object[]} reminders - Array of reminder data
     * @returns {Promise<object[]>} Updated reminders
     */
    async updateEventReminders(eventId, reminders) {
      if (!transaction) {
        throw new DatabaseError('Transaction support required for updateEventReminders', 'TRANSACTION_REQUIRED');
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

    /**
     * Delete a reminder
     * @param {number} reminderId - Reminder ID
     * @returns {Promise<number>} Number of rows deleted
     */
    async deleteReminder(reminderId) {
      const res = await execute('DELETE FROM event_reminders WHERE id = ?;', [reminderId]);
      return res.rowsAffected || 0;
    },

    /**
     * Mark a reminder as sent
     * @param {number} reminderId - Reminder ID
     * @returns {Promise<object|null>} Updated reminder
     */
    async markReminderSent(reminderId) {
      await execute('UPDATE event_reminders SET is_sent = 1 WHERE id = ?;', [reminderId]);
      const res = await execute('SELECT * FROM event_reminders WHERE id = ?;', [reminderId]);
      return res.rows[0] || null;
    },

    /**
     * Get pending reminders (not sent and past due)
     * @param {string} [beforeDateTime] - Get reminders before this datetime (defaults to now)
     * @returns {Promise<object[]>} Pending reminders with event details
     */
    async getPendingReminders(beforeDateTime = null) {
      const cutoffDate = beforeDateTime ? new Date(beforeDateTime) : new Date();
      const cutoff = formatSQLiteDateTime(cutoffDate);
      
      const sql = `SELECT r.*, e.title, e.event_date, e.contact_id, c.display_name as contact_name
                   FROM event_reminders r
                   JOIN events e ON r.event_id = e.id
                   JOIN contacts c ON e.contact_id = c.id
                   WHERE r.is_sent = 0 AND r.reminder_datetime <= ?
                   ORDER BY r.reminder_datetime ASC;`;
      
      const res = await execute(sql, [cutoff]);
      return res.rows;
    },

    /**
     * Get upcoming reminders within specified hours
     * @param {number} [hours=24] - Number of hours to look ahead
     * @returns {Promise<object[]>} Upcoming reminders with event details
     */
    async getUpcomingReminders(hours = 24) {
      const now = new Date();
      const future = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      
      const sql = `SELECT r.*, e.title, e.event_date, e.contact_id, c.display_name as contact_name
                   FROM event_reminders r
                   JOIN events e ON r.event_id = e.id
                   JOIN contacts c ON e.contact_id = c.id
                   WHERE r.is_sent = 0 AND r.reminder_datetime BETWEEN ? AND ?
                   ORDER BY r.reminder_datetime ASC;`;
      
      const res = await execute(sql, [formatSQLiteDateTime(now), formatSQLiteDateTime(future)]);
      return res.rows;
    }
  };
}

export default createEventsRemindersDB;