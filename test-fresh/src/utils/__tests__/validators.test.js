/**
 * Validation Helpers Unit Tests
 *
 * Comprehensive tests for type checking, format validation, and data validation utilities
 * Tests cover: is.* namespace, isValidEmail, isValidPhone, isPositiveInteger,
 * isNonNegativeInteger, validateRequired, hasValue
 */

import {
  is,
  isValidEmail,
  isValidPhone,
  isPositiveInteger,
  isNonNegativeInteger,
  validateRequired,
  hasValue
} from '../validators';

describe('validators', () => {
  // ============================================================================
  // Type Checking - is.* namespace
  // ============================================================================

  describe('is.string', () => {
    it('should return true for string values', () => {
      expect(is.string('hello')).toBe(true);
      expect(is.string('')).toBe(true);
      expect(is.string('123')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(is.string(123)).toBe(false);
      expect(is.string(null)).toBe(false);
      expect(is.string(undefined)).toBe(false);
      expect(is.string([])).toBe(false);
      expect(is.string({})).toBe(false);
      expect(is.string(true)).toBe(false);
    });
  });

  describe('is.number', () => {
    it('should return true for valid numbers', () => {
      expect(is.number(0)).toBe(true);
      expect(is.number(123)).toBe(true);
      expect(is.number(-456)).toBe(true);
      expect(is.number(3.14)).toBe(true);
      expect(is.number(Infinity)).toBe(true);
      expect(is.number(-Infinity)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(is.number(NaN)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(is.number('123')).toBe(false);
      expect(is.number(null)).toBe(false);
      expect(is.number(undefined)).toBe(false);
      expect(is.number([])).toBe(false);
      expect(is.number({})).toBe(false);
      expect(is.number(true)).toBe(false);
    });
  });

  describe('is.integer', () => {
    it('should return true for integer values', () => {
      expect(is.integer(0)).toBe(true);
      expect(is.integer(1)).toBe(true);
      expect(is.integer(-42)).toBe(true);
      expect(is.integer(1000000)).toBe(true);
    });

    it('should return false for non-integer numbers', () => {
      expect(is.integer(3.14)).toBe(false);
      expect(is.integer(-0.5)).toBe(false);
      expect(is.integer(Infinity)).toBe(false);
      expect(is.integer(-Infinity)).toBe(false);
      expect(is.integer(NaN)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(is.integer('123')).toBe(false);
      expect(is.integer(null)).toBe(false);
      expect(is.integer(undefined)).toBe(false);
      expect(is.integer([])).toBe(false);
      expect(is.integer({})).toBe(false);
    });
  });

  describe('is.boolean', () => {
    it('should return true for boolean values', () => {
      expect(is.boolean(true)).toBe(true);
      expect(is.boolean(false)).toBe(true);
    });

    it('should return false for non-boolean values', () => {
      expect(is.boolean(1)).toBe(false);
      expect(is.boolean(0)).toBe(false);
      expect(is.boolean('true')).toBe(false);
      expect(is.boolean('false')).toBe(false);
      expect(is.boolean(null)).toBe(false);
      expect(is.boolean(undefined)).toBe(false);
      expect(is.boolean([])).toBe(false);
      expect(is.boolean({})).toBe(false);
    });
  });

  describe('is.array', () => {
    it('should return true for array values', () => {
      expect(is.array([])).toBe(true);
      expect(is.array([1, 2, 3])).toBe(true);
      expect(is.array(['a', 'b'])).toBe(true);
      expect(is.array(new Array())).toBe(true);
    });

    it('should return false for non-array values', () => {
      expect(is.array({})).toBe(false);
      expect(is.array('array')).toBe(false);
      expect(is.array(123)).toBe(false);
      expect(is.array(null)).toBe(false);
      expect(is.array(undefined)).toBe(false);
      expect(is.array(true)).toBe(false);
    });

    it('should return false for array-like objects', () => {
      expect(is.array({ length: 0 })).toBe(false);
      expect(is.array({ 0: 'a', length: 1 })).toBe(false);
    });
  });

  describe('is.object', () => {
    it('should return true for plain objects', () => {
      expect(is.object({})).toBe(true);
      expect(is.object({ key: 'value' })).toBe(true);
      expect(is.object(new Object())).toBe(true);
    });

    it('should return false for null', () => {
      expect(is.object(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(is.object([])).toBe(false);
      expect(is.object([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(is.object('string')).toBe(false);
      expect(is.object(123)).toBe(false);
      expect(is.object(true)).toBe(false);
      expect(is.object(undefined)).toBe(false);
    });

    it('should return true for Date, RegExp, and other object types', () => {
      expect(is.object(new Date())).toBe(true);
      expect(is.object(/regex/)).toBe(true);
      expect(is.object(new Error())).toBe(true);
    });
  });

  describe('is.date', () => {
    it('should return true for valid Date instances', () => {
      expect(is.date(new Date())).toBe(true);
      expect(is.date(new Date('2025-01-01'))).toBe(true);
      expect(is.date(new Date(2025, 0, 1))).toBe(true);
    });

    it('should return false for invalid Date instances', () => {
      expect(is.date(new Date('invalid'))).toBe(false);
      expect(is.date(new Date(NaN))).toBe(false);
    });

    it('should return false for non-Date values', () => {
      expect(is.date('2025-01-01')).toBe(false);
      expect(is.date(1640995200000)).toBe(false);
      expect(is.date(null)).toBe(false);
      expect(is.date(undefined)).toBe(false);
      expect(is.date({})).toBe(false);
      expect(is.date([])).toBe(false);
    });
  });

  describe('is.function', () => {
    it('should return true for function values', () => {
      expect(is.function(() => {})).toBe(true);
      expect(is.function(function() {})).toBe(true);
      expect(is.function(async function() {})).toBe(true);
      expect(is.function(function*() {})).toBe(true);
      expect(is.function(Array.isArray)).toBe(true);
    });

    it('should return false for non-function values', () => {
      expect(is.function({})).toBe(false);
      expect(is.function([])).toBe(false);
      expect(is.function('function')).toBe(false);
      expect(is.function(123)).toBe(false);
      expect(is.function(null)).toBe(false);
      expect(is.function(undefined)).toBe(false);
    });
  });

  describe('is.null', () => {
    it('should return true for null', () => {
      expect(is.null(null)).toBe(true);
    });

    it('should return false for non-null values', () => {
      expect(is.null(undefined)).toBe(false);
      expect(is.null(0)).toBe(false);
      expect(is.null('')).toBe(false);
      expect(is.null(false)).toBe(false);
      expect(is.null([])).toBe(false);
      expect(is.null({})).toBe(false);
      expect(is.null(NaN)).toBe(false);
    });
  });

  describe('is.undefined', () => {
    it('should return true for undefined', () => {
      expect(is.undefined(undefined)).toBe(true);
      let undefVar;
      expect(is.undefined(undefVar)).toBe(true);
    });

    it('should return false for non-undefined values', () => {
      expect(is.undefined(null)).toBe(false);
      expect(is.undefined(0)).toBe(false);
      expect(is.undefined('')).toBe(false);
      expect(is.undefined(false)).toBe(false);
      expect(is.undefined([])).toBe(false);
      expect(is.undefined({})).toBe(false);
      expect(is.undefined(NaN)).toBe(false);
    });
  });

  describe('is.nullish', () => {
    it('should return true for null and undefined', () => {
      expect(is.nullish(null)).toBe(true);
      expect(is.nullish(undefined)).toBe(true);
    });

    it('should return false for other falsy values', () => {
      expect(is.nullish(0)).toBe(false);
      expect(is.nullish('')).toBe(false);
      expect(is.nullish(false)).toBe(false);
      expect(is.nullish(NaN)).toBe(false);
    });

    it('should return false for truthy values', () => {
      expect(is.nullish(1)).toBe(false);
      expect(is.nullish('string')).toBe(false);
      expect(is.nullish(true)).toBe(false);
      expect(is.nullish([])).toBe(false);
      expect(is.nullish({})).toBe(false);
    });
  });

  describe('is.empty', () => {
    it('should return true for null and undefined', () => {
      expect(is.empty(null)).toBe(true);
      expect(is.empty(undefined)).toBe(true);
    });

    it('should return true for empty strings', () => {
      expect(is.empty('')).toBe(true);
      expect(is.empty('   ')).toBe(true);
      expect(is.empty('\t\n')).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(is.empty('hello')).toBe(false);
      expect(is.empty(' a ')).toBe(false);
      expect(is.empty('0')).toBe(false);
    });

    it('should return true for empty arrays', () => {
      expect(is.empty([])).toBe(true);
    });

    it('should return false for non-empty arrays', () => {
      expect(is.empty([1])).toBe(false);
      expect(is.empty([undefined])).toBe(false);
      expect(is.empty([null])).toBe(false);
    });

    it('should return true for empty objects', () => {
      expect(is.empty({})).toBe(true);
    });

    it('should return false for non-empty objects', () => {
      expect(is.empty({ key: 'value' })).toBe(false);
      expect(is.empty({ key: undefined })).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(is.empty(0)).toBe(false);
      expect(is.empty(123)).toBe(false);
      expect(is.empty(-1)).toBe(false);
    });

    it('should return false for booleans', () => {
      expect(is.empty(false)).toBe(false);
      expect(is.empty(true)).toBe(false);
    });

    it('should return true for Date and RegExp objects with no enumerable keys', () => {
      // Date and RegExp objects have no enumerable keys, so Object.keys().length === 0
      expect(is.empty(new Date())).toBe(true);
      expect(is.empty(/regex/)).toBe(true);
    });
  });

  // ============================================================================
  // Format Validation
  // ============================================================================

  describe('isValidEmail', () => {
    it('should return true for valid email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user_name@example-domain.com')).toBe(true);
      expect(isValidEmail('123@456.com')).toBe(true);
    });

    it('should return true for emails with extra whitespace (trimmed)', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true);
      expect(isValidEmail('\tuser@example.com\n')).toBe(true);
    });

    it('should return false for invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('user@@example.com')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail(true)).toBe(false);
      expect(isValidEmail([])).toBe(false);
      expect(isValidEmail({})).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should return true for 10-digit US phone numbers', () => {
      expect(isValidPhone('5551234567')).toBe(true);
      expect(isValidPhone('1234567890')).toBe(true);
    });

    it('should return true for 10-digit formatted numbers', () => {
      expect(isValidPhone('(555) 123-4567')).toBe(true);
      expect(isValidPhone('555-123-4567')).toBe(true);
      expect(isValidPhone('555.123.4567')).toBe(true);
      expect(isValidPhone('555 123 4567')).toBe(true);
    });

    it('should return true for 11-digit numbers starting with 1', () => {
      expect(isValidPhone('15551234567')).toBe(true);
      expect(isValidPhone('1-555-123-4567')).toBe(true);
      expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
      expect(isValidPhone('1 555 123 4567')).toBe(true);
    });

    it('should return false for 11-digit numbers not starting with 1', () => {
      expect(isValidPhone('25551234567')).toBe(false);
      expect(isValidPhone('95551234567')).toBe(false);
    });

    it('should return false for invalid lengths', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('123456789')).toBe(false);
      expect(isValidPhone('123456789012')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('   ')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone(undefined)).toBe(false);
    });

    it('should handle numeric input', () => {
      expect(isValidPhone(5551234567)).toBe(true);
      expect(isValidPhone(15551234567)).toBe(true);
    });
  });

  describe('isPositiveInteger', () => {
    it('should return true for positive integers', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(42)).toBe(true);
      expect(isPositiveInteger(1000000)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositiveInteger(0)).toBe(false);
    });

    it('should return false for negative integers', () => {
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(-42)).toBe(false);
    });

    it('should return false for non-integer numbers', () => {
      expect(isPositiveInteger(3.14)).toBe(false);
      expect(isPositiveInteger(0.5)).toBe(false);
      expect(isPositiveInteger(Infinity)).toBe(false);
      expect(isPositiveInteger(-Infinity)).toBe(false);
      expect(isPositiveInteger(NaN)).toBe(false);
    });

    it('should return false for non-numeric values', () => {
      expect(isPositiveInteger('1')).toBe(false);
      expect(isPositiveInteger('42')).toBe(false);
      expect(isPositiveInteger(true)).toBe(false);
      expect(isPositiveInteger(null)).toBe(false);
      expect(isPositiveInteger(undefined)).toBe(false);
      expect(isPositiveInteger([])).toBe(false);
      expect(isPositiveInteger({})).toBe(false);
    });
  });

  describe('isNonNegativeInteger', () => {
    it('should return true for zero', () => {
      expect(isNonNegativeInteger(0)).toBe(true);
    });

    it('should return true for positive integers', () => {
      expect(isNonNegativeInteger(1)).toBe(true);
      expect(isNonNegativeInteger(42)).toBe(true);
      expect(isNonNegativeInteger(1000000)).toBe(true);
    });

    it('should return false for negative integers', () => {
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(-42)).toBe(false);
    });

    it('should return false for non-integer numbers', () => {
      expect(isNonNegativeInteger(3.14)).toBe(false);
      expect(isNonNegativeInteger(0.5)).toBe(false);
      expect(isNonNegativeInteger(-0.5)).toBe(false);
      expect(isNonNegativeInteger(Infinity)).toBe(false);
      expect(isNonNegativeInteger(-Infinity)).toBe(false);
      expect(isNonNegativeInteger(NaN)).toBe(false);
    });

    it('should return false for non-numeric values', () => {
      expect(isNonNegativeInteger('0')).toBe(false);
      expect(isNonNegativeInteger('42')).toBe(false);
      expect(isNonNegativeInteger(true)).toBe(false);
      expect(isNonNegativeInteger(null)).toBe(false);
      expect(isNonNegativeInteger(undefined)).toBe(false);
      expect(isNonNegativeInteger([])).toBe(false);
      expect(isNonNegativeInteger({})).toBe(false);
    });
  });

  // ============================================================================
  // Batch Validation
  // ============================================================================

  describe('validateRequired', () => {
    it('should return valid:true when all required fields are present', () => {
      const data = { name: 'John', age: 30, email: 'john@example.com' };
      const rules = ['name', 'age', 'email'];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should detect missing string fields', () => {
      const data = { name: '', age: 30 };
      const rules = ['name', 'age'];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ name: 'name is required' });
    });

    it('should detect null fields', () => {
      const data = { name: 'John', age: null };
      const rules = ['name', 'age'];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ age: 'age is required' });
    });

    it('should detect undefined fields', () => {
      const data = { name: 'John' };
      const rules = ['name', 'age'];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ age: 'age is required' });
    });

    it('should handle whitespace-only strings as empty', () => {
      const data = { name: '   ', email: '\t\n' };
      const rules = ['name', 'email'];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        name: 'name is required',
        email: 'email is required'
      });
    });

    it('should use custom labels in error messages', () => {
      const data = { first_name: '', email: '' };
      const rules = [
        { field: 'first_name', label: 'First name' },
        { field: 'email', label: 'Email address' }
      ];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        first_name: 'First name is required',
        email: 'Email address is required'
      });
    });

    it('should handle mixed rule formats', () => {
      const data = { name: '', age: 30, email: '' };
      const rules = [
        'name',
        { field: 'age', label: 'Age' },
        { field: 'email', label: 'Email address' }
      ];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        name: 'name is required',
        email: 'Email address is required'
      });
    });

    it('should use field name as label if label not provided', () => {
      const data = { username: '' };
      const rules = [{ field: 'username' }];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ username: 'username is required' });
    });

    it('should handle empty rules array', () => {
      const data = { name: 'John' };
      const rules = [];
      const result = validateRequired(data, rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should allow zero as valid value', () => {
      const data = { count: 0, active: false };
      const rules = ['count', 'active'];
      const result = validateRequired(data, rules);

      // Note: validateRequired only checks for null/undefined/empty strings
      // Numbers (including 0) and booleans are always valid
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  // ============================================================================
  // Data Validation
  // ============================================================================

  describe('hasValue', () => {
    it('should return true for non-empty strings', () => {
      expect(hasValue('hello')).toBe(true);
      expect(hasValue('0')).toBe(true);
      expect(hasValue(' a ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(hasValue('')).toBe(false);
      expect(hasValue('   ')).toBe(false);
      expect(hasValue('\t\n')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(hasValue(null)).toBe(false);
      expect(hasValue(undefined)).toBe(false);
    });

    it('should return true for valid numbers', () => {
      expect(hasValue(0)).toBe(true);
      expect(hasValue(42)).toBe(true);
      expect(hasValue(-1)).toBe(true);
      expect(hasValue(3.14)).toBe(true);
      expect(hasValue(Infinity)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(hasValue(NaN)).toBe(false);
    });

    it('should return true for booleans', () => {
      expect(hasValue(true)).toBe(true);
      expect(hasValue(false)).toBe(true);
    });

    it('should return true for non-empty arrays', () => {
      expect(hasValue([1])).toBe(true);
      expect(hasValue([null])).toBe(true);
      expect(hasValue([''])).toBe(true);
    });

    it('should return false for empty arrays', () => {
      expect(hasValue([])).toBe(false);
    });

    it('should return true for non-empty objects', () => {
      expect(hasValue({ key: 'value' })).toBe(true);
      expect(hasValue({ key: null })).toBe(true);
      expect(hasValue({ key: undefined })).toBe(true);
    });

    it('should return false for empty objects', () => {
      expect(hasValue({})).toBe(false);
    });

    it('should return false for Date and RegExp objects with no enumerable keys', () => {
      // Date and RegExp objects have no enumerable keys, so Object.keys().length === 0
      expect(hasValue(new Date())).toBe(false);
      expect(hasValue(/regex/)).toBe(false);
    });

    it('should return true for functions', () => {
      expect(hasValue(() => {})).toBe(true);
      expect(hasValue(function() {})).toBe(true);
    });

    it('should handle edge cases', () => {
      // Symbols are truthy
      expect(hasValue(Symbol('test'))).toBe(true);

      // Falsy but has value
      expect(hasValue(0)).toBe(true);
      expect(hasValue(false)).toBe(true);
    });
  });
});
