// categories.test.js
// Comprehensive unit tests for categoriesDB using an in-memory SQLite database.
// Uses sql.js (pure WASM) to avoid native builds.
import initSqlJs from 'sql.js';
import path from 'path';
import { createCategoriesDB } from '../categories';
import { createCategoriesRelationsDB } from '../categoriesRelations';
import { DatabaseError } from '../errors';

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

  const doBatch = async (statements) => {
    const results = [];
    for (const { sql, params } of statements) {
      results.push(await exec(sql, params));
    }
    return results;
  };

  const doTransaction = async (work) => {
    db.exec('BEGIN;');
    try {
      const result = await work({
        execute: exec,
        batch: doBatch
      });
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  };

  return { execute: exec, batch: doBatch, transaction: doTransaction };
}

describe('categoriesDB (in-memory)', () => {
  let SQL, db, ctx, categoriesDB, categoriesRelationsDB;

  beforeAll(async () => {
    SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
    });
  });

  beforeEach(async () => {
    db = new SQL.Database();
    ctx = makeCtx(db);
    categoriesDB = createCategoriesDB(ctx);
    categoriesRelationsDB = createCategoriesRelationsDB(ctx);

    // Create tables
    await ctx.execute(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#007AFF',
      icon TEXT DEFAULT 'folder',
      is_system BOOLEAN DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    await ctx.execute(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    await ctx.execute(`CREATE TABLE IF NOT EXISTS contact_categories (
      contact_id INTEGER,
      category_id INTEGER,
      PRIMARY KEY (contact_id, category_id),
      FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );`);
  });

  afterEach(() => {
    if (db) db.close();
  });

  afterAll(() => {
    if (SQL) SQL = null;
  });

  describe('initialization', () => {
    it('should throw error if execute helper is missing', () => {
      expect(() => createCategoriesDB({ batch: jest.fn() }))
        .toThrow('categoriesDB requires execute and batch helpers');
    });

    it('should throw error if batch helper is missing', () => {
      expect(() => createCategoriesDB({ execute: jest.fn() }))
        .toThrow('categoriesDB requires execute and batch helpers');
    });

    it('should create API object with all required methods', () => {
      expect(categoriesDB).toHaveProperty('create');
      expect(categoriesDB).toHaveProperty('getById');
      expect(categoriesDB).toHaveProperty('getAll');
      expect(categoriesDB).toHaveProperty('update');
      expect(categoriesDB).toHaveProperty('delete');
      expect(categoriesDB).toHaveProperty('getSystemCategories');
      expect(categoriesDB).toHaveProperty('getUserCategories');
      expect(categoriesDB).toHaveProperty('updateSortOrder');
      
      expect(categoriesRelationsDB).toHaveProperty('addContactToCategory');
      expect(categoriesRelationsDB).toHaveProperty('removeContactFromCategory');
      expect(categoriesRelationsDB).toHaveProperty('getContactsByCategory');
      expect(categoriesRelationsDB).toHaveProperty('getCategoriesForContact');
      expect(categoriesRelationsDB).toHaveProperty('setContactCategories');
      expect(categoriesRelationsDB).toHaveProperty('removeContactFromAllCategories');
      expect(categoriesRelationsDB).toHaveProperty('getCategoryContactCounts');
    });
  });

  describe('create', () => {
    it('should create category with required name', async () => {
      const result = await categoriesDB.create({ name: 'Test Category' });

      expect(result).toEqual({ id: 1 });

      // Verify it was actually created
      const created = await categoriesDB.getById(1);
      expect(created.name).toBe('Test Category');
      expect(created.color).toBe('#007AFF');
      expect(created.icon).toBe('folder');
      expect(created.is_system).toBe(0);
      expect(created.sort_order).toBe(0);
    });

    it('should use custom values when provided', async () => {
      const categoryData = {
        name: 'Custom Category',
        color: '#FF0000',
        icon: 'star',
        is_system: true,
        sort_order: 10
      };

      const result = await categoriesDB.create(categoryData);
      expect(result).toEqual({ id: 1 });

      const created = await categoriesDB.getById(1);
      expect(created.name).toBe('Custom Category');
      expect(created.color).toBe('#FF0000');
      expect(created.icon).toBe('star');
      expect(created.is_system).toBe(1);
      expect(created.sort_order).toBe(10);
    });

    it('should throw error if name is missing', async () => {
      await expect(categoriesDB.create({}))
        .rejects.toThrow('name is required');
    });

    it('should throw error for duplicate name', async () => {
      await categoriesDB.create({ name: 'Duplicate Name' });
      
      await expect(categoriesDB.create({ name: 'Duplicate Name' }))
        .rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      await categoriesDB.create({ name: 'Test Category', color: '#FF0000' });
      
      const result = await categoriesDB.getById(1);

      expect(result).toMatchObject({
        id: 1,
        name: 'Test Category',
        color: '#FF0000',
        icon: 'folder',
        is_system: 0,
        sort_order: 0
      });
      expect(result.created_at).toBeDefined();
    });

    it('should return null when not found', async () => {
      const result = await categoriesDB.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(async () => {
      await categoriesDB.create({ name: 'User Category 1', is_system: false, sort_order: 2 });
      await categoriesDB.create({ name: 'System Category', is_system: true, sort_order: 1 });
      await categoriesDB.create({ name: 'User Category 2', is_system: false, sort_order: 3 });
    });

    it('should return all categories with default options', async () => {
      const result = await categoriesDB.getAll();

      expect(result).toHaveLength(3);
      expect(result[0].sort_order).toBe(1); // System Category (sort_order 1)
      expect(result[1].sort_order).toBe(2); // User Category 1 (sort_order 2)
      expect(result[2].sort_order).toBe(3); // User Category 2 (sort_order 3)
    });

    it('should exclude system categories when requested', async () => {
      const result = await categoriesDB.getAll({ includeSystem: false });

      expect(result).toHaveLength(2);
      expect(result.every(cat => cat.is_system === 0)).toBe(true);
    });

    it('should support custom ordering', async () => {
      const result = await categoriesDB.getAll({ orderBy: 'name', orderDir: 'DESC' });

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('User Category 2');
      expect(result[1].name).toBe('User Category 1');
      expect(result[2].name).toBe('System Category');
    });

    it('should support pagination', async () => {
      const result = await categoriesDB.getAll({ limit: 2, offset: 1 });

      expect(result).toHaveLength(2);
      expect(result[0].sort_order).toBe(2);
      expect(result[1].sort_order).toBe(3);
    });
  });

  describe('update', () => {
    it('should update category when data provided', async () => {
      await categoriesDB.create({ name: 'Old Name', is_system: false });

      const result = await categoriesDB.update(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.is_system).toBe(0);
    });

    it('should prevent updating system category name', async () => {
      await categoriesDB.create({ name: 'System Category', is_system: true });

      await expect(categoriesDB.update(1, { name: 'New Name' }))
        .rejects.toThrow('Cannot modify system category name');
    });

    it('should allow updating other properties of system categories', async () => {
      await categoriesDB.create({ name: 'System Category', is_system: true });

      const result = await categoriesDB.update(1, { color: '#FF0000' });

      expect(result.name).toBe('System Category');
      expect(result.color).toBe('#FF0000');
      expect(result.is_system).toBe(1);
    });

    it('should return null when category not found', async () => {
      const result = await categoriesDB.update(999, { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should return existing category when update data is empty', async () => {
      await categoriesDB.create({ name: 'Keep', is_system: false });
      
      const result = await categoriesDB.update(1, {});
      
      expect(result.name).toBe('Keep');
      expect(result.is_system).toBe(0);
    });

    it('should filter out is_system field from updates', async () => {
      await categoriesDB.create({ name: 'Category', is_system: false });

      const result = await categoriesDB.update(1, { is_system: true });

      expect(result.name).toBe('Category');
      expect(result.is_system).toBe(0); // Should remain unchanged
    });
  });

  describe('delete', () => {
    it('should delete user category', async () => {
      await categoriesDB.create({ name: 'User Category', is_system: false });

      const result = await categoriesDB.delete(1);

      expect(result).toBe(1);
      
      // Verify it was deleted
      const deleted = await categoriesDB.getById(1);
      expect(deleted).toBeNull();
    });

    it('should prevent deletion of system categories', async () => {
      await categoriesDB.create({ name: 'System Category', is_system: true });

      await expect(categoriesDB.delete(1))
        .rejects.toThrow('Cannot delete system category');
    });

    it('should return 0 when category not found', async () => {
      const result = await categoriesDB.delete(999);
      expect(result).toBe(0);
    });
  });

  describe('getSystemCategories', () => {
    it('should return only system categories', async () => {
      await categoriesDB.create({ name: 'System 1', is_system: true, sort_order: 2 });
      await categoriesDB.create({ name: 'User 1', is_system: false, sort_order: 1 });
      await categoriesDB.create({ name: 'System 2', is_system: true, sort_order: 3 });

      const result = await categoriesDB.getSystemCategories();

      expect(result).toHaveLength(2);
      expect(result.every(cat => cat.is_system === 1)).toBe(true);
      expect(result[0].name).toBe('System 1');
      expect(result[1].name).toBe('System 2');
    });
  });

  describe('getUserCategories', () => {
    it('should return only user categories', async () => {
      await categoriesDB.create({ name: 'System 1', is_system: true, sort_order: 1 });
      await categoriesDB.create({ name: 'User 1', is_system: false, sort_order: 3 });
      await categoriesDB.create({ name: 'User 2', is_system: false, sort_order: 2 });

      const result = await categoriesDB.getUserCategories();

      expect(result).toHaveLength(2);
      expect(result.every(cat => cat.is_system === 0)).toBe(true);
      expect(result[0].name).toBe('User 2'); // sort_order 2
      expect(result[1].name).toBe('User 1'); // sort_order 3
    });
  });

  describe('updateSortOrder', () => {
    beforeEach(async () => {
      await categoriesDB.create({ name: 'Category 1', sort_order: 1 });
      await categoriesDB.create({ name: 'Category 2', sort_order: 2 });
      await categoriesDB.create({ name: 'Category 3', sort_order: 3 });
    });

    it('should update sort order for multiple categories', async () => {
      const updates = [
        { id: 1, sort_order: 10 },
        { id: 2, sort_order: 20 }
      ];

      const result = await categoriesDB.updateSortOrder(updates);

      expect(result).toBe(true);

      // Verify updates
      const cat1 = await categoriesDB.getById(1);
      const cat2 = await categoriesDB.getById(2);
      const cat3 = await categoriesDB.getById(3);

      expect(cat1.sort_order).toBe(10);
      expect(cat2.sort_order).toBe(20);
      expect(cat3.sort_order).toBe(3); // Unchanged
    });

    it('should throw error for invalid updates array', async () => {
      await expect(categoriesDB.updateSortOrder([]))
        .rejects.toThrow('sortOrderUpdates must be a non-empty array');
    });

    it('should throw error when id is missing', async () => {
      await expect(categoriesDB.updateSortOrder([{ sort_order: 1 }]))
        .rejects.toThrow('Each update must have integer id and sort_order');
    });

    it('should throw error for invalid update objects', async () => {
      const updates = [{ id: 1 }]; // missing sort_order

      await expect(categoriesDB.updateSortOrder(updates))
        .rejects.toThrow('Each update must have integer id and sort_order');
    });
  });

  describe('categories relations', () => {
    let contactId, categoryId1, categoryId2;

    beforeEach(async () => {
      // Create test contact
      await ctx.execute('INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?);',
        ['John', 'Doe', 'John Doe']);
      contactId = 1;

      // Create test categories
      await categoriesDB.create({ name: 'Category 1' });
      await categoriesDB.create({ name: 'Category 2' });
      categoryId1 = 1;
      categoryId2 = 2;
    });

    describe('addContactToCategory', () => {
      it('should add contact to category successfully', async () => {
        const result = await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);

        expect(result).toBe(true);

        // Verify relationship was created
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(1);
        expect(categories[0].id).toBe(categoryId1);
      });

      it('should handle duplicate relationship gracefully', async () => {
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);
        
        const result = await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);

        expect(result).toBe(false);

        // Should still only have one relationship
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(1);
      });
    });

    describe('removeContactFromCategory', () => {
      beforeEach(async () => {
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);
      });

      it('should remove contact from category', async () => {
        const result = await categoriesRelationsDB.removeContactFromCategory(contactId, categoryId1);

        expect(result).toBe(1);

        // Verify relationship was removed
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(0);
      });

      it('should return 0 when relationship not found', async () => {
        const result = await categoriesRelationsDB.removeContactFromCategory(contactId, 999);
        expect(result).toBe(0);
      });
    });

    describe('getContactsByCategory', () => {
      beforeEach(async () => {
        // Create another contact
        await ctx.execute('INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?);',
          ['Jane', 'Smith', 'Jane Smith']);

        // Add contacts to category
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);
        await categoriesRelationsDB.addContactToCategory(2, categoryId1);
      });

      it('should return contacts for given category', async () => {
        const result = await categoriesRelationsDB.getContactsByCategory(categoryId1);

        expect(result).toHaveLength(2);
        expect(result[0].first_name).toBe('John');
        expect(result[1].first_name).toBe('Jane');
      });
    });

    describe('getCategoriesForContact', () => {
      beforeEach(async () => {
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId2);
      });

      it('should return categories for given contact', async () => {
        const result = await categoriesRelationsDB.getCategoriesForContact(contactId);

        expect(result).toHaveLength(2);
        expect(result.map(c => c.name)).toEqual(['Category 1', 'Category 2']);
      });
    });

    describe('setContactCategories', () => {
      it('should replace all contact categories', async () => {
        // Add initial categories
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);

        // Replace with new set
        const result = await categoriesRelationsDB.setContactCategories(contactId, [categoryId2]);

        expect(result).toBe(true);

        // Verify only new category remains
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(1);
        expect(categories[0].id).toBe(categoryId2);
      });

      it('should handle duplicate categoryIds', async () => {
        const result = await categoriesRelationsDB.setContactCategories(contactId, [categoryId1, categoryId1, categoryId2]);

        expect(result).toBe(true);

        // Should only have unique categories
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(2);
        expect(categories.map(c => c.id).sort()).toEqual([categoryId1, categoryId2]);
      });
    });

    describe('removeContactFromAllCategories', () => {
      beforeEach(async () => {
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId1);
        await categoriesRelationsDB.addContactToCategory(contactId, categoryId2);
      });

      it('should remove contact from all categories', async () => {
        const result = await categoriesRelationsDB.removeContactFromAllCategories(contactId);

        expect(result).toBe(2);

        // Verify all relationships removed
        const categories = await categoriesRelationsDB.getCategoriesForContact(contactId);
        expect(categories).toHaveLength(0);
      });
    });

    describe('getCategoryContactCounts', () => {
      beforeEach(async () => {
        // Create more contacts
        await ctx.execute('INSERT INTO contacts (first_name, display_name) VALUES (?, ?);', ['Jane', 'Jane Smith']);
        await ctx.execute('INSERT INTO contacts (first_name, display_name) VALUES (?, ?);', ['Bob', 'Bob Johnson']);

        // Add relationships
        await categoriesRelationsDB.addContactToCategory(1, categoryId1);
        await categoriesRelationsDB.addContactToCategory(2, categoryId1);
        await categoriesRelationsDB.addContactToCategory(3, categoryId2);
      });

      it('should return contact counts for each category', async () => {
        const result = await categoriesRelationsDB.getCategoryContactCounts();

        expect(result).toHaveLength(2);
        
        const cat1Count = result.find(c => c.id === categoryId1);
        const cat2Count = result.find(c => c.id === categoryId2);
        
        expect(cat1Count.contact_count).toBe(2);
        expect(cat2Count.contact_count).toBe(1);
      });
    });
  });
});