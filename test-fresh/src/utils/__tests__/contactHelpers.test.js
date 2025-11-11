/**
 * Contact Helpers Unit Tests
 *
 * Comprehensive tests for contact-related utilities
 * Tests cover: getContactDisplayName, getInitials, normalizePhoneNumber, formatPhoneNumber
 */

import {
  getContactDisplayName,
  getInitials,
  normalizePhoneNumber,
  formatPhoneNumber
} from '../contactHelpers';

describe('contactHelpers', () => {
  // ============================================================================
  // getContactDisplayName
  // ============================================================================

  describe('getContactDisplayName', () => {
    it('should use display_name if present', () => {
      const contact = { display_name: 'Johnny Appleseed' };
      expect(getContactDisplayName(contact)).toBe('Johnny Appleseed');
    });

    it('should trim whitespace from display_name', () => {
      const contact = { display_name: '  Johnny Appleseed  ' };
      expect(getContactDisplayName(contact)).toBe('Johnny Appleseed');
    });

    it('should build name from first and last name', () => {
      const contact = { first_name: 'John', last_name: 'Doe' };
      expect(getContactDisplayName(contact)).toBe('John Doe');
    });

    it('should build name from first, middle, and last name', () => {
      const contact = {
        first_name: 'John',
        middle_name: 'Michael',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('John Michael Doe');
    });

    it('should handle only first name', () => {
      const contact = { first_name: 'John' };
      expect(getContactDisplayName(contact)).toBe('John');
    });

    it('should handle only last name', () => {
      const contact = { last_name: 'Doe' };
      expect(getContactDisplayName(contact)).toBe('Doe');
    });

    it('should handle only middle name', () => {
      const contact = { middle_name: 'Michael' };
      expect(getContactDisplayName(contact)).toBe('Michael');
    });

    it('should skip empty name parts', () => {
      const contact = {
        first_name: 'John',
        middle_name: '',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('John Doe');
    });

    it('should skip whitespace-only name parts', () => {
      const contact = {
        first_name: 'John',
        middle_name: '   ',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('John Doe');
    });

    it('should use default fallback for empty contact', () => {
      expect(getContactDisplayName({})).toBe('Unknown Contact');
      expect(getContactDisplayName({ first_name: '', last_name: '' })).toBe('Unknown Contact');
    });

    it('should use custom fallback', () => {
      expect(getContactDisplayName({}, 'No Name')).toBe('No Name');
      expect(getContactDisplayName(null, 'Anonymous')).toBe('Anonymous');
    });

    it('should handle null contact', () => {
      expect(getContactDisplayName(null)).toBe('Unknown Contact');
      expect(getContactDisplayName(undefined)).toBe('Unknown Contact');
    });

    it('should prioritize display_name over computed name', () => {
      const contact = {
        display_name: 'Johnny',
        first_name: 'John',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('Johnny');
    });

    it('should handle Unicode characters in names', () => {
      const contact = {
        first_name: 'José',
        last_name: 'García'
      };
      expect(getContactDisplayName(contact)).toBe('José García');
    });

    it('should handle names with accents', () => {
      const contact = {
        first_name: 'François',
        middle_name: 'René',
        last_name: 'Müller'
      };
      expect(getContactDisplayName(contact)).toBe('François René Müller');
    });

    it('should handle Chinese characters', () => {
      const contact = {
        first_name: '李',
        last_name: '明'
      };
      expect(getContactDisplayName(contact)).toBe('李 明');
    });

    it('should handle emoji in display_name', () => {
      const contact = { display_name: '🎉 Party Guy 🎉' };
      expect(getContactDisplayName(contact)).toBe('🎉 Party Guy 🎉');
    });

    it('should handle empty display_name and fall back to name parts', () => {
      const contact = {
        display_name: '',
        first_name: 'John',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('John Doe');
    });

    it('should handle whitespace-only display_name', () => {
      const contact = {
        display_name: '   ',
        first_name: 'John',
        last_name: 'Doe'
      };
      expect(getContactDisplayName(contact)).toBe('John Doe');
    });
  });

  // ============================================================================
  // getInitials
  // ============================================================================

  describe('getInitials', () => {
    it('should extract initials from first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
      expect(getInitials('Jane', 'Smith')).toBe('JS');
    });

    it('should handle only first name', () => {
      expect(getInitials('John')).toBe('J');
      expect(getInitials('John', '')).toBe('J');
    });

    it('should handle only last name', () => {
      expect(getInitials('', 'Doe')).toBe('D');
      expect(getInitials(null, 'Doe')).toBe('D');
    });

    it('should convert initials to uppercase', () => {
      expect(getInitials('john', 'doe')).toBe('JD');
      expect(getInitials('JOHN', 'DOE')).toBe('JD');
      expect(getInitials('JoHn', 'DoE')).toBe('JD');
    });

    it('should use default fallback for empty names', () => {
      expect(getInitials('', '')).toBe('?');
      expect(getInitials(null, null)).toBe('?');
      expect(getInitials(undefined, undefined)).toBe('?');
    });

    it('should use custom fallback', () => {
      expect(getInitials('', '', 'XX')).toBe('XX');
      expect(getInitials(null, null, '--')).toBe('--');
    });

    it('should handle whitespace in names', () => {
      expect(getInitials('  John  ', '  Doe  ')).toBe('JD');
      expect(getInitials('John ', ' Doe')).toBe('JD');
    });

    it('should handle Unicode characters', () => {
      expect(getInitials('José', 'García')).toBe('JG');
      expect(getInitials('François', 'Müller')).toBe('FM');
      expect(getInitials('Søren', 'Østergård')).toBe('SØ');
    });

    it('should handle Chinese characters', () => {
      expect(getInitials('李', '明')).toBe('李明');
      expect(getInitials('王', '芳')).toBe('王芳');
    });

    it('should handle emoji correctly (multi-byte characters)', () => {
      // Emoji are multi-byte, spread operator handles them correctly
      expect(getInitials('😀', 'User')).toBe('😀U');
      expect(getInitials('John', '😀')).toBe('J😀');
    });

    it('should handle surrogate pairs correctly', () => {
      // Test characters outside Basic Multilingual Plane
      expect(getInitials('𝕁ohn', 'Doe')).toBe('𝕁D');
    });

    it('should handle names starting with lowercase', () => {
      expect(getInitials('john', 'doe')).toBe('JD');
      expect(getInitials('jane', 'smith')).toBe('JS');
    });

    it('should handle single-character names', () => {
      expect(getInitials('J', 'D')).toBe('JD');
      expect(getInitials('A', '')).toBe('A');
    });

    it('should handle multi-word names (only first character)', () => {
      expect(getInitials('Mary Jane', 'Watson')).toBe('MW');
      expect(getInitials('John Paul', 'Jones')).toBe('JJ');
    });

    it('should handle numbers in names', () => {
      expect(getInitials('3rd', 'Generation')).toBe('3G');
      expect(getInitials('Agent', '007')).toBe('A0');
    });
  });

  // ============================================================================
  // normalizePhoneNumber
  // ============================================================================

  describe('normalizePhoneNumber', () => {
    it('should remove formatting from US phone numbers', () => {
      expect(normalizePhoneNumber('(555) 123-4567')).toBe('5551234567');
      expect(normalizePhoneNumber('555-123-4567')).toBe('5551234567');
      expect(normalizePhoneNumber('555.123.4567')).toBe('5551234567');
      expect(normalizePhoneNumber('555 123 4567')).toBe('5551234567');
    });

    it('should handle 11-digit numbers with country code', () => {
      expect(normalizePhoneNumber('1-555-123-4567')).toBe('15551234567');
      expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('15551234567');
    });

    it('should handle numbers without formatting', () => {
      expect(normalizePhoneNumber('5551234567')).toBe('5551234567');
      expect(normalizePhoneNumber('15551234567')).toBe('15551234567');
    });

    it('should handle international numbers', () => {
      expect(normalizePhoneNumber('+33 1 42 86 82 00')).toBe('33142868200');
      expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('442079460958');
      expect(normalizePhoneNumber('+49 30 123456')).toBe('4930123456');
      expect(normalizePhoneNumber('+86 10 1234 5678')).toBe('861012345678');
    });

    it('should handle empty strings', () => {
      expect(normalizePhoneNumber('')).toBe('');
      expect(normalizePhoneNumber('   ')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(normalizePhoneNumber(null)).toBe('');
      expect(normalizePhoneNumber(undefined)).toBe('');
    });

    it('should handle numeric input', () => {
      expect(normalizePhoneNumber(5551234567)).toBe('5551234567');
      expect(normalizePhoneNumber(15551234567)).toBe('15551234567');
    });

    it('should remove all non-digit characters', () => {
      expect(normalizePhoneNumber('(555) 123-4567 ext. 123')).toBe('5551234567123');
      expect(normalizePhoneNumber('555-123-4567 x123')).toBe('5551234567123');
      expect(normalizePhoneNumber('Phone: 555-123-4567')).toBe('5551234567');
    });

    it('should handle special characters', () => {
      expect(normalizePhoneNumber('555.123.4567')).toBe('5551234567');
      expect(normalizePhoneNumber('555•123•4567')).toBe('5551234567');
      expect(normalizePhoneNumber('555—123—4567')).toBe('5551234567');
    });

    it('should handle very short numbers', () => {
      expect(normalizePhoneNumber('911')).toBe('911');
      expect(normalizePhoneNumber('123')).toBe('123');
    });

    it('should handle very long numbers', () => {
      const longNumber = '1234567890123456789';
      expect(normalizePhoneNumber(longNumber)).toBe(longNumber);
    });
  });

  // ============================================================================
  // formatPhoneNumber
  // ============================================================================

  describe('formatPhoneNumber', () => {
    it('should format 10-digit US numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should format 10-digit numbers with formatting', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('555.123.4567')).toBe('(555) 123-4567');
    });

    it('should format 11-digit numbers starting with 1', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
    });

    it('should format 11-digit numbers with existing formatting', () => {
      expect(formatPhoneNumber('1-555-123-4567')).toBe('+1 (555) 123-4567');
      expect(formatPhoneNumber('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('should preserve international numbers unchanged', () => {
      // French number (11 digits after normalization)
      expect(formatPhoneNumber('+33 1 42 86 82 00')).toBe('+33 1 42 86 82 00');
      // UK number (12 digits after normalization)
      expect(formatPhoneNumber('+44 20 7946 0958')).toBe('+44 20 7946 0958');
      // German number: '+49 30 123456' normalizes to '4930123456' (10 digits)
      // Since it's exactly 10 digits, it gets formatted as US number
      expect(formatPhoneNumber('+49 30 123456')).toBe('(493) 012-3456');
      // Chinese number (12 digits after normalization)
      expect(formatPhoneNumber('+86 10 1234 5678')).toBe('+86 10 1234 5678');
    });

    it('should handle empty strings', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('   ')).toBe('   ');
    });

    it('should handle null and undefined', () => {
      expect(formatPhoneNumber(null)).toBe('');
      expect(formatPhoneNumber(undefined)).toBe('');
    });

    it('should handle numeric input', () => {
      expect(formatPhoneNumber(5551234567)).toBe('(555) 123-4567');
      expect(formatPhoneNumber(15551234567)).toBe('+1 (555) 123-4567');
    });

    it('should preserve too-short numbers unchanged', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('911')).toBe('911');
      expect(formatPhoneNumber('555-1234')).toBe('555-1234');
    });

    it('should preserve 11-digit numbers not starting with 1', () => {
      // These are likely international numbers with country code
      expect(formatPhoneNumber('25551234567')).toBe('25551234567');
      expect(formatPhoneNumber('33142868200')).toBe('33142868200');
    });

    it('should handle very long numbers', () => {
      const longNumber = '12345678901234567890';
      expect(formatPhoneNumber(longNumber)).toBe(longNumber);
    });

    it('should handle numbers with extensions (preserves original format)', () => {
      // Extensions are not normalized, so they remain in original format
      expect(formatPhoneNumber('(555) 123-4567 ext. 123')).toBe('(555) 123-4567 ext. 123');
    });

    it('should handle zero as input', () => {
      expect(formatPhoneNumber(0)).toBe(''); // String(0 || '') = ''
    });

    it('should format normalized then formatted numbers consistently', () => {
      const original = '(555) 123-4567';
      const formatted = formatPhoneNumber(original);
      expect(formatted).toBe('(555) 123-4567');

      // Formatting twice should be idempotent
      expect(formatPhoneNumber(formatted)).toBe(formatted);
    });

    it('should handle real-world international formats', () => {
      // Various international number formats should be preserved
      // French: +33-1-42-86-82-00 → 33142868200 (11 digits, not starting with 1) → preserved
      expect(formatPhoneNumber('+33-1-42-86-82-00')).toBe('+33-1-42-86-82-00');
      // German: (+49) 30 123456 → 4930123456 (10 digits) → formatted as US
      expect(formatPhoneNumber('(+49) 30 123456')).toBe('(493) 012-3456');
      // Chinese: +86-10-1234-5678 → 861012345678 (12 digits) → preserved
      expect(formatPhoneNumber('+86-10-1234-5678')).toBe('+86-10-1234-5678');
    });
  });
});
