/**
 * Comprehensive unit tests for dateUtils.js
 *
 * Tests cover:
 * - Timezone handling (local vs UTC)
 * - Invalid input handling (null returns)
 * - Edge cases (DST, leap years, month boundaries)
 * - Immutability (functions don't mutate inputs)
 * - Format parsing and generation
 */

import {
  getPrimaryLocale,
  parseLocalDate,
  formatDateToString,
  parseFlexibleDate,
  formatDateSmart,
  compareDates,
  isToday,
  isPast,
  isFuture,
  addDays,
  daysBetween,
  toSQLiteDateTime,
  parseSQLiteDateTime,
  getCurrentISO,
  toFilenameTimestamp,
  addHours,
  addMinutes,
  setDatePart,
  setTimePart,
  formatShortDate,
  formatTime,
  formatDateAndTime,
  formatRelativeDateTime,
} from '../dateUtils';

describe('dateUtils', () => {
  // Helper to create a local date at midnight
  const createLocalDate = (year, month, day) => new Date(year, month - 1, day, 0, 0, 0, 0);

  describe('getPrimaryLocale', () => {
    it('should return a locale string', () => {
      const locale = getPrimaryLocale();
      expect(typeof locale).toBe('string');
      expect(locale.length).toBeGreaterThan(0);
    });

    it('should return a valid BCP 47 locale format', () => {
      const locale = getPrimaryLocale();
      // Should match pattern like 'en-US', 'es-ES', etc.
      expect(locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    });
  });

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD string to local midnight', () => {
      const result = parseLocalDate('2024-03-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2); // 0-indexed
      expect(result?.getDate()).toBe(15);
      expect(result?.getHours()).toBe(0);
      expect(result?.getMinutes()).toBe(0);
      expect(result?.getSeconds()).toBe(0);
    });

    it('should return null for invalid format', () => {
      expect(parseLocalDate('2024-3-15')).toBeNull(); // Missing zero padding
      expect(parseLocalDate('2024/03/15')).toBeNull(); // Wrong separator
      expect(parseLocalDate('03-15-2024')).toBeNull(); // Wrong order
      expect(parseLocalDate('invalid')).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(parseLocalDate(null)).toBeNull();
      expect(parseLocalDate(undefined)).toBeNull();
      expect(parseLocalDate('')).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(parseLocalDate(123)).toBeNull();
      expect(parseLocalDate({})).toBeNull();
      expect(parseLocalDate([])).toBeNull();
    });

    it('should handle leap year dates', () => {
      const leapDay = parseLocalDate('2024-02-29');
      expect(leapDay).toBeInstanceOf(Date);
      expect(leapDay?.getMonth()).toBe(1);
      expect(leapDay?.getDate()).toBe(29);
    });

    it('should handle edge dates', () => {
      expect(parseLocalDate('2024-01-01')).toBeInstanceOf(Date); // Year start
      expect(parseLocalDate('2024-12-31')).toBeInstanceOf(Date); // Year end
      expect(parseLocalDate('2024-02-28')).toBeInstanceOf(Date); // Feb in leap year
    });
  });

  describe('formatDateToString', () => {
    it('should format Date to YYYY-MM-DD', () => {
      const date = createLocalDate(2024, 3, 15);
      expect(formatDateToString(date)).toBe('2024-03-15');
    });

    it('should pass through already-formatted string', () => {
      expect(formatDateToString('2024-03-15')).toBe('2024-03-15');
    });

    it('should return empty string for invalid input', () => {
      expect(formatDateToString(null)).toBe('');
      expect(formatDateToString(undefined)).toBe('');
      expect(formatDateToString(new Date('invalid'))).toBe('');
    });

    it('should handle single-digit months and days with padding', () => {
      const date = createLocalDate(2024, 1, 5);
      expect(formatDateToString(date)).toBe('2024-01-05');
    });

    it('should parse and format string dates', () => {
      expect(formatDateToString('2024-03-15')).toBe('2024-03-15');
    });
  });

  describe('parseFlexibleDate', () => {
    it('should parse YYYY-MM-DD strings as local dates', () => {
      const result = parseFlexibleDate('2024-03-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(15);
    });

    it('should accept valid Date objects', () => {
      const date = new Date(2024, 2, 15);
      const result = parseFlexibleDate(date);
      expect(result).toBe(date);
    });

    it('should return null for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(parseFlexibleDate(invalidDate)).toBeNull();
    });

    it('should parse ISO timestamps', () => {
      const iso = '2024-03-15T10:30:00.000Z';
      const result = parseFlexibleDate(iso);
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse numeric timestamps', () => {
      const timestamp = Date.now();
      const result = parseFlexibleDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(Math.abs(result.getTime() - timestamp)).toBeLessThan(1);
    });

    it('should return null for falsy values', () => {
      expect(parseFlexibleDate(null)).toBeNull();
      expect(parseFlexibleDate(undefined)).toBeNull();
      expect(parseFlexibleDate('')).toBeNull();
      expect(parseFlexibleDate(0)).toBeNull();
    });

    it('should return null for unparseable strings', () => {
      expect(parseFlexibleDate('invalid')).toBeNull();
      expect(parseFlexibleDate('not a date')).toBeNull();
    });
  });

  describe('formatDateSmart', () => {
    it('should return "Today" for today\'s date', () => {
      const today = new Date();
      const todayString = formatDateToString(today);
      expect(formatDateSmart(todayString)).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = formatDateToString(tomorrow);
      expect(formatDateSmart(tomorrowString)).toBe('Tomorrow');
    });

    it('should return formatted date for other dates', () => {
      const pastDate = '2024-01-15';
      const result = formatDateSmart(pastDate);
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Tomorrow');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should accept Date objects', () => {
      const date = new Date();
      const result = formatDateSmart(date);
      expect(result).toBe('Today');
    });

    it('should return empty string for invalid input', () => {
      expect(formatDateSmart(null)).toBe('');
      expect(formatDateSmart('invalid')).toBe('');
    });

    it('should use translation function if provided', () => {
      const t = jest.fn((key) => key === 'events.today' ? 'Heute' : 'Morgen');
      const today = formatDateToString(new Date());
      formatDateSmart(today, t);
      expect(t).toHaveBeenCalledWith('events.today');
    });
  });

  describe('compareDates', () => {
    it('should return negative when dateA < dateB', () => {
      const earlier = '2024-01-15';
      const later = '2024-03-15';
      expect(compareDates(earlier, later)).toBeLessThan(0);
    });

    it('should return positive when dateA > dateB', () => {
      const earlier = '2024-01-15';
      const later = '2024-03-15';
      expect(compareDates(later, earlier)).toBeGreaterThan(0);
    });

    it('should return 0 when dates are equal', () => {
      const date = '2024-03-15';
      expect(compareDates(date, date)).toBe(0);
    });

    it('should handle Date objects', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2024, 2, 15);
      expect(compareDates(date1, date2)).toBeLessThan(0);
    });

    it('should sort invalid dates last', () => {
      expect(compareDates('invalid', '2024-03-15')).toBeGreaterThan(0);
      expect(compareDates('2024-03-15', 'invalid')).toBeLessThan(0);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = formatDateToString(new Date());
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(formatDateToString(yesterday))).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(formatDateToString(tomorrow))).toBe(false);
    });

    it('should handle Date objects', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isToday(null)).toBe(false);
      expect(isToday('invalid')).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPast(formatDateToString(yesterday))).toBe(true);
    });

    it('should return false for today', () => {
      const today = formatDateToString(new Date());
      expect(isPast(today)).toBe(false);
    });

    it('should return false for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPast(formatDateToString(tomorrow))).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isPast(null)).toBe(false);
      expect(isPast('invalid')).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isFuture(formatDateToString(tomorrow))).toBe(true);
    });

    it('should return false for today', () => {
      const today = formatDateToString(new Date());
      expect(isFuture(today)).toBe(false);
    });

    it('should return false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isFuture(formatDateToString(yesterday))).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isFuture(null)).toBe(false);
      expect(isFuture('invalid')).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = createLocalDate(2024, 3, 15);
      const result = addDays(date, 5);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(20);
    });

    it('should subtract negative days', () => {
      const date = createLocalDate(2024, 3, 15);
      const result = addDays(date, -5);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(10);
    });

    it('should handle month boundaries', () => {
      const date = createLocalDate(2024, 1, 30);
      const result = addDays(date, 2);
      expect(result?.getMonth()).toBe(1); // February
      expect(result?.getDate()).toBe(1);
    });

    it('should handle year boundaries', () => {
      const date = createLocalDate(2023, 12, 30);
      const result = addDays(date, 5);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(4);
    });

    it('should accept YYYY-MM-DD strings', () => {
      const result = addDays('2024-03-15', 5);
      expect(result?.getDate()).toBe(20);
    });

    it('should return null for invalid input', () => {
      expect(addDays(null, 5)).toBeNull();
      expect(addDays('invalid', 5)).toBeNull();
      expect(addDays(new Date('invalid'), 5)).toBeNull();
    });

    it('should not mutate original date', () => {
      const original = createLocalDate(2024, 3, 15);
      const originalTime = original.getTime();
      addDays(original, 5);
      expect(original.getTime()).toBe(originalTime);
    });
  });

  describe('daysBetween', () => {
    it('should calculate positive difference', () => {
      const date1 = '2024-03-15';
      const date2 = '2024-03-20';
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('should calculate negative difference', () => {
      const date1 = '2024-03-20';
      const date2 = '2024-03-15';
      expect(daysBetween(date1, date2)).toBe(-5);
    });

    it('should return 0 for same dates', () => {
      const date = '2024-03-15';
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should handle Date objects', () => {
      const date1 = createLocalDate(2024, 3, 15);
      const date2 = createLocalDate(2024, 3, 20);
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('should return 0 for invalid input', () => {
      expect(daysBetween(null, '2024-03-15')).toBe(0);
      expect(daysBetween('2024-03-15', null)).toBe(0);
      expect(daysBetween('invalid', '2024-03-15')).toBe(0);
    });
  });

  describe('toSQLiteDateTime', () => {
    it('should format Date to SQLite datetime', () => {
      const date = new Date(2024, 2, 15, 14, 30, 45);
      const result = toSQLiteDateTime(date);
      expect(result).toBe('2024-03-15 14:30:45');
    });

    it('should handle midnight times', () => {
      const date = createLocalDate(2024, 3, 15);
      const result = toSQLiteDateTime(date);
      expect(result).toBe('2024-03-15 00:00:00');
    });

    it('should pad single digits', () => {
      const date = new Date(2024, 0, 5, 9, 5, 3);
      const result = toSQLiteDateTime(date);
      expect(result).toBe('2024-01-05 09:05:03');
    });

    it('should return empty string for invalid input', () => {
      expect(toSQLiteDateTime(null)).toBe('');
      expect(toSQLiteDateTime(new Date('invalid'))).toBe('');
    });

    it('should handle timestamps', () => {
      const timestamp = new Date(2024, 2, 15, 14, 30, 45).getTime();
      const result = toSQLiteDateTime(timestamp);
      expect(result).toMatch(/^2024-03-15 14:30:45$/);
    });
  });

  describe('parseSQLiteDateTime', () => {
    it('should parse full datetime format', () => {
      const result = parseSQLiteDateTime('2024-03-15 14:30:45');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(15);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(30);
      expect(result?.getSeconds()).toBe(45);
    });

    it('should parse date-only format', () => {
      const result = parseSQLiteDateTime('2024-03-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(0);
    });

    it('should return null for invalid format', () => {
      expect(parseSQLiteDateTime('2024/03/15 14:30:45')).toBeNull();
      expect(parseSQLiteDateTime('invalid')).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(parseSQLiteDateTime(null)).toBeNull();
      expect(parseSQLiteDateTime(undefined)).toBeNull();
    });
  });

  describe('getCurrentISO', () => {
    it('should return an ISO string', () => {
      const result = getCurrentISO();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current time', () => {
      const before = Date.now();
      const result = new Date(getCurrentISO()).getTime();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('toFilenameTimestamp', () => {
    it('should return filename-safe timestamp', () => {
      const date = new Date(2024, 2, 15, 14, 30, 45);
      const result = toFilenameTimestamp(date);
      expect(result).toMatch(/^2024-03-15T14-30-45$/);
      expect(result).not.toContain(':');
      expect(result).not.toContain('.');
    });

    it('should default to current time', () => {
      const result = toFilenameTimestamp();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('addHours', () => {
    it('should add positive hours', () => {
      const date = new Date(2024, 2, 15, 10, 0, 0);
      const result = addHours(date, 5);
      expect(result?.getHours()).toBe(15);
    });

    it('should subtract negative hours', () => {
      const date = new Date(2024, 2, 15, 10, 0, 0);
      const result = addHours(date, -5);
      expect(result?.getHours()).toBe(5);
    });

    it('should handle day boundaries', () => {
      const date = new Date(2024, 2, 15, 23, 0, 0);
      const result = addHours(date, 2);
      expect(result?.getDate()).toBe(16);
      expect(result?.getHours()).toBe(1);
    });

    it('should return null for invalid input', () => {
      expect(addHours(null, 5)).toBeNull();
      expect(addHours('invalid', 5)).toBeNull();
    });

    it('should not mutate original date', () => {
      const original = new Date(2024, 2, 15, 10, 0, 0);
      const originalTime = original.getTime();
      addHours(original, 5);
      expect(original.getTime()).toBe(originalTime);
    });
  });

  describe('addMinutes', () => {
    it('should add positive minutes', () => {
      const date = new Date(2024, 2, 15, 10, 30, 0);
      const result = addMinutes(date, 45);
      expect(result?.getHours()).toBe(11);
      expect(result?.getMinutes()).toBe(15);
    });

    it('should subtract negative minutes', () => {
      const date = new Date(2024, 2, 15, 10, 30, 0);
      const result = addMinutes(date, -45);
      expect(result?.getHours()).toBe(9);
      expect(result?.getMinutes()).toBe(45);
    });

    it('should handle hour boundaries', () => {
      const date = new Date(2024, 2, 15, 10, 50, 0);
      const result = addMinutes(date, 20);
      expect(result?.getHours()).toBe(11);
      expect(result?.getMinutes()).toBe(10);
    });

    it('should return null for invalid input', () => {
      expect(addMinutes(null, 30)).toBeNull();
      expect(addMinutes('invalid', 30)).toBeNull();
    });

    it('should not mutate original date', () => {
      const original = new Date(2024, 2, 15, 10, 30, 0);
      const originalTime = original.getTime();
      addMinutes(original, 30);
      expect(original.getTime()).toBe(originalTime);
    });
  });

  describe('setDatePart', () => {
    it('should update date while preserving time', () => {
      const datetime = new Date(2024, 2, 15, 14, 30, 45);
      const newDate = new Date(2024, 5, 20);
      const result = setDatePart(datetime, newDate);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5);
      expect(result?.getDate()).toBe(20);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(30);
      expect(result?.getSeconds()).toBe(45);
    });

    it('should return null for invalid datetime', () => {
      const newDate = new Date(2024, 5, 20);
      expect(setDatePart(new Date('invalid'), newDate)).toBeNull();
    });

    it('should return null for invalid datePart', () => {
      const datetime = new Date(2024, 2, 15, 14, 30, 45);
      expect(setDatePart(datetime, new Date('invalid'))).toBeNull();
    });

    it('should not mutate original dates', () => {
      const datetime = new Date(2024, 2, 15, 14, 30, 45);
      const newDate = new Date(2024, 5, 20);
      const originalDatetime = datetime.getTime();
      const originalNewDate = newDate.getTime();
      setDatePart(datetime, newDate);
      expect(datetime.getTime()).toBe(originalDatetime);
      expect(newDate.getTime()).toBe(originalNewDate);
    });
  });

  describe('setTimePart', () => {
    it('should update time while preserving date', () => {
      const datetime = new Date(2024, 2, 15, 10, 20, 30);
      const newTime = new Date(2024, 0, 1, 14, 45, 50, 123);
      const result = setTimePart(datetime, newTime);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(15);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(45);
      expect(result?.getSeconds()).toBe(50);
      expect(result?.getMilliseconds()).toBe(123);
    });

    it('should return null for invalid datetime', () => {
      const newTime = new Date(2024, 0, 1, 14, 45, 50);
      expect(setTimePart(new Date('invalid'), newTime)).toBeNull();
    });

    it('should return null for invalid timePart', () => {
      const datetime = new Date(2024, 2, 15, 10, 20, 30);
      expect(setTimePart(datetime, new Date('invalid'))).toBeNull();
    });

    it('should not mutate original dates', () => {
      const datetime = new Date(2024, 2, 15, 10, 20, 30);
      const newTime = new Date(2024, 0, 1, 14, 45, 50);
      const originalDatetime = datetime.getTime();
      const originalNewTime = newTime.getTime();
      setTimePart(datetime, newTime);
      expect(datetime.getTime()).toBe(originalDatetime);
      expect(newTime.getTime()).toBe(originalNewTime);
    });
  });

  describe('formatShortDate', () => {
    it('should format date to short string', () => {
      const date = createLocalDate(2024, 3, 15);
      const result = formatShortDate(date);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/Mar.*15.*2024/);
    });

    it('should accept YYYY-MM-DD strings', () => {
      const result = formatShortDate('2024-03-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty string for invalid input', () => {
      expect(formatShortDate(null)).toBe('');
      expect(formatShortDate('invalid')).toBe('');
    });
  });

  describe('formatTime', () => {
    it('should format time', () => {
      const date = new Date(2024, 2, 15, 14, 30, 0);
      const result = formatTime(date);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/2:30|14:30/); // Handles AM/PM or 24hr format
    });

    it('should return empty string for invalid input', () => {
      expect(formatTime(null)).toBe('');
      expect(formatTime('invalid')).toBe('');
    });
  });

  describe('formatDateAndTime', () => {
    it('should return both date and time', () => {
      const date = new Date(2024, 2, 15, 14, 30, 0);
      const result = formatDateAndTime(date);
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(typeof result.date).toBe('string');
      expect(typeof result.time).toBe('string');
      expect(result.date.length).toBeGreaterThan(0);
      expect(result.time.length).toBeGreaterThan(0);
    });

    it('should return empty strings for invalid input', () => {
      const result = formatDateAndTime(null);
      expect(result.date).toBe('');
      expect(result.time).toBe('');
    });
  });

  describe('formatRelativeDateTime', () => {
    it('should return "No date" for falsy input', () => {
      expect(formatRelativeDateTime(null)).toBe('No date');
      expect(formatRelativeDateTime(undefined)).toBe('No date');
    });

    it('should return "No date" for invalid date', () => {
      expect(formatRelativeDateTime('invalid')).toBe('No date');
    });

    it('should format recent past times', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeDateTime(fiveMinutesAgo);
      expect(result).toMatch(/ago|minute/i);
    });

    it('should format near future times', () => {
      const inFiveMinutes = new Date(Date.now() + 5 * 60 * 1000);
      const result = formatRelativeDateTime(inFiveMinutes);
      expect(result).toMatch(/in|minute/i);
    });

    it('should accept timestamps', () => {
      const timestamp = Date.now() - 60 * 1000;
      const result = formatRelativeDateTime(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use custom "now" reference', () => {
      const now = new Date(2024, 2, 15, 12, 0, 0);
      const past = new Date(2024, 2, 15, 11, 0, 0);
      const result = formatRelativeDateTime(past, { now });
      expect(result).toMatch(/ago|hour/i);
    });
  });

  describe('Immutability tests', () => {
    it('addDays should not mutate input', () => {
      const original = new Date(2024, 2, 15);
      const snapshot = original.getTime();
      addDays(original, 5);
      expect(original.getTime()).toBe(snapshot);
    });

    it('addHours should not mutate input', () => {
      const original = new Date(2024, 2, 15, 10, 0, 0);
      const snapshot = original.getTime();
      addHours(original, 3);
      expect(original.getTime()).toBe(snapshot);
    });

    it('addMinutes should not mutate input', () => {
      const original = new Date(2024, 2, 15, 10, 30, 0);
      const snapshot = original.getTime();
      addMinutes(original, 15);
      expect(original.getTime()).toBe(snapshot);
    });

    it('setDatePart should not mutate inputs', () => {
      const datetime = new Date(2024, 2, 15, 14, 30);
      const datePart = new Date(2024, 5, 20);
      const snapshotDt = datetime.getTime();
      const snapshotDp = datePart.getTime();
      setDatePart(datetime, datePart);
      expect(datetime.getTime()).toBe(snapshotDt);
      expect(datePart.getTime()).toBe(snapshotDp);
    });

    it('setTimePart should not mutate inputs', () => {
      const datetime = new Date(2024, 2, 15, 10, 20);
      const timePart = new Date(2024, 0, 1, 14, 45);
      const snapshotDt = datetime.getTime();
      const snapshotTp = timePart.getTime();
      setTimePart(datetime, timePart);
      expect(datetime.getTime()).toBe(snapshotDt);
      expect(timePart.getTime()).toBe(snapshotTp);
    });
  });

  describe('Edge cases and DST', () => {
    it('should handle leap year correctly', () => {
      const leapDay = parseLocalDate('2024-02-29');
      expect(leapDay).toBeInstanceOf(Date);
      const nextDay = addDays(leapDay, 1);
      expect(nextDay?.getMonth()).toBe(2); // March
      expect(nextDay?.getDate()).toBe(1);
    });

    it('should handle non-leap year February', () => {
      const feb28 = parseLocalDate('2023-02-28');
      const nextDay = addDays(feb28, 1);
      expect(nextDay?.getMonth()).toBe(2); // March
      expect(nextDay?.getDate()).toBe(1);
    });

    it('should handle month with 30 days', () => {
      const apr30 = parseLocalDate('2024-04-30');
      const nextDay = addDays(apr30, 1);
      expect(nextDay?.getMonth()).toBe(4); // May
      expect(nextDay?.getDate()).toBe(1);
    });

    it('should handle year boundary', () => {
      const dec31 = parseLocalDate('2023-12-31');
      const nextDay = addDays(dec31, 1);
      expect(nextDay?.getFullYear()).toBe(2024);
      expect(nextDay?.getMonth()).toBe(0); // January
      expect(nextDay?.getDate()).toBe(1);
    });
  });
});
