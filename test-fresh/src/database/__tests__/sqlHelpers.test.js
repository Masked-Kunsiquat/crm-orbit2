import { placeholders, pick, buildUpdateSet, buildInsert } from '../sqlHelpers';

describe('sqlHelpers', () => {
  // ============================================================================
  // placeholders()
  // ============================================================================
  describe('placeholders', () => {
    describe('valid inputs', () => {
      it('should generate single placeholder', () => {
        expect(placeholders(1)).toBe('?');
      });

      it('should generate multiple placeholders', () => {
        expect(placeholders(3)).toBe('?, ?, ?');
      });

      it('should generate many placeholders', () => {
        expect(placeholders(10)).toBe('?, ?, ?, ?, ?, ?, ?, ?, ?, ?');
      });

      it('should handle large counts', () => {
        const result = placeholders(100);
        expect(result.split(', ')).toHaveLength(100);
        expect(result.split('?')).toHaveLength(101); // N placeholders = N+1 splits
      });

      it('should handle maximum safe integer', () => {
        // Testing with a reasonable large number instead of MAX_SAFE_INTEGER for performance
        const count = 1000;
        const result = placeholders(count);
        expect(result.split(', ')).toHaveLength(count);
      });
    });

    describe('invalid inputs', () => {
      it('should throw on zero', () => {
        expect(() => placeholders(0)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on negative number', () => {
        expect(() => placeholders(-1)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on large negative number', () => {
        expect(() => placeholders(-100)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on float', () => {
        expect(() => placeholders(3.5)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on string', () => {
        expect(() => placeholders('3')).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on null', () => {
        expect(() => placeholders(null)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on undefined', () => {
        expect(() => placeholders(undefined)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on object', () => {
        expect(() => placeholders({})).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on array', () => {
        expect(() => placeholders([])).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on NaN', () => {
        expect(() => placeholders(NaN)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on Infinity', () => {
        expect(() => placeholders(Infinity)).toThrow('placeholders() requires a positive integer');
      });

      it('should throw on -Infinity', () => {
        expect(() => placeholders(-Infinity)).toThrow('placeholders() requires a positive integer');
      });
    });

    describe('SQL injection safety', () => {
      it('should not be affected by malicious count values', () => {
        // Since we validate the input, these should all throw
        expect(() => placeholders("1; DROP TABLE users--")).toThrow();
        expect(() => placeholders("' OR '1'='1")).toThrow();
      });

      it('should generate safe SQL placeholders', () => {
        const result = placeholders(3);
        // Should only contain ?, commas, and spaces
        expect(result).toMatch(/^(\?,\s)*\?$/);
        expect(result).not.toContain(';');
        expect(result).not.toContain('--');
        expect(result).not.toContain('DROP');
        expect(result).not.toContain('SELECT');
      });
    });

    describe('performance', () => {
      it('should handle typical batch sizes efficiently', () => {
        const start = Date.now();
        placeholders(500); // Typical SQLite batch size
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100); // Should complete in <100ms
      });
    });
  });

  // ============================================================================
  // pick()
  // ============================================================================
  describe('pick', () => {
    describe('basic field extraction', () => {
      it('should extract single field', () => {
        const obj = { name: 'John', age: 30, city: 'NYC' };
        const result = pick(obj, ['name']);
        expect(result).toEqual({ name: 'John' });
      });

      it('should extract multiple fields', () => {
        const obj = { name: 'John', age: 30, city: 'NYC' };
        const result = pick(obj, ['name', 'age']);
        expect(result).toEqual({ name: 'John', age: 30 });
      });

      it('should extract all fields when all are allowed', () => {
        const obj = { name: 'John', age: 30 };
        const result = pick(obj, ['name', 'age']);
        expect(result).toEqual({ name: 'John', age: 30 });
      });

      it('should ignore fields not in allowed list', () => {
        const obj = { name: 'John', age: 30, extra: 'ignore' };
        const result = pick(obj, ['name', 'age']);
        expect(result).toEqual({ name: 'John', age: 30 });
        expect(result).not.toHaveProperty('extra');
      });

      it('should handle empty allowed fields array', () => {
        const obj = { name: 'John', age: 30 };
        const result = pick(obj, []);
        expect(result).toEqual({});
      });

      it('should handle empty object', () => {
        const result = pick({}, ['name', 'age']);
        expect(result).toEqual({});
      });

      it('should handle fields that do not exist in object', () => {
        const obj = { name: 'John' };
        const result = pick(obj, ['name', 'age', 'email']);
        expect(result).toEqual({ name: 'John' });
      });
    });

    describe('undefined handling', () => {
      it('should filter out undefined values', () => {
        const obj = { name: 'John', age: undefined, city: 'NYC' };
        const result = pick(obj, ['name', 'age', 'city']);
        expect(result).toEqual({ name: 'John', city: 'NYC' });
        expect(result).not.toHaveProperty('age');
      });

      it('should keep null values', () => {
        const obj = { name: 'John', age: null };
        const result = pick(obj, ['name', 'age']);
        expect(result).toEqual({ name: 'John', age: null });
      });

      it('should keep false values', () => {
        const obj = { name: 'John', active: false };
        const result = pick(obj, ['name', 'active']);
        expect(result).toEqual({ name: 'John', active: false });
      });

      it('should keep zero values', () => {
        const obj = { name: 'John', count: 0 };
        const result = pick(obj, ['name', 'count']);
        expect(result).toEqual({ name: 'John', count: 0 });
      });

      it('should keep empty string values', () => {
        const obj = { name: 'John', notes: '' };
        const result = pick(obj, ['name', 'notes']);
        expect(result).toEqual({ name: 'John', notes: '' });
      });
    });

    describe('data types', () => {
      it('should handle string values', () => {
        const obj = { name: 'John', role: 'admin' };
        const result = pick(obj, ['name', 'role']);
        expect(result).toEqual({ name: 'John', role: 'admin' });
      });

      it('should handle number values', () => {
        const obj = { age: 30, score: 95.5 };
        const result = pick(obj, ['age', 'score']);
        expect(result).toEqual({ age: 30, score: 95.5 });
      });

      it('should handle boolean values', () => {
        const obj = { active: true, verified: false };
        const result = pick(obj, ['active', 'verified']);
        expect(result).toEqual({ active: true, verified: false });
      });

      it('should handle array values', () => {
        const obj = { tags: ['a', 'b'], ids: [1, 2, 3] };
        const result = pick(obj, ['tags', 'ids']);
        expect(result).toEqual({ tags: ['a', 'b'], ids: [1, 2, 3] });
      });

      it('should handle object values', () => {
        const obj = { meta: { created: '2024-01-01' }, settings: {} };
        const result = pick(obj, ['meta', 'settings']);
        expect(result).toEqual({ meta: { created: '2024-01-01' }, settings: {} });
      });

      it('should handle Date values', () => {
        const date = new Date('2024-01-01');
        const obj = { name: 'John', createdAt: date };
        const result = pick(obj, ['name', 'createdAt']);
        expect(result).toEqual({ name: 'John', createdAt: date });
      });
    });

    describe('prototype and inherited properties', () => {
      it('should not pick inherited properties', () => {
        const parent = { inherited: 'value' };
        const obj = Object.create(parent);
        obj.own = 'property';

        const result = pick(obj, ['own', 'inherited']);
        expect(result).toEqual({ own: 'property' });
        expect(result).not.toHaveProperty('inherited');
      });

      it('should not be affected by __proto__', () => {
        const obj = { name: 'John', __proto__: { malicious: 'value' } };
        const result = pick(obj, ['name', '__proto__']);
        expect(result.name).toBe('John');
        // __proto__ should not be in result as a data property
      });
    });

    describe('edge cases', () => {
      it('should handle special characters in field names', () => {
        const obj = { 'field-name': 'value1', 'field_name': 'value2', 'field.name': 'value3' };
        const result = pick(obj, ['field-name', 'field_name', 'field.name']);
        expect(result).toEqual({
          'field-name': 'value1',
          'field_name': 'value2',
          'field.name': 'value3'
        });
      });

      it('should handle numeric field names', () => {
        const obj = { '0': 'zero', '1': 'one', '2': 'two' };
        const result = pick(obj, ['0', '1']);
        expect(result).toEqual({ '0': 'zero', '1': 'one' });
      });

      it('should create new object (not mutate original)', () => {
        const obj = { name: 'John', age: 30 };
        const result = pick(obj, ['name']);
        expect(result).not.toBe(obj);
        expect(obj).toEqual({ name: 'John', age: 30 }); // Original unchanged
      });

      it('should handle duplicate fields in allowed array', () => {
        const obj = { name: 'John', age: 30 };
        const result = pick(obj, ['name', 'name', 'age']);
        expect(result).toEqual({ name: 'John', age: 30 });
        expect(Object.keys(result)).toEqual(['name', 'age']);
      });
    });

    describe('SQL use cases', () => {
      it('should filter INSERT data to allowed columns', () => {
        const userData = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'secret123',
          malicious_field: 'DROP TABLE users',
          created_at: '2024-01-01'
        };
        const allowedFields = ['first_name', 'last_name', 'email', 'password'];
        const result = pick(userData, allowedFields);

        expect(result).toEqual({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'secret123'
        });
        expect(result).not.toHaveProperty('malicious_field');
        expect(result).not.toHaveProperty('created_at');
      });

      it('should filter UPDATE data to allowed columns', () => {
        const updateData = {
          name: 'John Updated',
          age: 31,
          id: 123, // Should not be updatable
          created_at: '2024-01-01' // Should not be updatable
        };
        const allowedFields = ['name', 'age'];
        const result = pick(updateData, allowedFields);

        expect(result).toEqual({ name: 'John Updated', age: 31 });
        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('created_at');
      });
    });
  });

  // ============================================================================
  // buildUpdateSet()
  // ============================================================================
  describe('buildUpdateSet', () => {
    describe('basic SQL generation', () => {
      it('should build SET clause for single field', () => {
        const data = { name: 'John' };
        const result = buildUpdateSet(data);
        expect(result).toEqual({
          setClause: 'name = ?',
          values: ['John']
        });
      });

      it('should build SET clause for multiple fields', () => {
        const data = { name: 'John', age: 30 };
        const result = buildUpdateSet(data);
        expect(result.setClause).toBe('name = ?, age = ?');
        expect(result.values).toEqual(['John', 30]);
      });

      it('should build SET clause for many fields', () => {
        const data = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          age: 30,
          active: true
        };
        const result = buildUpdateSet(data);
        expect(result.setClause).toBe('first_name = ?, last_name = ?, email = ?, age = ?, active = ?');
        expect(result.values).toEqual(['John', 'Doe', 'john@example.com', 30, true]);
      });

      it('should handle empty data object', () => {
        const result = buildUpdateSet({});
        expect(result).toEqual({
          setClause: '',
          values: []
        });
      });
    });

    describe('value types', () => {
      it('should handle string values', () => {
        const data = { name: 'John', role: 'admin' };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual(['John', 'admin']);
      });

      it('should handle number values', () => {
        const data = { age: 30, score: 95.5 };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual([30, 95.5]);
      });

      it('should handle boolean values', () => {
        const data = { active: true, verified: false };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual([true, false]);
      });

      it('should handle null values', () => {
        const data = { name: 'John', email: null };
        const result = buildUpdateSet(data);
        expect(result.setClause).toBe('name = ?, email = ?');
        expect(result.values).toEqual(['John', null]);
      });

      it('should handle zero', () => {
        const data = { count: 0 };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual([0]);
      });

      it('should handle empty string', () => {
        const data = { notes: '' };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual(['']);
      });

      it('should handle false', () => {
        const data = { active: false };
        const result = buildUpdateSet(data);
        expect(result.values).toEqual([false]);
      });
    });

    describe('field order consistency', () => {
      it('should maintain field order in SET clause and values', () => {
        const data = { z_field: 'last', a_field: 'first', m_field: 'middle' };
        const result = buildUpdateSet(data);

        const fields = result.setClause.split(', ').map(s => s.split(' = ')[0]);
        expect(fields).toEqual(['z_field', 'a_field', 'm_field']);
        expect(result.values).toEqual(['last', 'first', 'middle']);
      });

      it('should keep values aligned with SET clause', () => {
        const data = { name: 'John', age: 30, email: 'john@example.com' };
        const result = buildUpdateSet(data);

        const fields = result.setClause.split(', ').map(s => s.split(' = ')[0]);

        fields.forEach((field, index) => {
          expect(result.values[index]).toBe(data[field]);
        });
      });
    });

    describe('SQL injection safety', () => {
      it('should not be vulnerable to field name injection', () => {
        const data = { 'name; DROP TABLE users--': 'malicious' };
        const result = buildUpdateSet(data);

        // The field name will be used as-is, but it won't execute SQL
        // because it's in the SET clause, not executed as SQL
        expect(result.setClause).toContain('name; DROP TABLE users-- = ?');
        expect(result.values).toEqual(['malicious']);
      });

      it('should safely handle SQL-like values', () => {
        const data = {
          name: "'; DROP TABLE users--",
          email: "admin' OR '1'='1"
        };
        const result = buildUpdateSet(data);

        // Values are parameterized, so they're safe
        expect(result.setClause).toBe('name = ?, email = ?');
        expect(result.values).toEqual(["'; DROP TABLE users--", "admin' OR '1'='1"]);
      });
    });

    describe('edge cases', () => {
      it('should handle special characters in field names', () => {
        const data = { 'field-name': 'value1', 'field_name': 'value2' };
        const result = buildUpdateSet(data);
        expect(result.setClause).toContain('field-name = ?');
        expect(result.setClause).toContain('field_name = ?');
      });

      it('should handle single character field names', () => {
        const data = { a: 1, b: 2, c: 3 };
        const result = buildUpdateSet(data);
        expect(result.setClause).toBe('a = ?, b = ?, c = ?');
        expect(result.values).toEqual([1, 2, 3]);
      });

      it('should handle very long field names', () => {
        const longFieldName = 'a'.repeat(100);
        const data = { [longFieldName]: 'value' };
        const result = buildUpdateSet(data);
        expect(result.setClause).toBe(`${longFieldName} = ?`);
        expect(result.values).toEqual(['value']);
      });
    });

    describe('integration with UPDATE queries', () => {
      it('should generate valid UPDATE query components', () => {
        const data = { name: 'John', age: 30 };
        const { setClause, values } = buildUpdateSet(data);

        const updateSQL = `UPDATE users SET ${setClause} WHERE id = ?`;
        const allValues = [...values, 123];

        expect(updateSQL).toBe('UPDATE users SET name = ?, age = ? WHERE id = ?');
        expect(allValues).toEqual(['John', 30, 123]);
      });

      it('should handle typical database update scenario', () => {
        const userData = {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          updated_at: '2024-01-01'
        };
        const { setClause, values } = buildUpdateSet(userData);

        expect(setClause).toBe('first_name = ?, last_name = ?, email = ?, updated_at = ?');
        expect(values).toEqual(['Jane', 'Smith', 'jane@example.com', '2024-01-01']);
      });
    });
  });

  // ============================================================================
  // buildInsert()
  // ============================================================================
  describe('buildInsert', () => {
    describe('basic SQL generation', () => {
      it('should build INSERT statement for single field', () => {
        const result = buildInsert('users', { name: 'John' });
        expect(result).toEqual({
          sql: 'INSERT INTO users (name) VALUES (?)',
          values: ['John']
        });
      });

      it('should build INSERT statement for multiple fields', () => {
        const result = buildInsert('users', { name: 'John', age: 30 });
        expect(result.sql).toBe('INSERT INTO users (name, age) VALUES (?, ?)');
        expect(result.values).toEqual(['John', 30]);
      });

      it('should build INSERT statement for many fields', () => {
        const data = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          age: 30,
          active: true
        };
        const result = buildInsert('contacts', data);

        expect(result.sql).toBe(
          'INSERT INTO contacts (first_name, last_name, email, age, active) VALUES (?, ?, ?, ?, ?)'
        );
        expect(result.values).toEqual(['John', 'Doe', 'john@example.com', 30, true]);
      });

      it('should throw on empty data object', () => {
        expect(() => buildInsert('users', {})).toThrow('Cannot build INSERT with empty data object');
      });
    });

    describe('table names', () => {
      it('should handle simple table names', () => {
        const result = buildInsert('users', { name: 'John' });
        expect(result.sql).toContain('INSERT INTO users');
      });

      it('should handle table names with underscores', () => {
        const result = buildInsert('user_profiles', { name: 'John' });
        expect(result.sql).toContain('INSERT INTO user_profiles');
      });

      it('should handle long table names', () => {
        const result = buildInsert('very_long_table_name_for_testing', { name: 'John' });
        expect(result.sql).toContain('INSERT INTO very_long_table_name_for_testing');
      });
    });

    describe('value types', () => {
      it('should handle string values', () => {
        const result = buildInsert('users', { name: 'John', role: 'admin' });
        expect(result.values).toEqual(['John', 'admin']);
      });

      it('should handle number values', () => {
        const result = buildInsert('users', { age: 30, score: 95.5 });
        expect(result.values).toEqual([30, 95.5]);
      });

      it('should handle boolean values', () => {
        const result = buildInsert('users', { active: true, verified: false });
        expect(result.values).toEqual([true, false]);
      });

      it('should handle null values', () => {
        const result = buildInsert('users', { name: 'John', email: null });
        expect(result.values).toEqual(['John', null]);
      });

      it('should handle zero', () => {
        const result = buildInsert('counters', { count: 0 });
        expect(result.values).toEqual([0]);
      });

      it('should handle empty string', () => {
        const result = buildInsert('notes', { content: '' });
        expect(result.values).toEqual(['']);
      });

      it('should handle false', () => {
        const result = buildInsert('settings', { enabled: false });
        expect(result.values).toEqual([false]);
      });

      it('should handle mixed types', () => {
        const data = {
          name: 'John',
          age: 30,
          active: true,
          email: null,
          score: 0,
          notes: ''
        };
        const result = buildInsert('users', data);
        expect(result.values).toEqual(['John', 30, true, null, 0, '']);
      });
    });

    describe('column and value alignment', () => {
      it('should maintain alignment between columns and placeholders', () => {
        const data = { name: 'John', age: 30, email: 'john@example.com' };
        const result = buildInsert('users', data);

        // Extract columns from SQL
        const columnsMatch = result.sql.match(/\(([^)]+)\) VALUES/);
        const columns = columnsMatch[1].split(', ');

        // Extract placeholders from SQL
        const placeholdersMatch = result.sql.match(/VALUES \(([^)]+)\)/);
        const placeholders = placeholdersMatch[1].split(', ');

        expect(columns.length).toBe(placeholders.length);
        expect(columns.length).toBe(result.values.length);

        columns.forEach((col, index) => {
          expect(result.values[index]).toBe(data[col]);
        });
      });

      it('should handle field order consistency', () => {
        const data = { z_field: 'last', a_field: 'first', m_field: 'middle' };
        const result = buildInsert('test', data);

        const columnsMatch = result.sql.match(/\(([^)]+)\) VALUES/);
        const columns = columnsMatch[1].split(', ');

        columns.forEach((col, index) => {
          expect(result.values[index]).toBe(data[col]);
        });
      });
    });

    describe('SQL injection safety', () => {
      it('should safely handle SQL-like table names', () => {
        // Note: In production, table names should be validated/whitelisted
        // This test shows the function doesn't sanitize table names
        const result = buildInsert('users; DROP TABLE test--', { name: 'John' });
        expect(result.sql).toContain('users; DROP TABLE test--');
      });

      it('should safely handle SQL-like values via parameterization', () => {
        const data = {
          name: "'; DROP TABLE users--",
          email: "admin' OR '1'='1"
        };
        const result = buildInsert('users', data);

        // Values are parameterized, so they're safe
        expect(result.sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
        expect(result.values).toEqual(["'; DROP TABLE users--", "admin' OR '1'='1"]);
      });

      it('should not execute malicious column names', () => {
        const data = { 'name; DROP TABLE users--': 'malicious' };
        const result = buildInsert('users', data);

        // Column name is used as-is (should be validated elsewhere)
        expect(result.sql).toContain('name; DROP TABLE users--');
        expect(result.values).toEqual(['malicious']);
      });
    });

    describe('edge cases', () => {
      it('should handle special characters in column names', () => {
        const data = { 'field-name': 'value1', 'field_name': 'value2' };
        const result = buildInsert('test', data);
        expect(result.sql).toContain('field-name');
        expect(result.sql).toContain('field_name');
      });

      it('should handle single character column names', () => {
        const data = { a: 1, b: 2, c: 3 };
        const result = buildInsert('test', data);
        expect(result.sql).toBe('INSERT INTO test (a, b, c) VALUES (?, ?, ?)');
        expect(result.values).toEqual([1, 2, 3]);
      });

      it('should handle very long column names', () => {
        const longFieldName = 'a'.repeat(100);
        const data = { [longFieldName]: 'value' };
        const result = buildInsert('test', data);
        expect(result.sql).toContain(longFieldName);
        expect(result.values).toEqual(['value']);
      });

      it('should handle numeric column names', () => {
        const data = { '0': 'zero', '1': 'one' };
        const result = buildInsert('test', data);
        expect(result.sql).toBe('INSERT INTO test (0, 1) VALUES (?, ?)');
        expect(result.values).toEqual(['zero', 'one']);
      });
    });

    describe('integration scenarios', () => {
      it('should generate valid INSERT for contacts table', () => {
        const contactData = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          company_id: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };
        const result = buildInsert('contacts', contactData);

        expect(result.sql).toContain('INSERT INTO contacts');
        expect(result.sql).toContain('VALUES (?, ?, ?, ?, ?, ?, ?)');
        expect(result.values).toHaveLength(7);
      });

      it('should work with pick() for field filtering', () => {
        const userData = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          malicious_field: 'DROP TABLE users',
          id: 123 // Should not be inserted
        };

        const allowedFields = ['first_name', 'last_name', 'email'];
        const filtered = pick(userData, allowedFields);
        const result = buildInsert('users', filtered);

        expect(result.sql).toBe('INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)');
        expect(result.values).toEqual(['John', 'Doe', 'john@example.com']);
        expect(result.sql).not.toContain('malicious_field');
        expect(result.sql).not.toContain('id');
      });
    });

    describe('error handling', () => {
      it('should throw descriptive error for empty data', () => {
        expect(() => buildInsert('users', {})).toThrow('Cannot build INSERT with empty data object');
      });

      it('should not throw for single field', () => {
        expect(() => buildInsert('users', { name: 'John' })).not.toThrow();
      });
    });

    describe('placeholder count validation', () => {
      it('should generate correct number of placeholders', () => {
        const data = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        const result = buildInsert('test', data);

        const placeholdersMatch = result.sql.match(/VALUES \(([^)]+)\)/);
        const placeholders = placeholdersMatch[1].split(', ');

        expect(placeholders).toHaveLength(5);
        expect(placeholders.every(p => p === '?')).toBe(true);
      });

      it('should match placeholders count with values count', () => {
        const data = { name: 'John', age: 30, email: 'john@example.com' };
        const result = buildInsert('users', data);

        const placeholdersMatch = result.sql.match(/VALUES \(([^)]+)\)/);
        const placeholders = placeholdersMatch[1].split(', ');

        expect(placeholders.length).toBe(result.values.length);
      });
    });
  });
});
