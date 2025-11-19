/**
 * Array Helpers Unit Tests
 *
 * Tests for chunk, unique, and uniqueBy functions
 */

import { chunk, unique, uniqueBy } from '../arrayHelpers';

describe('arrayHelpers', () => {
  describe('chunk', () => {
    it('should split array into chunks of specified size', () => {
      const result = chunk([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle array length equal to chunk size', () => {
      const result = chunk([1, 2, 3], 3);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle chunk size larger than array length', () => {
      const result = chunk([1, 2, 3], 10);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const result = chunk([], 3);
      expect(result).toEqual([]);
    });

    it('should handle chunk size of 1', () => {
      const result = chunk([1, 2, 3], 1);
      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should throw TypeError if first argument is not an array', () => {
      expect(() => chunk('not array', 2)).toThrow(TypeError);
      expect(() => chunk('not array', 2)).toThrow('First argument must be an array');
    });

    it('should throw TypeError if first argument is null', () => {
      expect(() => chunk(null, 2)).toThrow(TypeError);
    });

    it('should throw TypeError if first argument is undefined', () => {
      expect(() => chunk(undefined, 2)).toThrow(TypeError);
    });

    it('should throw TypeError if chunk size is not an integer', () => {
      expect(() => chunk([1, 2, 3], 2.5)).toThrow(TypeError);
      expect(() => chunk([1, 2, 3], 2.5)).toThrow('Chunk size must be a positive integer');
    });

    it('should throw TypeError if chunk size is zero', () => {
      expect(() => chunk([1, 2, 3], 0)).toThrow(TypeError);
      expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be a positive integer');
    });

    it('should throw TypeError if chunk size is negative', () => {
      expect(() => chunk([1, 2, 3], -1)).toThrow(TypeError);
    });

    it('should throw TypeError if chunk size is not a number', () => {
      expect(() => chunk([1, 2, 3], 'two')).toThrow(TypeError);
    });

    it('should work with large arrays (SQLite use case)', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = chunk(largeArray, 500);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(500);
      expect(result[1]).toHaveLength(500);
      expect(result[0][0]).toBe(0);
      expect(result[1][499]).toBe(999);
    });
  });

  describe('unique', () => {
    it('should remove duplicate numbers', () => {
      const result = unique([1, 2, 2, 3, 1]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should remove duplicate strings', () => {
      const result = unique(['a', 'b', 'a', 'c']);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      const result = unique([]);
      expect(result).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      const result = unique([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle array with all duplicates', () => {
      const result = unique([1, 1, 1, 1]);
      expect(result).toEqual([1]);
    });

    it('should preserve order of first occurrence', () => {
      const result = unique([3, 1, 2, 1, 3]);
      expect(result).toEqual([3, 1, 2]);
    });

    it('should handle mixed types', () => {
      const result = unique([1, '1', 2, '2', 1]);
      expect(result).toEqual([1, '1', 2, '2']);
    });

    it('should handle null and undefined values', () => {
      const result = unique([1, null, 2, null, undefined, 3, undefined]);
      expect(result).toEqual([1, null, 2, undefined, 3]);
    });

    it('should throw TypeError if argument is not an array', () => {
      expect(() => unique('not array')).toThrow(TypeError);
      expect(() => unique('not array')).toThrow('Argument must be an array');
    });

    it('should throw TypeError if argument is null', () => {
      expect(() => unique(null)).toThrow(TypeError);
    });

    it('should throw TypeError if argument is undefined', () => {
      expect(() => unique(undefined)).toThrow(TypeError);
    });

    it('should work with large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i % 100);
      const result = unique(largeArray);

      expect(result).toHaveLength(100);
      expect(result).toContain(0);
      expect(result).toContain(99);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by string key', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Duplicate' }
      ];
      const result = uniqueBy(input, 'id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: 'Alice' });
      expect(result[1]).toEqual({ id: 2, name: 'Bob' });
    });

    it('should remove duplicates by function key', () => {
      const input = [
        { id: 1, value: 100 },
        { id: 2, value: 200 },
        { id: 3, value: 100 }
      ];
      const result = uniqueBy(input, obj => obj.value);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(200);
    });

    it('should handle empty array', () => {
      const result = uniqueBy([], 'id');
      expect(result).toEqual([]);
    });

    it('should preserve first occurrence', () => {
      const input = [
        { id: 1, name: 'First' },
        { id: 1, name: 'Second' },
        { id: 1, name: 'Third' }
      ];
      const result = uniqueBy(input, 'id');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('First');
    });

    it('should handle array with no duplicates', () => {
      const input = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];
      const result = uniqueBy(input, 'id');

      expect(result).toHaveLength(3);
    });

    it('should handle nested property access with function', () => {
      const input = [
        { user: { id: 1 }, data: 'a' },
        { user: { id: 2 }, data: 'b' },
        { user: { id: 1 }, data: 'c' }
      ];
      const result = uniqueBy(input, obj => obj.user.id);

      expect(result).toHaveLength(2);
      expect(result[0].data).toBe('a');
      expect(result[1].data).toBe('b');
    });

    it('should handle null/undefined key values', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: null, name: 'Bob' },
        { id: undefined, name: 'Charlie' },
        { id: null, name: 'Dave' }
      ];
      const result = uniqueBy(input, 'id');

      expect(result).toHaveLength(3);
      expect(result.map(r => r.name)).toContain('Alice');
      expect(result.map(r => r.name)).toContain('Bob');
      expect(result.map(r => r.name)).toContain('Charlie');
    });

    it('should throw TypeError if first argument is not an array', () => {
      expect(() => uniqueBy('not array', 'id')).toThrow(TypeError);
      expect(() => uniqueBy('not array', 'id')).toThrow('First argument must be an array');
    });

    it('should throw TypeError if key is not string or function', () => {
      expect(() => uniqueBy([{ id: 1 }], 123)).toThrow(TypeError);
      expect(() => uniqueBy([{ id: 1 }], 123)).toThrow('Key must be a string or function');
    });

    it('should throw TypeError if key is null', () => {
      expect(() => uniqueBy([{ id: 1 }], null)).toThrow(TypeError);
    });

    it('should throw TypeError if key is undefined', () => {
      expect(() => uniqueBy([{ id: 1 }], undefined)).toThrow(TypeError);
    });

    it('should work with large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i % 100,
        value: i
      }));
      const result = uniqueBy(largeArray, 'id');

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe(0);
      expect(result[99].id).toBe(99);
    });

    it('should work with category IDs (real use case)', () => {
      const categoryIds = [1, 2, 3, 2, 1, 4];
      const objects = categoryIds.map(id => ({ categoryId: id }));
      const result = uniqueBy(objects, 'categoryId');

      expect(result).toHaveLength(4);
      expect(result.map(r => r.categoryId)).toEqual([1, 2, 3, 4]);
    });
  });
});
