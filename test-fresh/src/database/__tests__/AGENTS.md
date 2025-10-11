# Database Testing Guidelines

This document outlines the testing conventions and patterns used in the database module tests.

## Overview

The database tests ensure comprehensive coverage of all CRUD operations, edge cases, and business logic for each database module. All tests use real in-memory SQLite databases to validate functionality for maximum consistency and reliability.

## Test Architecture

### Unified Testing Approach

**In-Memory SQLite Testing** (all test files)
- Uses `sql.js` for real SQLite database operations
- Comprehensive integration testing across all modules
- Validates actual SQL queries and database constraints
- Ensures consistent behavior with production SQLite environment

## File Structure

### Naming Conventions
- Test files: `{moduleName}.test.js`
- Location: `src/database/__tests__/`
- One test file per main database module

### Import Patterns
```javascript
// Standard import pattern for all tests
import initSqlJs from 'sql.js';
import path from 'path';
import { createModuleDB } from '../module';
import { createHelperDB } from '../moduleHelper'; // if applicable
import { DatabaseError } from '../errors';
```

## Testing Utilities

### In-Memory SQLite Context
```javascript
function rowsFromResult(result) {
  // sql.js exec returns [{ columns, values }]
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map((arr) => Object.fromEntries(arr.map((v, i) => [columns[i], v])));
}

function makeCtx(db) {
  // Enable FK constraints
  db.run('PRAGMA foreign_keys = ON;');

  const exec = (sql, params = []) => {
    const trimmed = String(sql).trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH');
    
    if (isSelect) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return Promise.resolve({ rows, rowsAffected: 0, insertId: null });
    }
    
    // Non-SELECT: run and capture rowsAffected and last insert id
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    const rowsAffected = db.getRowsModified();
    let insertId = null;
    
    if (trimmed.startsWith('INSERT')) {
      const res = db.exec('SELECT last_insert_rowid() AS id;');
      const r = rowsFromResult(res);
      insertId = (r && r[0] && r[0].id) || null;
    }
    
    return Promise.resolve({ rows: [], rowsAffected, insertId });
  };

  // Batch and transaction implementations...
  return { execute: exec, batch: doBatch, transaction: doTransaction };
}
```

## Test Structure

### Standard Test Suite Organization
```javascript
describe('createModuleDB', () => {
  let db, ctx, moduleDB;
  
  beforeAll(async () => {
    // Setup database
  });
  
  beforeEach(async () => {
    // Reset state for each test
  });
  
  afterAll(() => {
    // Cleanup
  });

  describe('core CRUD operations', () => {
    // Basic create, read, update, delete tests
  });

  describe('validation and error handling', () => {
    // Error cases and validation
  });

  describe('business logic', () => {
    // Complex operations and rules
  });
});
```

### Test Categories

1. **Core CRUD Operations**
   - `create()` - Valid data, required fields, returned structure
   - `getById()` - Existing and non-existing records
   - `getAll()` - Pagination, ordering, filtering
   - `update()` - Valid updates, partial updates, non-existing records
   - `delete()` - Existing and non-existing records

2. **Validation and Error Handling**
   - Missing required fields
   - Invalid data types
   - Database constraint violations
   - `DatabaseError` throwing and error codes

3. **Business Logic**
   - Complex queries and filtering
   - Relationship management
   - Auto-computed fields
   - Transaction integrity

## Conventions

### Test Data
- Use descriptive, realistic test data
- Include edge cases (empty strings, null values, boundary conditions)
- Use consistent naming patterns for test entities

### Assertions
- Always verify return structure and data types
- Check database state changes when applicable
- Validate error messages and error types
- Test both positive and negative cases

### Database Schema
- All in-memory tests run migrations to ensure proper schema
- Enable foreign key constraints: `PRAGMA foreign_keys = ON;`
- Use consistent table creation patterns across tests

### Performance
- Keep tests focused and fast
- Use `beforeEach` for test isolation
- Clean up resources in `afterAll`

## Helper Modules Testing

When testing modules with helper modules (e.g., `contactsInfo.js`, `eventsRecurring.js`):
- Import and test both main and helper modules
- Test integration between main module and helpers
- Verify helper-specific functionality separately
- Ensure helper methods are accessible through main module API

## Migration Testing

- Tests should verify that modules work with current schema
- Use migration system to set up test databases
- Test backwards compatibility when schema changes
- Validate that indexes and constraints work as expected

## Error Handling Patterns

```javascript
// Standard error testing pattern
test('throws DatabaseError for missing required fields', async () => {
  await expect(moduleDB.create({}))
    .rejects
    .toThrow(DatabaseError);
});

// Specific error code testing
test('throws VALIDATION_ERROR for invalid data', async () => {
  try {
    await moduleDB.create({ invalid: 'data' });
    fail('Expected DatabaseError');
  } catch (error) {
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.code).toBe('VALIDATION_ERROR');
  }
});
```

## Current Test Coverage

✅ **COMPLETE - All database modules have comprehensive test coverage:**

- `categories.test.js` - In-memory SQLite with categoriesRelations helper (✅ Complete)
- `contacts.test.js` - In-memory SQLite with contactsInfo helper (✅ Complete)  
- `events.test.js` - In-memory SQLite with eventsRecurring and eventsReminders helpers (✅ Complete)
- `interactions.test.js` - In-memory SQLite with interactionsStats and interactionsSearch helpers (✅ Complete)
- `companies.test.js` - In-memory SQLite testing (✅ Complete)
- `attachments.test.js` - In-memory SQLite with universal attachment system (✅ Complete)
- `notes.test.js` - In-memory SQLite with note management (✅ Complete)
- `settings.test.js` - In-memory SQLite with settingsHelpers (✅ Complete)

**Total: 9 test suites covering all database functionality**

## Test Statistics

All tests use in-memory SQLite for maximum reliability and consistency with production environment. Each test suite includes:
- Core CRUD operations testing
- Validation and error handling 
- Business logic verification
- Database constraint testing
- Helper module integration testing

## Dependencies

- **Jest**: Test framework and assertions
- **sql.js**: In-memory SQLite database for integration tests
- **babel-jest**: ES6+ transpilation support

## Running Tests

```bash
npm test        # Run all tests
npm test -- --watch  # Run tests in watch mode
```

Tests run in Node.js environment with Jest configuration, using sql.js for SQLite compatibility without native dependencies.