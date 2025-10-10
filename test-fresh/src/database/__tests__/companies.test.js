// Unit tests for companies database module

import { createCompaniesDB } from '../companies';
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

  const transaction = jest.fn().mockImplementation(work => {
    const mockTx = {
      execute: jest.fn().mockImplementation(() => {
        if (transactionResults.length > 0) {
          return Promise.resolve(transactionResults.shift());
        }
        return Promise.resolve({ rows: [], rowsAffected: 0, insertId: null });
      }),
    };
    return work(mockTx);
  });

  return {
    execute,
    batch,
    transaction,
    executeResults,
    batchResults,
    transactionResults,
  };
};

describe('createCompaniesDB', () => {
  let mockCtx;
  let companiesDB;

  beforeEach(() => {
    mockCtx = createMockContext();
    companiesDB = createCompaniesDB(mockCtx);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should throw error if execute helper is missing', () => {
      expect(() => createCompaniesDB({ batch: jest.fn() })).toThrow(
        'companiesDB requires execute and batch helpers'
      );
    });

    it('should throw error if batch helper is missing', () => {
      expect(() => createCompaniesDB({ execute: jest.fn() })).toThrow(
        'companiesDB requires execute and batch helpers'
      );
    });

    it('should create API object with all required methods', () => {
      expect(companiesDB).toHaveProperty('create');
      expect(companiesDB).toHaveProperty('getById');
      expect(companiesDB).toHaveProperty('getAll');
      expect(companiesDB).toHaveProperty('update');
      expect(companiesDB).toHaveProperty('delete');
      expect(companiesDB).toHaveProperty('search');
      expect(companiesDB).toHaveProperty('getWithContacts');
      expect(companiesDB).toHaveProperty('updateLogo');
      expect(companiesDB).toHaveProperty('mergeCompanies');
    });
  });

  describe('create', () => {
    it('should create company with required name', async () => {
      mockCtx.executeResults.push({ insertId: 1, rowsAffected: 1 });

      const result = await companiesDB.create({ name: 'Test Company' });

      expect(result).toEqual({ id: 1 });
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'INSERT INTO companies (name) VALUES (?);',
        ['Test Company']
      );
    });

    it('should use all provided company fields', async () => {
      mockCtx.executeResults.push({ insertId: 2, rowsAffected: 1 });

      const companyData = {
        name: 'Tech Corp',
        industry: 'Technology',
        website: 'https://techcorp.com',
        address: '123 Tech St',
        notes: 'Great company',
        logo_attachment_id: 5,
      };

      await companiesDB.create(companyData);

      expect(mockCtx.execute).toHaveBeenCalledWith(
        'INSERT INTO companies (name, industry, website, address, notes, logo_attachment_id) VALUES (?, ?, ?, ?, ?, ?);',
        [
          'Tech Corp',
          'Technology',
          'https://techcorp.com',
          '123 Tech St',
          'Great company',
          5,
        ]
      );
    });

    it('should throw error if name is missing', async () => {
      await expect(companiesDB.create({})).rejects.toThrow('name is required');
    });

    it('should throw error if insert fails', async () => {
      mockCtx.executeResults.push({ insertId: null, rowsAffected: 0 });

      await expect(companiesDB.create({ name: 'Test' })).rejects.toThrow(
        'Failed to create company'
      );
    });
  });

  describe('getById', () => {
    it('should return company when found', async () => {
      const company = { id: 1, name: 'Test Company', industry: 'Tech' };
      mockCtx.executeResults.push({ rows: [company] });

      const result = await companiesDB.getById(1);

      expect(result).toEqual(company);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'SELECT * FROM companies WHERE id = ?;',
        [1]
      );
    });

    it('should return null when not found', async () => {
      mockCtx.executeResults.push({ rows: [] });

      const result = await companiesDB.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all companies with default options', async () => {
      const companies = [
        { id: 1, name: 'Company A', industry: 'Tech' },
        { id: 2, name: 'Company B', industry: 'Finance' },
      ];
      mockCtx.executeResults.push({ rows: companies });

      const result = await companiesDB.getAll();

      expect(result).toEqual(companies);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY name ASC\s+LIMIT \? OFFSET \?/),
        [100, 0]
      );
    });

    it('should filter by industry when specified', async () => {
      mockCtx.executeResults.push({ rows: [] });

      await companiesDB.getAll({ industry: 'Technology' });

      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE industry = \?/),
        ['Technology', 100, 0]
      );
    });

    it('should support custom ordering', async () => {
      mockCtx.executeResults.push({ rows: [] });

      await companiesDB.getAll({ orderBy: 'industry', orderDir: 'DESC' });

      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY industry DESC/),
        [100, 0]
      );
    });

    it('should support pagination', async () => {
      mockCtx.executeResults.push({ rows: [] });

      await companiesDB.getAll({ limit: 50, offset: 25 });

      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringMatching(/LIMIT \? OFFSET \?/),
        [50, 25]
      );
    });
  });

  describe('update', () => {
    it('should update company when data provided', async () => {
      const existing = { id: 1, name: 'Old Name', industry: 'Tech' };
      const updated = { id: 1, name: 'New Name', industry: 'Tech' };

      mockCtx.executeResults.push({ rows: [existing] }); // getById call
      mockCtx.executeResults.push({ rowsAffected: 1 }); // update call
      mockCtx.executeResults.push({ rows: [updated] }); // final getById call

      const result = await companiesDB.update(1, { name: 'New Name' });

      expect(result).toEqual(updated);
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        'UPDATE companies SET name = ? WHERE id = ?;',
        ['New Name', 1]
      );
    });

    it('should update multiple fields', async () => {
      const existing = { id: 1, name: 'Company', industry: 'Tech' };
      mockCtx.executeResults.push({ rows: [existing] }); // getById
      mockCtx.executeResults.push({ rowsAffected: 1 }); // update
      mockCtx.executeResults.push({ rows: [existing] }); // final getById

      await companiesDB.update(1, {
        industry: 'Finance',
        website: 'https://example.com',
      });

      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        'UPDATE companies SET industry = ?, website = ? WHERE id = ?;',
        ['Finance', 'https://example.com', 1]
      );
    });

    it('should return null when company not found', async () => {
      mockCtx.executeResults.push({ rows: [] });

      const result = await companiesDB.update(999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return existing company when no valid updates provided', async () => {
      const existing = { id: 1, name: 'Company', industry: 'Tech' };
      mockCtx.executeResults.push({ rows: [existing] });

      const result = await companiesDB.update(1, {});

      expect(result).toEqual(existing);
      expect(mockCtx.execute).toHaveBeenCalledTimes(1); // Only getById, no update
    });
  });

  describe('delete', () => {
    it('should delete company and return rows affected', async () => {
      mockCtx.executeResults.push({ rowsAffected: 1 });

      const result = await companiesDB.delete(1);

      expect(result).toBe(1);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        'DELETE FROM companies WHERE id = ?;',
        [1]
      );
    });

    it('should return 0 when company not found', async () => {
      mockCtx.executeResults.push({ rowsAffected: 0 });

      const result = await companiesDB.delete(999);

      expect(result).toBe(0);
    });
  });

  describe('search', () => {
    it('should search across company fields', async () => {
      const companies = [
        { id: 1, name: 'Tech Company', industry: 'Technology' },
      ];
      mockCtx.executeResults.push({ rows: companies });

      const result = await companiesDB.search('Tech');

      expect(result).toEqual(companies);
      expect(mockCtx.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE name LIKE ? OR industry LIKE ? OR address LIKE ? OR notes LIKE ?'
        ),
        ['%Tech%', '%Tech%', '%Tech%', '%Tech%']
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await companiesDB.search('');

      expect(result).toEqual([]);
      expect(mockCtx.execute).not.toHaveBeenCalled();
    });
  });

  describe('getWithContacts', () => {
    it('should return company with its contacts', async () => {
      const company = { id: 1, name: 'Tech Corp' };
      const contacts = [
        { id: 1, first_name: 'John', last_name: 'Doe', company_id: 1 },
        { id: 2, first_name: 'Jane', last_name: 'Smith', company_id: 1 },
      ];

      mockCtx.executeResults.push({ rows: [company] }); // company query
      mockCtx.executeResults.push({ rows: contacts }); // contacts query

      const result = await companiesDB.getWithContacts(1);

      expect(result).toEqual({ ...company, contacts });
      expect(mockCtx.execute).toHaveBeenCalledTimes(2);
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM companies WHERE id = ?;',
        [1]
      );
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE company_id = ?'),
        [1]
      );
    });

    it('should return null when company not found', async () => {
      mockCtx.executeResults.push({ rows: [] }); // company not found
      mockCtx.executeResults.push({ rows: [] }); // contacts query still runs

      const result = await companiesDB.getWithContacts(999);

      expect(result).toBeNull();
    });
  });

  describe('updateLogo', () => {
    it('should update company logo attachment', async () => {
      const updated = { id: 1, name: 'Company', logo_attachment_id: 5 };
      mockCtx.executeResults.push({ rowsAffected: 1 }); // update
      mockCtx.executeResults.push({ rows: [updated] }); // getById

      const result = await companiesDB.updateLogo(1, 5);

      expect(result).toEqual(updated);
      expect(mockCtx.execute).toHaveBeenNthCalledWith(
        1,
        'UPDATE companies SET logo_attachment_id = ? WHERE id = ?;',
        [5, 1]
      );
    });

    it('should throw error when company not found', async () => {
      mockCtx.executeResults.push({ rowsAffected: 0 });

      await expect(companiesDB.updateLogo(999, 5)).rejects.toThrow(
        'Company not found'
      );
    });
  });

  describe('mergeCompanies', () => {
    it('should merge two companies successfully', async () => {
      const keepCompany = {
        id: 1,
        name: 'Keep Corp',
        industry: 'Tech',
        logo_attachment_id: null,
      };
      const mergeCompany = {
        id: 2,
        name: 'Merge Corp',
        industry: 'Finance',
        logo_attachment_id: 5,
        website: 'https://merge.com',
      };

      // Transaction results in order
      mockCtx.transactionResults.push({ rows: [keepCompany] }); // keep company check
      mockCtx.transactionResults.push({ rows: [mergeCompany] }); // merge company check
      mockCtx.transactionResults.push({ rowsAffected: 3 }); // update contacts
      mockCtx.transactionResults.push({ rowsAffected: 1 }); // update keep company with merged data
      mockCtx.transactionResults.push({ rowsAffected: 1 }); // delete merge company

      const result = await companiesDB.mergeCompanies(1, 2);

      expect(result).toEqual({
        mergedCompanyId: 1,
        contactsUpdated: 3,
        deletedCompanyId: 2,
      });
      expect(mockCtx.transaction).toHaveBeenCalled();
    });

    it('should throw error for invalid company IDs', async () => {
      await expect(companiesDB.mergeCompanies(1, 1)).rejects.toThrow(
        'Invalid company IDs for merge'
      );

      await expect(companiesDB.mergeCompanies(null, 2)).rejects.toThrow(
        'Invalid company IDs for merge'
      );
    });

    it('should throw error when keep company not found', async () => {
      mockCtx.transactionResults.push({ rows: [] }); // keep company not found
      mockCtx.transactionResults.push({ rows: [{ id: 2 }] }); // merge company exists

      await expect(companiesDB.mergeCompanies(999, 2)).rejects.toThrow(
        'Company to keep not found'
      );
    });

    it('should throw error when merge company not found', async () => {
      mockCtx.transactionResults.push({ rows: [{ id: 1 }] }); // keep company exists
      mockCtx.transactionResults.push({ rows: [] }); // merge company not found

      await expect(companiesDB.mergeCompanies(1, 999)).rejects.toThrow(
        'Company to merge not found'
      );
    });

    it('should throw error when transaction support is missing', async () => {
      const noTransactionCtx = createMockContext();
      delete noTransactionCtx.transaction;
      const noTransactionDB = createCompaniesDB(noTransactionCtx);

      await expect(noTransactionDB.mergeCompanies(1, 2)).rejects.toThrow(
        'Transaction support required for merge operation'
      );
    });
  });
});
