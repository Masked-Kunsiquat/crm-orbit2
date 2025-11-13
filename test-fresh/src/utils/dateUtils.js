/**
 * Date and Time Utility Functions
 *
 * Centralized date handling to avoid UTC/local timezone issues.
 *
 * Key Principle: Database stores dates as 'YYYY-MM-DD' strings (date-only, no time).
 * When parsing these strings, we must create local Date objects at midnight local time,
 * NOT UTC midnight (which would shift the day in non-UTC timezones).
 */

import { getLocales } from 'expo-localization';
import { is } from './validators';

// ============================================================================
// LOCALE DETECTION
// ============================================================================

/**
 * Determine primary locale (BCP 47) from device.
 *
 * @returns {string} Locale code (e.g., 'en-US')
 */
export function getPrimaryLocale() {
  try {
    const locales = getLocales?.();
    return (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
  } catch (_) {
    // Fallback for older expo-localization API
    try {
      // eslint-disable-next-line global-require
      const Localization = require('expo-localization');
      return Localization.locale || 'en-US';
    } catch (_) {
      return 'en-US';
    }
  }
}

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse a YYYY-MM-DD string into a local Date at midnight local time.
 * Avoids the UTC shift problem when using new Date('YYYY-MM-DD').
 *
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} - Date object at local midnight, or null if invalid
 */
export function parseLocalDate(dateString) {
  if (!dateString || !is.string(dateString)) {
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
  if (is.string(date) && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert to Date if needed
  const dateObj = is.date(date) ? date : parseLocalDate(date);
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
 * @returns {Date|null} - Parsed Date object, or null if invalid/unparseable
 */
export function parseFlexibleDate(value) {
  if (!value) {
    return null;
  }

  // Already a Date object
  if (is.date(value)) {
    return isNaN(value.getTime()) ? null : value;
  }

  // String in YYYY-MM-DD format - parse as local date
  if (is.string(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDate(value);
  }

  // Timestamp or other string format
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format a date for display with smart labels (Today, Tomorrow, or formatted date).
 *
 * @param {string|Date} dateValue - Date string (YYYY-MM-DD) or Date object
 * @param {Function} t - i18n translation function (optional)
 * @param {string} locale - Locale code (default 'en-US')
 * @returns {string} - Formatted date string
 */
export function formatDateSmart(dateValue, t = null, locale = 'en-US') {
  const date = is.string(dateValue) ? parseLocalDate(dateValue) : dateValue;
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
    return date.toLocaleDateString(locale);
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
  const a = is.string(dateA) ? parseLocalDate(dateA) : dateA;
  const b = is.string(dateB) ? parseLocalDate(dateB) : dateB;

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
  const date = is.string(dateValue) ? parseLocalDate(dateValue) : dateValue;
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
  const date = is.string(dateValue) ? parseLocalDate(dateValue) : dateValue;
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
  const date = is.string(dateValue) ? parseLocalDate(dateValue) : dateValue;
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
 * Add days to a date (immutable).
 *
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date|null} - New date with days added, or null if input is invalid
 */
export function addDays(date, days) {
  if (!date && date !== 0) return null; // Check for null/undefined before new Date()
  const dateObj = is.string(date) ? parseLocalDate(date) : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return null;
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
  // Check for null/undefined before new Date()
  if ((!dateA && dateA !== 0) || (!dateB && dateB !== 0)) return 0;

  const a = is.string(dateA) ? parseLocalDate(dateA) : new Date(dateA);
  const b = is.string(dateB) ? parseLocalDate(dateB) : new Date(dateB);

  if (!a || isNaN(a.getTime()) || !b || isNaN(b.getTime())) {
    return 0;
  }

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  const diffTime = b.getTime() - a.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// SQLITE DATETIME HANDLING
// ============================================================================

/**
 * Format Date to SQLite datetime string (YYYY-MM-DD HH:MM:SS).
 * Always uses local timezone components.
 *
 * @param {Date|string|number} date - Date to format
 * @returns {string} SQLite datetime string
 */
export function toSQLiteDateTime(date) {
  if (!date && date !== 0) return ''; // Check for null/undefined before new Date()
  const dateObj = is.date(date) ? date : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parse SQLite datetime string to Date object.
 * Handles both 'YYYY-MM-DD HH:MM:SS' and 'YYYY-MM-DD' formats.
 *
 * @param {string} sqliteDateTime - SQLite datetime string
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseSQLiteDateTime(sqliteDateTime) {
  if (!sqliteDateTime || !is.string(sqliteDateTime)) {
    return null;
  }

  // Match YYYY-MM-DD HH:MM:SS format
  const dateTimeMatch = sqliteDateTime.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (dateTimeMatch) {
    const [, year, month, day, hours, minutes, seconds] = dateTimeMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10)
    );
  }

  // Fall back to date-only parsing
  return parseLocalDate(sqliteDateTime);
}

/**
 * Get current time as ISO string.
 *
 * @returns {string} ISO datetime string
 */
export function getCurrentISO() {
  return new Date().toISOString();
}

/**
 * Format date to filename-safe timestamp using local time.
 *
 * @param {Date} date - Date to format (defaults to now)
 * @returns {string} Filename-safe timestamp (YYYY-MM-DDTHH-MM-SS) or empty string if invalid
 */
export function toFilenameTimestamp(date = new Date()) {
  const dateObj = is.date(date) ? date : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return ''; // Return empty string for invalid input (consistent with formatDateToString, toSQLiteDateTime)
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}

// ============================================================================
// DATE/TIME ARITHMETIC
// ============================================================================

/**
 * Add hours to a date (immutable).
 *
 * @param {Date|string} date - Starting date
 * @param {number} hours - Hours to add (can be negative)
 * @returns {Date|null} New date with hours added, or null if input is invalid
 */
export function addHours(date, hours) {
  if (!date && date !== 0) return null; // Check for null/undefined before new Date()
  const dateObj = is.string(date) ? parseFlexibleDate(date) : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return null;
  }

  const result = new Date(dateObj);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date (immutable).
 *
 * @param {Date|string} date - Starting date
 * @param {number} minutes - Minutes to add (can be negative)
 * @returns {Date|null} New date with minutes added, or null if input is invalid
 */
export function addMinutes(date, minutes) {
  if (!date && date !== 0) return null; // Check for null/undefined before new Date()
  const dateObj = is.string(date) ? parseFlexibleDate(date) : new Date(date);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return null;
  }

  const result = new Date(dateObj);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Set date part of a datetime, preserving time (immutable).
 *
 * @param {Date} datetime - Original datetime
 * @param {Date} datePart - Date to extract date from
 * @returns {Date|null} New datetime with updated date part, or null if inputs are invalid
 */
export function setDatePart(datetime, datePart) {
  const dt = new Date(datetime);
  const dp = new Date(datePart);

  if (isNaN(dt.getTime()) || isNaN(dp.getTime())) {
    return null;
  }

  const result = new Date(dt);
  result.setFullYear(dp.getFullYear());
  result.setMonth(dp.getMonth());
  result.setDate(dp.getDate());
  return result;
}

/**
 * Set time part of a datetime, preserving date (immutable).
 *
 * @param {Date} datetime - Original datetime
 * @param {Date} timePart - Date to extract time from
 * @returns {Date|null} New datetime with updated time part, or null if inputs are invalid
 */
export function setTimePart(datetime, timePart) {
  const dt = new Date(datetime);
  const tp = new Date(timePart);

  if (isNaN(dt.getTime()) || isNaN(tp.getTime())) {
    return null;
  }

  const result = new Date(dt);
  result.setHours(tp.getHours());
  result.setMinutes(tp.getMinutes());
  result.setSeconds(tp.getSeconds());
  result.setMilliseconds(tp.getMilliseconds());
  return result;
}

// ============================================================================
// LOCALE-AWARE FORMATTING
// ============================================================================

/**
 * Format date to short locale string (e.g., "Jan 15, 2024").
 *
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale (default 'en-US')
 * @returns {string} Formatted date
 */
export function formatShortDate(date, locale = 'en-US') {
  const dateObj = is.string(date) ? parseFlexibleDate(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time to locale string (e.g., "3:45 PM").
 *
 * @param {Date|string} date - Date to extract time from
 * @param {string} locale - Locale (default 'en-US')
 * @returns {string} Formatted time
 */
export function formatTime(date, locale = 'en-US') {
  const dateObj = is.string(date) ? parseFlexibleDate(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date and time separately for display.
 *
 * @param {Date|string} datetime - DateTime to format
 * @param {string} locale - Locale (default 'en-US')
 * @returns {{date: string, time: string}} Formatted date and time
 */
export function formatDateAndTime(datetime, locale = 'en-US') {
  const dateObj = is.string(datetime) ? parseFlexibleDate(datetime) : datetime;
  if (!dateObj || isNaN(dateObj.getTime())) {
    return { date: '', time: '' };
  }

  return {
    date: formatShortDate(dateObj, locale),
    time: formatTime(dateObj, locale),
  };
}

/**
 * Format a JS Date or date-like input into a localized relative string.
 * Examples: "2 hours ago", "in 3 days", "yesterday", "tomorrow"
 *
 * @param {Date|string|number} input - Date to format
 * @param {Object} opts - Options
 * @param {Date} opts.now - Reference date (default: current time)
 * @param {string} opts.locale - Locale code (default: device locale)
 * @returns {string} Relative time string
 */
export function formatRelativeDateTime(input, opts = {}) {
  if (!input) return 'No date';
  const date = is.date(input) ? input : parseFlexibleDate(input);
  if (!date || isNaN(date.getTime())) return 'No date';

  const now = is.date(opts.now) ? opts.now : new Date();
  const locale = opts.locale || getPrimaryLocale();

  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const sign = diffMs >= 0 ? 1 : -1; // future: +, past: -

  const sec = 1000;
  const min = 60 * sec;
  const hour = 60 * min;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day; // approximation
  const year = 365 * day; // approximation

  let value;
  let unit;

  if (absMs < min) {
    value = Math.round(absMs / sec) * sign;
    unit = 'second';
  } else if (absMs < hour) {
    value = Math.round(absMs / min) * sign;
    unit = 'minute';
  } else if (absMs < day) {
    value = Math.round(absMs / hour) * sign;
    unit = 'hour';
  } else if (absMs < week) {
    value = Math.round(absMs / day) * sign;
    unit = 'day';
  } else if (absMs < month) {
    value = Math.round(absMs / week) * sign;
    unit = 'week';
  } else if (absMs < year) {
    value = Math.round(absMs / month) * sign;
    unit = 'month';
  } else {
    value = Math.round(absMs / year) * sign;
    unit = 'year';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return rtf.format(value, unit);
  } catch (_) {
    // Fallback to a simple English-ish string if Intl not available
    const n = Math.abs(value);
    const plural = n === 1 ? '' : 's';
    const base = `${n} ${unit}${plural}`;
    return value < 0 ? `${base} ago` : `in ${base}`;
  }
}

// ============================================================================
// DATE RANGE FILTERING
// ============================================================================

/**
 * Filter an array of items by a date range.
 * Useful for filtering interactions, events, or any time-based data.
 *
 * @param {Array} items - Array of objects to filter
 * @param {string} dateField - Name of the date field to filter by (e.g., 'event_date', 'interaction_datetime')
 * @param {Object} dateRange - Date range filter with startDate and endDate (YYYY-MM-DD format)
 * @param {string} dateRange.startDate - Start date (YYYY-MM-DD), inclusive
 * @param {string} dateRange.endDate - End date (YYYY-MM-DD), inclusive (entire day)
 * @returns {Array} Filtered array
 */
export function filterByDateRange(items, dateField, dateRange) {
  if (!items || !is.array(items)) {
    return [];
  }

  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return items;
  }

  // Use parseLocalDate to avoid UTC shift issues with YYYY-MM-DD strings
  const start = parseLocalDate(dateRange.startDate);
  const end = parseLocalDate(dateRange.endDate);

  if (!start || !end) {
    return items; // Invalid date range, return unfiltered
  }

  end.setHours(23, 59, 59, 999); // Include the entire end date

  return items.filter(item => {
    // Use parseFlexibleDate to handle both YYYY-MM-DD and datetime strings
    const itemDate = parseFlexibleDate(item[dateField]);
    if (!itemDate) return false; // Skip items with invalid dates
    return itemDate >= start && itemDate <= end;
  });
}
