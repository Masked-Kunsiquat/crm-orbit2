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

function convertBooleanFields(row) {
  if (!row) return row;
  const out = { ...row };
  if ('is_sent' in out) out.is_sent = out.is_sent === 1 || out.is_sent === '1' || out.is_sent === true;
  return out;
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
          reminders: reminderRes.rows.map(convertBooleanFields)
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
      return res.rows.map(convertBooleanFields);
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
        return convertBooleanFields(created.rows[0]);
      } catch (error) {
        // Handle foreign key constraint errors - check nested error properties
        const checkForFKError = (err) => {
          if (!err) return false;
          // Check direct message
          if (err.message && err.message.includes('FOREIGN KEY constraint failed')) return true;
          // Check errno for FK constraint violation
          if (err.errno === 787) return true; // SQLITE_CONSTRAINT_FOREIGNKEY
          // Check nested error properties
          if (err.cause && checkForFKError(err.cause)) return true;
          if (err.originalError && checkForFKError(err.originalError)) return true;
          return false;
        };

        if (checkForFKError(error)) {
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
        return res.rows.map(convertBooleanFields);
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
      return convertBooleanFields(res.rows[0]) || null;
    },

    /**
     * Get pending reminders (not sent and past due)
     * @param {string} [beforeDateTime] - Get reminders before this datetime (defaults to now)
     * @param {number} [limit=100] - Maximum number of results
     * @param {number} [offset=0] - Number of results to skip
     * @returns {Promise<object[]>} Pending reminders with event details
     */
    async getPendingReminders(beforeDateTime = null, limit = 100, offset = 0) {
      const parsed = beforeDateTime ? new Date(beforeDateTime) : new Date();
      const cutoffDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed; // graceful fallback
      const cutoff = formatSQLiteDateTime(cutoffDate);
      // sanitize paging
      limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
      offset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
      
      const sql = `SELECT r.*, e.title, e.event_date, e.contact_id, c.display_name as contact_name
                   FROM event_reminders r
                   JOIN events e ON r.event_id = e.id
                   JOIN contacts c ON e.contact_id = c.id
                   WHERE r.is_sent = 0 AND r.reminder_datetime <= ?
                   ORDER BY r.reminder_datetime ASC
                   LIMIT ? OFFSET ?;`;
      
      const res = await execute(sql, [cutoff, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    /**
     * Get upcoming reminders within specified hours
     * @param {number} [hours=24] - Number of hours to look ahead
     * @param {number} [limit=100] - Maximum number of results
     * @param {number} [offset=0] - Number of results to skip
     * @returns {Promise<object[]>} Upcoming reminders with event details
     */
    async getUpcomingReminders(hours = 24, limit = 100, offset = 0) {
      hours = Number.isFinite(hours) && hours > 0 ? hours : 24;
      limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
      offset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
      const now = new Date();
      const future = new Date(now.getTime() + (hours * 60 * 60 * 1000));

      const sql = `SELECT r.*, e.title, e.event_date, e.contact_id, c.display_name as contact_name
                   FROM event_reminders r
                   JOIN events e ON r.event_id = e.id
                   JOIN contacts c ON e.contact_id = c.id
                   WHERE r.is_sent = 0 AND r.reminder_datetime BETWEEN ? AND ?
                   ORDER BY r.reminder_datetime ASC
                   LIMIT ? OFFSET ?;`;

      const res = await execute(sql, [formatSQLiteDateTime(now), formatSQLiteDateTime(future), limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    /**
     * Get all unsent reminders for a specific event
     * @param {number} eventId - Event ID
     * @returns {Promise<object[]>} Unsent reminders for the event
     */
    async getUnsentRemindersByEvent(eventId) {
      const sql = `SELECT * FROM event_reminders
                   WHERE event_id = ? AND is_sent = 0
                   ORDER BY reminder_datetime ASC;`;

      const res = await execute(sql, [eventId]);
      return res.rows.map(convertBooleanFields);
    },

    /**
     * Get all unsent reminders across all events
     * @returns {Promise<object[]>} All unsent reminders
     */
    async getUnsentReminders() {
      const sql = `SELECT r.*, e.title, e.event_date, e.contact_id
                   FROM event_reminders r
                   JOIN events e ON r.event_id = e.id
                   WHERE r.is_sent = 0
                   ORDER BY r.reminder_datetime ASC;`;

      const res = await execute(sql);
      return res.rows.map(convertBooleanFields);
    },

    /**
     * Update a specific reminder's datetime
     * @param {number} reminderId - Reminder ID
     * @param {string|Date} newDateTime - New reminder datetime (ISO string or Date object)
     * @returns {Promise<object|null>} Updated reminder
     */
    async updateReminderDateTime(reminderId, newDateTime) {
      if (!reminderId || !newDateTime) {
        throw new DatabaseError('Missing required fields: reminderId, newDateTime', 'VALIDATION_ERROR');
      }

      try {
        // Parse the incoming datetime (accept Date or ISO string)
        let parsedDate;
        if (newDateTime instanceof Date) {
          parsedDate = newDateTime;
        } else {
          parsedDate = new Date(newDateTime);
        }

        // Validate the parsed date
        if (isNaN(parsedDate.getTime())) {
          throw new DatabaseError('Invalid datetime format', 'VALIDATION_ERROR', null, { newDateTime });
        }

        // Format to SQLite datetime format (YYYY-MM-DD HH:MM:SS)
        const formattedDateTime = formatSQLiteDateTime(parsedDate);

        await execute(
          'UPDATE event_reminders SET reminder_datetime = ? WHERE id = ?;',
          [formattedDateTime, reminderId]
        );

        const res = await execute('SELECT * FROM event_reminders WHERE id = ?;', [reminderId]);
        return convertBooleanFields(res.rows[0]) || null;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to update reminder datetime', 'UPDATE_FAILED', error);
      }
    },

    /**
     * Mark reminders as scheduled with notification IDs
     * @param {Array<{reminderId: number, notificationId: string}>} scheduledItems - Reminders to mark as scheduled
     * @returns {Promise<number>} Number of reminders marked as scheduled
     */
    async markRemindersScheduled(scheduledItems) {
      if (!Array.isArray(scheduledItems) || scheduledItems.length === 0) {
        return 0;
      }

      if (!transaction) {
        throw new DatabaseError('Transaction support required for markRemindersScheduled', 'TRANSACTION_REQUIRED');
      }

      return await transaction(async (tx) => {
        // Filter and validate entries that have both reminderId and notificationId
        const validItems = scheduledItems.filter(
          ({ reminderId, notificationId }) => reminderId && notificationId
        );

        if (validItems.length === 0) {
          return 0;
        }

        // Build a single UPDATE using CASE...WHEN for different notification_id values
        const reminderIds = validItems.map(item => item.reminderId);
        const placeholders = reminderIds.map(() => '?').join(', ');

        // Create CASE statement for notification_id mapping
        const caseStatements = validItems.map(() => 'WHEN id = ? THEN ?').join(' ');

        const sql = `
          UPDATE event_reminders
          SET notification_id = CASE ${caseStatements} END,
              is_sent = 0
          WHERE id IN (${placeholders});
        `;

        // Build parameters: first the CASE parameters (id, notificationId pairs), then the IN clause ids
        const caseParams = [];
        for (const { reminderId, notificationId } of validItems) {
          caseParams.push(reminderId, notificationId);
        }
        const params = [...caseParams, ...reminderIds];

        const result = await tx.execute(sql, params);
        return result.rowsAffected || 0;
      });
    },

    /**
     * Mark reminders as failed to schedule
     * @param {number[]} reminderIds - Array of reminder IDs that failed to schedule
     * @returns {Promise<number>} Number of reminders marked as failed
     */
    async markRemindersFailed(reminderIds) {
      if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
        return 0;
      }

      // Filter out invalid IDs
      const validIds = reminderIds.filter(id => id && Number.isInteger(id));

      if (validIds.length === 0) {
        return 0;
      }

      // Build a single UPDATE using IN clause for batch processing
      const placeholders = validIds.map(() => '?').join(', ');
      const sql = `
        UPDATE event_reminders
        SET notification_id = NULL
        WHERE id IN (${placeholders});
      `;

      try {
        const result = await execute(sql, validIds);
        return result.rowsAffected || 0;
      } catch (error) {
        throw new DatabaseError('Failed to mark reminders as failed', 'UPDATE_FAILED', error);
      }
    },

    /**
     * Create reminders for recurring events in batch
     * @param {Array<{event_id: number, reminder_datetime: string, reminder_type: string}>} reminderData - Array of reminder data
     * @returns {Promise<object[]>} Created reminders
     */
    async createRecurringReminders(reminderData) {
      if (!Array.isArray(reminderData) || reminderData.length === 0) {
        return [];
      }

      const created = [];
      for (const data of reminderData) {
        const reminder = pick(data, REMINDER_FIELDS);
        reminder.is_sent = false; // Ensure new reminders are not marked as sent

        const fields = Object.keys(reminder);
        const values = Object.values(reminder);

        const sql = `INSERT INTO event_reminders (${fields.join(', ')}, created_at)
                     VALUES (${placeholders(fields.length)}, CURRENT_TIMESTAMP);`;

        const res = await execute(sql, values);
        if (res.insertId) {
          const newReminder = await execute('SELECT * FROM event_reminders WHERE id = ?;', [res.insertId]);
          created.push(convertBooleanFields(newReminder.rows[0]));
        }
      }
      return created;
    }
  };
}

export default createEventsRemindersDB;