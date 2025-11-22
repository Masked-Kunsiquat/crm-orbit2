// Events Recurring database module
// Focused on recurring events and birthday calculations

import { DatabaseError } from './errors';
import { parseLocalDate, formatDateToString } from '../utils/dateUtils';

/**
 * Get the next occurrence date for a recurring event
 * @param {string} eventDate - The original event date (YYYY-MM-DD)
 * @param {string} recurrencePattern - 'yearly' or 'monthly'
 * @param {string} [fromDate] - Calculate from this date (defaults to today)
 * @returns {string|null} Next occurrence date in YYYY-MM-DD format
 */
function calculateNextOccurrence(
  eventDate,
  recurrencePattern,
  fromDate = null
) {
  if (!eventDate || !recurrencePattern) return null;

  // Parse original event date components
  const [eventYear, eventMonth, eventDay] = eventDate.split('-').map(Number);

  // Get today's local date components using dateUtils
  const today = fromDate ? parseLocalDate(fromDate) : new Date();
  if (!today || isNaN(today.getTime())) {
    return null;
  }
  today.setHours(0, 0, 0, 0);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // getMonth() is 0-based
  const todayDay = today.getDate();

  if (recurrencePattern === 'yearly') {
    let nextYear = todayYear;
    let nextMonth = eventMonth;
    let nextDay = eventDay;

    // Handle Feb 29 on non-leap years
    if (eventMonth === 2 && eventDay === 29) {
      if (!isLeapYear(nextYear)) {
        nextDay = 28;
      }
    }

    // Create candidate date for this year
    const thisYearDate = new Date(nextYear, nextMonth - 1, nextDay);
    thisYearDate.setHours(0, 0, 0, 0);

    // If this year's occurrence has passed, move to next year
    if (thisYearDate < today) {
      nextYear += 1;
      // Re-check Feb 29 for the new year
      if (eventMonth === 2 && eventDay === 29 && !isLeapYear(nextYear)) {
        nextDay = 28;
      } else {
        nextDay = eventDay; // Reset to original day
      }
    }

    return formatDateToString(new Date(nextYear, nextMonth - 1, nextDay));
  } else if (recurrencePattern === 'monthly') {
    let nextYear = todayYear;
    let nextMonth = todayMonth;
    let nextDay = eventDay;

    // Adjust day if target month has fewer days than event day
    const daysInMonth = getDaysInMonth(nextYear, nextMonth);
    if (nextDay > daysInMonth) {
      nextDay = daysInMonth;
    }

    // Create candidate date for this month
    const thisMonthDate = new Date(nextYear, nextMonth - 1, nextDay);
    thisMonthDate.setHours(0, 0, 0, 0);

    // If this month's occurrence has passed, move to next month
    if (thisMonthDate < today) {
      nextMonth += 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      // Re-check days in the new month
      const newDaysInMonth = getDaysInMonth(nextYear, nextMonth);
      nextDay = eventDay > newDaysInMonth ? newDaysInMonth : eventDay;
    }

    return formatDateToString(new Date(nextYear, nextMonth - 1, nextDay));
  }

  return null;
}

/**
 * Check if a year is a leap year
 * @param {number} year - Year to check
 * @returns {boolean} True if leap year
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get number of days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in the month
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
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
      const res = await execute('SELECT * FROM events WHERE id = ?;', [
        eventId,
      ]);
      const event = res.rows[0];

      if (!event || !event.recurring) {
        return null;
      }

      const nextDate = calculateNextOccurrence(
        event.event_date,
        event.recurrence_pattern,
        fromDate
      );
      if (!nextDate) return null;

      return {
        ...event,
        event_date: nextDate,
        is_calculated: true,
      };
    },

    /**
     * Get all recurring events with their next occurrences
     * @param {object} [options] - Query options
     * @returns {Promise<object[]>} Events with calculated next occurrences
     */
    async getRecurringEvents(options = {}) {
      const { limit = 100, offset = 0 } = options;

      const sql =
        'SELECT * FROM events WHERE recurring = 1 ORDER BY event_date ASC LIMIT ? OFFSET ?;';
      const res = await execute(sql, [limit, offset]);

      const eventsWithOccurrences = [];
      for (const event of res.rows) {
        const nextDate = calculateNextOccurrence(
          event.event_date,
          event.recurrence_pattern
        );
        if (nextDate) {
          eventsWithOccurrences.push({
            ...event,
            next_occurrence: nextDate,
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
      const monthDay = `${month}-${day}`;

      const sql = `SELECT e.*, c.first_name, c.last_name, c.display_name
                   FROM events e
                   JOIN contacts c ON e.contact_id = c.id
                   WHERE e.event_type = 'birthday'
                   AND substr(e.event_date, 6, 5) = ?
                   ORDER BY c.display_name ASC;`;

      const res = await execute(sql, [monthDay]);
      return res.rows;
    },

    /**
     * Get upcoming birthdays within specified days
     * @param {number} [days=30] - Number of days to look ahead
     * @returns {Promise<object[]>} Birthday events with calculated next occurrences
     */
    async getUpcomingBirthdays(days = 30) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
          const nextBirthday = parseLocalDate(nextDate);
          if (nextBirthday && !isNaN(nextBirthday.getTime())) {
            const daysDiff = Math.round(
              (nextBirthday - today) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff >= 0 && daysDiff <= days) {
              birthdays.push({
                ...event,
                next_occurrence: nextDate,
                days_until: daysDiff,
              });
            }
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
      today.setHours(0, 0, 0, 0);
      const upcoming = [];

      const sql =
        'SELECT * FROM events WHERE recurring = 1 ORDER BY event_date ASC;';
      const res = await execute(sql);

      for (const event of res.rows) {
        const nextDate = calculateNextOccurrence(
          event.event_date,
          event.recurrence_pattern
        );
        if (nextDate) {
          const nextEvent = parseLocalDate(nextDate);
          if (nextEvent && !isNaN(nextEvent.getTime())) {
            const daysDiff = Math.round(
              (nextEvent - today) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff >= 0 && daysDiff <= days) {
              upcoming.push({
                ...event,
                next_occurrence: nextDate,
                days_until: daysDiff,
              });
            }
          }
        }
      }

      return upcoming.sort((a, b) => a.days_until - b.days_until);
    },
  };
}

export default createEventsRecurringDB;
