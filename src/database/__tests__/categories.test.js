// Unit tests for categories database module

import { createCategoriesDB } from '../categories';
import { DatabaseError } from '../errors';

// Mock database helpers
const createMockContext = () => {
  const executeResults = [];
  const batchResults = [];
  const transactionResults = [];

  const execute = jest.fn().mockImplementation(() => {
    if (executeResults.length > 0) {
      return Promise.resolve(executeResults.shift());
    }
    return Promise.resolve({ rows: [], rowsAffected: 0, insertId: null });
  });

  const batch = jest.fn().mockImplementation(() => {
    if (batchResults.length > 0) {
      return Promise.resolve(batchResults.shift());
    }
    return Promise.resolve([]);
  });

  const transaction = jest.fn().mockImplementation((work) => {
    const mockTx = {
      execute: jest.fn().mockImplementation(() => {
        if (transactionResults.length > 0) {
          return Promise.resolve(transactionResults.shift());
        }
        return Promise.resolve({ rows: [], rowsAffected: 0, insertId: null });
      })
    };
    return work(mockTx);
  });

  return {
    execute,
    batch,
    transaction,
    executeResults,
    batchResults,
    transactionResults
  };
};

describe('createCategoriesDB', () => {
  let mockCtx;
  let categoriesDB;

  beforeEach(() => {
    mockCtx = createMockContext();
    categoriesDB = createCategoriesDB(mockCtx);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(categoriesDB).toHaveProperty('addContactToCategory');
      expect(categoriesDB).toHaveProperty('removeContactFromCategory');
      expect(categoriesDB).toHaveProperty('getContactsByCategory');
      expect(categoriesDB).toHaveProperty('getCategoriesForContact');
      expect(categoriesDB).toHaveProperty('updateSortOrder');
    });
  });

  describe('create', () => {
    it('should create category with required name', async () => {
      mockCtx.executeResults.push({ insertId: 1, rowsAffected: 1 });

      const result = await categoriesDB.create({ name: 'Test Category' });

      expect(result).toEqual({ id: 1 });
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'INSERT INTO categories (name, color, icon, is_system, sort_order) VALUES (?, ?, ?, ?, ?);',
        ['Test Category', '#007AFF', 'folder', false, 0]
      );
    });

    it('should use custom values when provided', async () => {
      mockCtx.executeResults.push({ insertId: 2, rowsAffected: 1 });

      const categoryData = {
        name: 'Custom Category',
        color: '#FF0000',
        icon: 'star',
        is_system: true,
        sort_order: 10
      };

      await categoriesDB.create(categoryData);

      expect(mockCtx.execute).toHaveBeenCalledWith(
        'INSERT INTO categories (name, color, icon, is_system, sort_order) VALUES (?, ?, ?, ?, ?);',
        ['Custom Category', '#FF0000', 'star', true, 10]
      );
    });

    it('should throw error if name is missing', async () => {
      await expect(categoriesDB.create({}))
        .rejects.toThrow('name is required');
    });

    it('should throw error if insert fails', async () => {
      mockCtx.executeResults.push({ insertId: null, rowsAffected: 0 });

      await expect(categoriesDB.create({ name: 'Test' }))
        .rejects.toThrow('Failed to create category');
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      const category = { id: 1, name: 'Test Category', color: '#007AFF' };
      mockCtx.executeResults.push({ rows: [category] });

      const result = await categoriesDB.getById(1);

      expect(result).toEqual(category);
      expect(mockCtx.execute).toHaveBeenCalledWith('SELECT * FROM categories WHERE id = ?;', [1]);
    });

    it('should return null when not found', async () => {
      mockCtx.executeResults.push({ rows: [] });

      const result = await categoriesDB.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all categories with default options', async () => {
      const categories = [
        { id: 1, name: 'Category 1', sort_order: 1 },
        { id: 2, name: 'Category 2', sort_order: 2 }
      ];
      mockCtx.executeResults.push({ rows: categories });

      const result = await categoriesDB.getAll();

      expect(result).toEqual(categories);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY sort_order ASC, name ASC\s+LIMIT \? OFFSET \?/),
        [100, 0]
      );
    });

    it('should exclude system categories when requested', async () => {
      mockCtx.executeResults.push({ rows: [] });

      await categoriesDB.getAll({ includeSystem: false });

      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE is_system = 0/),
        [100, 0]
      );
    });

    it('should support custom ordering', async () => {
      mockCtx.executeResults.push({ rows: [] });

      await categoriesDB.getAll({ orderBy: 'name', orderDir: 'DESC' });

      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY name DESC, name ASC/),
        [100, 0]
      );
    });
  });

  describe('update', () => {
    it('should update category when data provided', async () => {
      const existing = { id: 1, name: 'Old Name', is_system: false };
      const updated = { id: 1, name: 'New Name', is_system: false };
      
      mockCtx.executeResults.push({ rows: [existing] }); // getById call
      mockCtx.executeResults.push({ rowsAffected: 1 }); // update call
      mockCtx.executeResults.push({ rows: [updated] }); // final getById call

      const result = await categoriesDB.update(1, { name: 'New Name' });

      expect(result).toEqual(updated);
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        'UPDATE categories SET name = ? WHERE id = ?;',
        ['New Name', 1]
      );
    });

    it('should prevent updating system category name', async () => {
      const systemCategory = { id: 1, name: 'System Category', is_system: true };
      mockCtx.executeResults.push({ rows: [systemCategory] });

      await expect(categoriesDB.update(1, { name: 'New Name' }))
        .rejects.toThrow('Cannot modify system category name');
    });

    it('should allow updating other properties of system categories', async () => {
      const systemCategory = { id: 1, name: 'System Category', is_system: true };
      mockCtx.executeResults.push({ rows: [systemCategory] }); // getById
      mockCtx.executeResults.push({ rowsAffected: 1 }); // update
      mockCtx.executeResults.push({ rows: [systemCategory] }); // final getById

      await categoriesDB.update(1, { color: '#FF0000' });

      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        'UPDATE categories SET color = ? WHERE id = ?;',
        ['#FF0000', 1]
      );
    });

    it('should return null when category not found', async () => {
      mockCtx.executeResults.push({ rows: [] });

      const result = await categoriesDB.update(999, { name: 'Test' });

      expect(result).toBeNull();
    });
    it('should return existing category when update data is empty', async () => {
      const existing = { id: 1, name: 'Keep', is_system: false };
      mockCtx.executeResults.push({ rows: [existing] });
      const res = await categoriesDB.update(1, {});
      expect(res).toEqual(existing);
    });

    it('should filter out is_system field from updates', async () => {
      const existing = { id: 1, name: 'Category', is_system: false };
      mockCtx.executeResults.push({ rows: [existing] }); // getById

      const result = await categoriesDB.update(1, { is_system: true });

      expect(result).toEqual(existing);
      expect(mockCtx.execute).toHaveBeenCalledTimes(1); // Only getById, no update
    });
  });

  describe('delete', () => {
    it('should delete user category', async () => {
      const userCategory = { id: 1, name: 'User Category', is_system: false };
      mockCtx.executeResults.push({ rows: [userCategory] }); // getById
      mockCtx.executeResults.push({ rowsAffected: 1 }); // delete

      const result = await categoriesDB.delete(1);

      expect(result).toBe(1);
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM categories WHERE id = ?;',
        [1]
      );
    });

    it('should prevent deletion of system categories', async () => {
      const systemCategory = { id: 1, name: 'System Category', is_system: true };
      mockCtx.executeResults.push({ rows: [systemCategory] });

      await expect(categoriesDB.delete(1))
        .rejects.toThrow('Cannot delete system category');
    });

    it('should return 0 when category not found', async () => {
      mockCtx.executeResults.push({ rows: [] });

      const result = await categoriesDB.delete(999);

      expect(result).toBe(0);
    });
  });

  describe('getSystemCategories', () => {
    it('should return only system categories', async () => {
      const systemCategories = [
        { id: 1, name: 'System 1', is_system: true },
        { id: 2, name: 'System 2', is_system: true }
      ];
      mockCtx.executeResults.push({ rows: systemCategories });

      const result = await categoriesDB.getSystemCategories();

      expect(result).toEqual(systemCategories);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'SELECT * FROM categories WHERE is_system = 1 ORDER BY sort_order ASC, name ASC;'
      );
    });
  });

  describe('getUserCategories', () => {
    it('should return only user categories', async () => {
      const userCategories = [
        { id: 3, name: 'User 1', is_system: false },
        { id: 4, name: 'User 2', is_system: false }
      ];
      mockCtx.executeResults.push({ rows: userCategories });

      const result = await categoriesDB.getUserCategories();

      expect(result).toEqual(userCategories);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'SELECT * FROM categories WHERE is_system = 0 ORDER BY sort_order ASC, name ASC;'
      );
    });
  });

  describe('addContactToCategory', () => {
    it('should add contact to category successfully', async () => {
      mockCtx.executeResults.push({ rowsAffected: 1 });

      const result = await categoriesDB.addContactToCategory(1, 2);

      expect(result).toBe(true);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
        [1, 2]
      );
    });

    it('should handle duplicate relationship gracefully', async () => {
      mockCtx.execute.mockResolvedValueOnce({ rowsAffected: 0 });

      const result = await categoriesDB.addContactToCategory(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('removeContactFromCategory', () => {
    it('should remove contact from category', async () => {
      mockCtx.executeResults.push({ rowsAffected: 1 });

      const result = await categoriesDB.removeContactFromCategory(1, 2);

      expect(result).toBe(1);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'DELETE FROM contact_categories WHERE contact_id = ? AND category_id = ?;',
        [1, 2]
      );
    });

    it('should return 0 when relationship not found', async () => {
      mockCtx.executeResults.push({ rowsAffected: 0 });

      const result = await categoriesDB.removeContactFromCategory(1, 999);

      expect(result).toBe(0);
    });
  });

  describe('getContactsByCategory', () => {
    it('should return contacts for given category', async () => {
      const contacts = [
        { id: 1, first_name: 'John', last_name: 'Doe' },
        { id: 2, first_name: 'Jane', last_name: 'Smith' }
      ];
      mockCtx.executeResults.push({ rows: contacts });

      const result = await categoriesDB.getContactsByCategory(1);

      expect(result).toEqual(contacts);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.*'),
        [1]
      );
    });
  });

  describe('getCategoriesForContact', () => {
    it('should return categories for given contact', async () => {
      const categories = [
        { id: 1, name: 'Category 1', sort_order: 1 },
        { id: 2, name: 'Category 2', sort_order: 2 }
      ];
      mockCtx.executeResults.push({ rows: categories });

      const result = await categoriesDB.getCategoriesForContact(1);

      expect(result).toEqual(categories);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT cat.*'),
        [1]
      );
    });
  });

  describe('updateSortOrder', () => {
    it('should update sort order for multiple categories', async () => {
      const updates = [
        { id: 1, sort_order: 10 },
        { id: 2, sort_order: 20 }
      ];
      mockCtx.batchResults.push([
        { rowsAffected: 1 },
        { rowsAffected: 1 }
      ]);

      const result = await categoriesDB.updateSortOrder(updates);

      expect(result).toBe(true);
      expect(mockCtx.batch).toHaveBeenCalledWith([
        { sql: 'UPDATE categories SET sort_order = ? WHERE id = ?;', params: [10, 1] },
        { sql: 'UPDATE categories SET sort_order = ? WHERE id = ?;', params: [20, 2] }
      ]);
    });

    it('should throw error for invalid updates array', async () => {
      await expect(categoriesDB.updateSortOrder([]))
        .rejects.toThrow('sortOrderUpdates must be a non-empty array');
    });

    it('should throw error for invalid update objects', async () => {
      const updates = [{ id: 1 }]; // missing sort_order

      await expect(categoriesDB.updateSortOrder(updates))
        .rejects.toThrow('Each update must have id and sort_order');
    });
  });
});
