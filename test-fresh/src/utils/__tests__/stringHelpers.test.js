/**
 * String Helpers Unit Tests
 *
 * Comprehensive tests for string manipulation utilities
 * Tests cover: safeTrim, normalizeTrimLowercase, hasContent, filterNonEmpty,
 * filterNonEmptyStrings, capitalize, truncate
 */

import {
  safeTrim,
  normalizeTrimLowercase,
  hasContent,
  filterNonEmpty,
  filterNonEmptyStrings,
  capitalize,
  truncate,
} from '../stringHelpers';

describe('stringHelpers', () => {
  // ============================================================================
  // safeTrim
  // ============================================================================

  describe('safeTrim', () => {
    it('should trim whitespace from strings', () => {
      expect(safeTrim('  hello  ')).toBe('hello');
      expect(safeTrim('hello')).toBe('hello');
      expect(safeTrim('  hello')).toBe('hello');
      expect(safeTrim('hello  ')).toBe('hello');
    });

    it('should trim various whitespace characters', () => {
      expect(safeTrim('\t\nhello\t\n')).toBe('hello');
      expect(safeTrim('  \t  hello  \n  ')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(safeTrim('')).toBe('');
      expect(safeTrim('   ')).toBe('');
      expect(safeTrim('\t\n')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(safeTrim(null)).toBe('');
      expect(safeTrim(undefined)).toBe('');
    });

    it('should convert non-string values to strings', () => {
      expect(safeTrim(123)).toBe('123');
      // Note: safeTrim uses (value || ''), so 0 and false are treated as falsy
      expect(safeTrim(0)).toBe(''); // 0 || '' = ''
      expect(safeTrim(true)).toBe('true');
      expect(safeTrim(false)).toBe(''); // false || '' = ''
    });

    it('should handle objects and arrays', () => {
      expect(safeTrim({})).toBe('[object Object]');
      expect(safeTrim([])).toBe('');
      expect(safeTrim([1, 2, 3])).toBe('1,2,3');
    });

    it('should preserve internal whitespace', () => {
      expect(safeTrim('  hello world  ')).toBe('hello world');
      expect(safeTrim('  hello  world  ')).toBe('hello  world');
    });

    it('should handle Unicode and emoji', () => {
      expect(safeTrim('  hello 世界  ')).toBe('hello 世界');
      expect(safeTrim('  😀 emoji  ')).toBe('😀 emoji');
    });
  });

  // ============================================================================
  // normalizeTrimLowercase
  // ============================================================================

  describe('normalizeTrimLowercase', () => {
    it('should trim and convert to lowercase', () => {
      expect(normalizeTrimLowercase('  HELLO  ')).toBe('hello');
      expect(normalizeTrimLowercase('HELLO')).toBe('hello');
      expect(normalizeTrimLowercase('HeLLo')).toBe('hello');
    });

    it('should handle email addresses', () => {
      expect(normalizeTrimLowercase('John@Email.COM')).toBe('john@email.com');
      expect(normalizeTrimLowercase('  USER@EXAMPLE.COM  ')).toBe(
        'user@example.com'
      );
    });

    it('should handle empty strings', () => {
      expect(normalizeTrimLowercase('')).toBe('');
      expect(normalizeTrimLowercase('   ')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(normalizeTrimLowercase(null)).toBe('');
      expect(normalizeTrimLowercase(undefined)).toBe('');
    });

    it('should handle mixed case with whitespace', () => {
      expect(normalizeTrimLowercase('  HeLLo WoRLd  ')).toBe('hello world');
    });

    it('should handle Unicode characters', () => {
      expect(normalizeTrimLowercase('CAFÉ')).toBe('café');
      expect(normalizeTrimLowercase('ÜBER')).toBe('über');
    });

    it('should handle numbers and booleans', () => {
      expect(normalizeTrimLowercase(123)).toBe('123');
      expect(normalizeTrimLowercase(true)).toBe('true');
      // Note: false is treated as falsy by safeTrim
      expect(normalizeTrimLowercase(false)).toBe(''); // false || '' = ''
      expect(normalizeTrimLowercase(0)).toBe(''); // 0 || '' = ''
    });
  });

  // ============================================================================
  // hasContent
  // ============================================================================

  describe('hasContent', () => {
    it('should return true for non-empty strings', () => {
      expect(hasContent('hello')).toBe(true);
      expect(hasContent('a')).toBe(true);
      expect(hasContent('0')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(hasContent('')).toBe(false);
      expect(hasContent('   ')).toBe(false);
      expect(hasContent('\t\n')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(hasContent(null)).toBe(false);
      expect(hasContent(undefined)).toBe(false);
    });

    it('should handle strings with only whitespace', () => {
      expect(hasContent('     ')).toBe(false);
      expect(hasContent(' a ')).toBe(true);
    });

    it('should convert non-string values and check content', () => {
      expect(hasContent(123)).toBe(true);
      // Note: 0 and false are falsy, so safeTrim returns ''
      expect(hasContent(0)).toBe(false); // safeTrim(0) = '' (no content)
      expect(hasContent(true)).toBe(true);
      expect(hasContent(false)).toBe(false); // safeTrim(false) = '' (no content)
    });

    it('should handle empty arrays and objects', () => {
      expect(hasContent([])).toBe(false);
      expect(hasContent([1, 2])).toBe(true);
      expect(hasContent({})).toBe(true); // "[object Object]" has content
    });

    it('should handle Unicode and emoji', () => {
      expect(hasContent('😀')).toBe(true);
      expect(hasContent('世界')).toBe(true);
    });
  });

  // ============================================================================
  // filterNonEmpty
  // ============================================================================

  describe('filterNonEmpty', () => {
    it('should filter objects with empty values', () => {
      const items = [
        { value: '555-1234' },
        { value: '  ' },
        { value: '' },
        { value: 'valid' },
      ];
      const result = filterNonEmpty(items);
      expect(result).toEqual([{ value: '555-1234' }, { value: 'valid' }]);
    });

    it('should handle custom field names', () => {
      const items = [{ label: 'John' }, { label: '  ' }, { label: 'Jane' }];
      const result = filterNonEmpty(items, 'label');
      expect(result).toEqual([{ label: 'John' }, { label: 'Jane' }]);
    });

    it('should handle empty arrays', () => {
      expect(filterNonEmpty([])).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(filterNonEmpty(null)).toEqual([]);
      expect(filterNonEmpty(undefined)).toEqual([]);
      expect(filterNonEmpty('not array')).toEqual([]);
      expect(filterNonEmpty(123)).toEqual([]);
      expect(filterNonEmpty({})).toEqual([]);
    });

    it('should filter out null and undefined items', () => {
      const items = [
        { value: 'valid' },
        null,
        undefined,
        { value: 'also valid' },
      ];
      const result = filterNonEmpty(items);
      expect(result).toEqual([{ value: 'valid' }, { value: 'also valid' }]);
    });

    it('should filter out non-object items', () => {
      const items = [
        { value: 'valid' },
        'string',
        123,
        true,
        { value: 'also valid' },
      ];
      const result = filterNonEmpty(items);
      expect(result).toEqual([{ value: 'valid' }, { value: 'also valid' }]);
    });

    it('should handle missing field', () => {
      const items = [
        { value: 'has value' },
        { other: 'no value field' },
        { value: 'valid' },
      ];
      const result = filterNonEmpty(items);
      expect(result).toEqual([{ value: 'has value' }, { value: 'valid' }]);
    });

    it('should handle whitespace-only values', () => {
      const items = [{ value: '   ' }, { value: '\t\n' }, { value: 'valid' }];
      const result = filterNonEmpty(items);
      expect(result).toEqual([{ value: 'valid' }]);
    });

    it('should handle real-world phone number example', () => {
      const phones = [
        { value: '555-1234', label: 'Home' },
        { value: '', label: 'Work' },
        { value: '   ', label: 'Mobile' },
        { value: '555-5678', label: 'Office' },
      ];
      const result = filterNonEmpty(phones);
      expect(result).toEqual([
        { value: '555-1234', label: 'Home' },
        { value: '555-5678', label: 'Office' },
      ]);
    });
  });

  // ============================================================================
  // filterNonEmptyStrings
  // ============================================================================

  describe('filterNonEmptyStrings', () => {
    it('should filter empty strings from array', () => {
      const items = ['hello', '', '  ', 'world'];
      const result = filterNonEmptyStrings(items);
      expect(result).toEqual(['hello', 'world']);
    });

    it('should handle all empty strings', () => {
      const items = ['', '   ', '\t\n'];
      const result = filterNonEmptyStrings(items);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(filterNonEmptyStrings([])).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(filterNonEmptyStrings(null)).toEqual([]);
      expect(filterNonEmptyStrings(undefined)).toEqual([]);
      expect(filterNonEmptyStrings('not array')).toEqual([]);
      expect(filterNonEmptyStrings(123)).toEqual([]);
    });

    it('should filter null and undefined values', () => {
      const items = ['hello', null, undefined, 'world'];
      const result = filterNonEmptyStrings(items);
      expect(result).toEqual(['hello', 'world']);
    });

    it('should handle non-string values', () => {
      const items = ['hello', 123, true, 'world', 0];
      const result = filterNonEmptyStrings(items);
      // Note: 0 is filtered out because safeTrim(0) = '' (falsy value treated as empty)
      expect(result).toEqual(['hello', 123, true, 'world']);
    });

    it('should preserve whitespace within strings', () => {
      const items = ['  hello world  ', '   ', 'foo  bar'];
      const result = filterNonEmptyStrings(items);
      expect(result).toEqual(['  hello world  ', 'foo  bar']);
    });

    it('should handle real-world name parts example', () => {
      const nameParts = ['John', '', 'Michael', '  ', 'Doe'];
      const result = filterNonEmptyStrings(nameParts);
      expect(result).toEqual(['John', 'Michael', 'Doe']);
    });
  });

  // ============================================================================
  // capitalize
  // ============================================================================

  describe('capitalize', () => {
    it('should capitalize first letter of lowercase string', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should preserve already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
      expect(capitalize('   ')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(capitalize(null)).toBe('');
      expect(capitalize(undefined)).toBe('');
    });

    it('should trim whitespace before capitalizing', () => {
      expect(capitalize('  hello  ')).toBe('Hello');
      expect(capitalize('\thello\n')).toBe('Hello');
    });

    it('should only capitalize first letter, preserve rest', () => {
      expect(capitalize('hello world')).toBe('Hello world');
      expect(capitalize('hello WORLD')).toBe('Hello WORLD');
      expect(capitalize('hELLO')).toBe('HELLO');
    });

    it('should handle Unicode characters', () => {
      expect(capitalize('café')).toBe('Café');
      expect(capitalize('über')).toBe('Über');
      expect(capitalize('école')).toBe('École');
    });

    it('should handle emoji at start', () => {
      expect(capitalize('😀 hello')).toBe('😀 hello');
    });

    it('should handle numbers', () => {
      expect(capitalize('123')).toBe('123');
      expect(capitalize('1st place')).toBe('1st place');
    });

    it('should handle mixed case input', () => {
      expect(capitalize('jOHN')).toBe('JOHN');
      expect(capitalize('mCDonald')).toBe('MCDonald');
    });
  });

  // ============================================================================
  // truncate
  // ============================================================================

  describe('truncate', () => {
    it('should truncate strings longer than maxLength', () => {
      expect(truncate('Hello world', 5)).toBe('Hello...');
      expect(truncate('This is a long string', 10)).toBe('This is a ...');
    });

    it('should not truncate strings shorter than or equal to maxLength', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use default maxLength of 50', () => {
      const longString = 'a'.repeat(60);
      const result = truncate(longString);
      expect(result).toBe('a'.repeat(50) + '...');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello world', 5, '---')).toBe('Hello---');
      expect(truncate('Hello world', 5, '')).toBe('Hello');
      expect(truncate('Hello world', 5, ' [more]')).toBe('Hello [more]');
    });

    it('should handle empty strings', () => {
      expect(truncate('')).toBe('');
      expect(truncate('', 10)).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(truncate(null)).toBe('');
      expect(truncate(undefined)).toBe('');
    });

    it('should trim whitespace before truncating', () => {
      expect(truncate('  Hello world  ', 5)).toBe('Hello...');
    });

    it('should handle maxLength of 1', () => {
      expect(truncate('Hello', 1)).toBe('H...');
    });

    it('should validate maxLength and use default for invalid values', () => {
      // Non-numeric maxLength
      expect(truncate('a'.repeat(60), 'invalid')).toBe('a'.repeat(50) + '...');
      expect(truncate('a'.repeat(60), null)).toBe('a'.repeat(50) + '...');
      expect(truncate('a'.repeat(60), undefined)).toBe('a'.repeat(50) + '...');

      // Negative maxLength
      expect(truncate('a'.repeat(60), -5)).toBe('a'.repeat(50) + '...');

      // Zero maxLength
      expect(truncate('a'.repeat(60), 0)).toBe('a'.repeat(50) + '...');

      // Infinity
      expect(truncate('Hello', Infinity)).toBe('Hello');

      // NaN
      expect(truncate('a'.repeat(60), NaN)).toBe('a'.repeat(50) + '...');
    });

    it('should floor decimal maxLength values', () => {
      expect(truncate('Hello world', 5.9)).toBe('Hello...');
      expect(truncate('Hello world', 7.1)).toBe('Hello w...');
    });

    it('should handle very large maxLength', () => {
      expect(truncate('Hello', 1000)).toBe('Hello');
      expect(truncate('Hello', 999999)).toBe('Hello');
    });

    it('should handle Unicode and emoji', () => {
      expect(truncate('Hello 世界', 7)).toBe('Hello 世...');
      // Note: Emoji are multi-byte characters, substring may split them
      // truncate uses substring() which counts UTF-16 code units, not visible characters
      const emojiResult = truncate('😀😀😀😀😀', 3);
      expect(emojiResult.length).toBe(6); // 3 chars + '...'
      // Don't test exact emoji output as substring can split surrogate pairs
    });

    it('should handle real-world use case', () => {
      const longNote =
        'This is a very long note that needs to be truncated for display in a list view where space is limited';
      const result = truncate(longNote, 50);
      // Should truncate at exactly 50 characters and add '...'
      expect(result).toBe(
        'This is a very long note that needs to be truncate...'
      );
      expect(result.length).toBe(53); // 50 chars + '...' (3 chars)
    });

    it('should handle numbers and booleans', () => {
      expect(truncate(123456789, 5)).toBe('12345...');
      expect(truncate(true, 3)).toBe('tru...');
    });
  });
});
