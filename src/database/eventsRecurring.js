// Events Recurring database module
// Focused on recurring events and birthday calculations

import { DatabaseError } from './errors';

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
 * Create the events recurring database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Events recurring database API
 */
export function createEventsRecurringDB({ execute, batch, transaction }) {
  return {
    /**
     * Get the next occurrence of a recurring event
     * @param {number} eventId - Event ID
     * @param {string} [fromDate] - Calculate from this date (defaults to today)
     * @returns {Promise<object|null>} Event with next occurrence date or null
     */
    async getNextOccurrence(eventId, fromDate = null) {
      const res = await execute('SELECT * FROM events WHERE id = ?;', [eventId]);
      const event = res.rows[0];
      
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

    /**
     * Get all recurring events with their next occurrences
     * @param {object} [options] - Query options
     * @returns {Promise<object[]>} Events with calculated next occurrences
     */
    async getRecurringEvents(options = {}) {
      const { limit = 100, offset = 0 } = options;
      
      const sql = 'SELECT * FROM events WHERE recurring = 1 ORDER BY event_date ASC LIMIT ? OFFSET ?;';
      const res = await execute(sql, [limit, offset]);
      
      const eventsWithOccurrences = [];
      for (const event of res.rows) {
        const nextDate = calculateNextOccurrence(event.event_date, event.recurrence_pattern);
        if (nextDate) {
          eventsWithOccurrences.push({
            ...event,
            next_occurrence: nextDate
          });
        }
      }
      
      return eventsWithOccurrences;
    },

    /**
     * Get today's birthdays
     * @returns {Promise<object[]>} Birthday events occurring today
     */
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

    /**
     * Get upcoming birthdays within specified days
     * @param {number} [days=30] - Number of days to look ahead
     * @returns {Promise<object[]>} Birthday events with calculated next occurrences
     */
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
    },

    /**
     * Get upcoming recurring events within specified days
     * @param {number} [days=30] - Number of days to look ahead
     * @returns {Promise<object[]>} Recurring events with calculated next occurrences
     */
    async getUpcomingRecurring(days = 30) {
      const today = new Date();
      const upcoming = [];
      
      const sql = 'SELECT * FROM events WHERE recurring = 1 ORDER BY event_date ASC;';
      const res = await execute(sql);
      
      for (const event of res.rows) {
        const nextDate = calculateNextOccurrence(event.event_date, event.recurrence_pattern);
        if (nextDate) {
          const nextEvent = new Date(nextDate + 'T00:00:00');
          const daysDiff = Math.ceil((nextEvent - today) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= days) {
            upcoming.push({
              ...event,
              next_occurrence: nextDate,
              days_until: daysDiff
            });
          }
        }
      }
      
      return upcoming.sort((a, b) => a.days_until - b.days_until);
    }
  };
}

export default createEventsRecurringDB;