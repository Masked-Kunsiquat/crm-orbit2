/**
 * Date and Time Utility Functions
 *
 * Centralized date handling to avoid UTC/local timezone issues.
 *
 * Key Principle: Database stores dates as 'YYYY-MM-DD' strings (date-only, no time).
 * When parsing these strings, we must create local Date objects at midnight local time,
 * NOT UTC midnight (which would shift the day in non-UTC timezones).
 */

/**
 * Parse a YYYY-MM-DD string into a local Date at midnight local time.
 * Avoids the UTC shift problem when using new Date('YYYY-MM-DD').
 *
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} - Date object at local midnight, or null if invalid
 */
export function parseLocalDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Match YYYY-MM-DD format
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  // Month is 0-indexed in Date constructor
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

/**
 * Format a Date object or YYYY-MM-DD string to YYYY-MM-DD string.
 * Always uses local date components.
 *
 * @param {Date|string} date - Date object or YYYY-MM-DD string
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function formatDateToString(date) {
  if (!date) {
    return '';
  }

  // If already a string in correct format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert to Date if needed
  const dateObj = date instanceof Date ? date : parseLocalDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse a date value that could be a string, Date object, or timestamp.
 * For YYYY-MM-DD strings, returns local midnight Date.
 * For Date objects or timestamps, returns as-is or converts to Date.
 *
 * @param {Date|string|number|null|undefined} value - Date value in various formats
 * @returns {Date} - Parsed Date object (defaults to now if invalid)
 */
export function parseFlexibleDate(value) {
  if (!value) {
    return new Date();
  }

  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }

  // String in YYYY-MM-DD format - parse as local date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = parseLocalDate(value);
    return parsed || new Date();
  }

  // Timestamp or other string format
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Format a date for display with smart labels (Today, Tomorrow, or formatted date).
 *
 * @param {string|Date} dateValue - Date string (YYYY-MM-DD) or Date object
 * @param {Function} t - i18n translation function (optional)
 * @returns {string} - Formatted date string
 */
export function formatDateSmart(dateValue, t = null) {
  const date = typeof dateValue === 'string' ? parseLocalDate(dateValue) : dateValue;
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return t ? t('events.today') : 'Today';
  } else if (eventDate.getTime() === tomorrow.getTime()) {
    return t ? t('events.tomorrow') : 'Tomorrow';
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Compare two date strings or Date objects for sorting.
 * Handles YYYY-MM-DD strings correctly as local dates.
 *
 * @param {string|Date} dateA - First date
 * @param {string|Date} dateB - Second date
 * @returns {number} - Negative if dateA < dateB, positive if dateA > dateB, 0 if equal
 */
export function compareDates(dateA, dateB) {
  const a = typeof dateA === 'string' ? parseLocalDate(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseLocalDate(dateB) : dateB;

  if (!a || isNaN(a.getTime())) return 1; // Invalid dates sort last
  if (!b || isNaN(b.getTime())) return -1;

  return a.getTime() - b.getTime();
}

/**
 * Check if a date is today (local timezone).
 *
 * @param {string|Date} dateValue - Date to check
 * @returns {boolean} - True if date is today
 */
export function isToday(dateValue) {
  const date = typeof dateValue === 'string' ? parseLocalDate(dateValue) : dateValue;
  if (!date || isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a date is in the past (local timezone).
 *
 * @param {string|Date} dateValue - Date to check
 * @returns {boolean} - True if date is before today
 */
export function isPast(dateValue) {
  const date = typeof dateValue === 'string' ? parseLocalDate(dateValue) : dateValue;
  if (!date || isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate.getTime() < today.getTime();
}

/**
 * Check if a date is in the future (local timezone).
 *
 * @param {string|Date} dateValue - Date to check
 * @returns {boolean} - True if date is after today
 */
export function isFuture(dateValue) {
  const date = typeof dateValue === 'string' ? parseLocalDate(dateValue) : dateValue;
  if (!date || isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate.getTime() > today.getTime();
}

/**
 * Add days to a date.
 *
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} - New date with days added
 */
export function addDays(date, days) {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return new Date();
  }

  const result = new Date(dateObj);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the number of days between two dates.
 *
 * @param {Date|string} dateA - First date
 * @param {Date|string} dateB - Second date
 * @returns {number} - Number of days (can be negative if dateA is after dateB)
 */
export function daysBetween(dateA, dateB) {
  const a = typeof dateA === 'string' ? parseLocalDate(dateA) : new Date(dateA);
  const b = typeof dateB === 'string' ? parseLocalDate(dateB) : new Date(dateB);

  if (!a || isNaN(a.getTime()) || !b || isNaN(b.getTime())) {
    return 0;
  }

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  const diffTime = b.getTime() - a.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
