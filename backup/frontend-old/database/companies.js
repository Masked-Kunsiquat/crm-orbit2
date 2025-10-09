// Companies database module
// Follows the API pattern defined in src/database/AGENTS.md

import { DatabaseError } from './errors';

const COMPANY_FIELDS = [
  'name',
  'industry',
  'website',
  'address',
  'notes',
  'logo_attachment_id',
];

function pick(obj, fields) {
  const out = {};
  for (const key of fields) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      out[key] = obj[key];
    }
  }
  return out;
}

function placeholders(n) {
  return new Array(n).fill('?').join(', ');
}

/**
 * Create a companies DB API bound to provided DB helpers.
 * @param {{ execute: Function, batch: Function, transaction?: Function }} ctx
 */
export function createCompaniesDB(ctx) {
  const { execute, batch, transaction } = ctx || {};
  if (typeof execute !== 'function' || typeof batch !== 'function') {
    throw new DatabaseError(
      'companiesDB requires execute and batch helpers',
      'MODULE_INIT_ERROR'
    );
  }

  return {
    // Core CRUD
    async create(data) {
      if (!data || !data.name) {
        throw new DatabaseError('name is required', 'VALIDATION_ERROR');
      }

      const companyData = pick(data, COMPANY_FIELDS);
      const cols = Object.keys(companyData);
      const vals = cols.map(k => companyData[k]);

      const insertRes = await execute(
        `INSERT INTO companies (${cols.join(', ')}) VALUES (${placeholders(cols.length)});`,
        vals
      );

      const id = insertRes.insertId;
      if (!id) {
        throw new DatabaseError('Failed to create company', 'INSERT_FAILED');
      }

      return { id };
    },

    async getById(id) {
      const res = await execute('SELECT * FROM companies WHERE id = ?;', [id]);
      return res.rows[0] || null;
    },

    async getAll(options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'name',
        orderDir = 'ASC',
        industry = undefined,
      } = options;

      const where = [];
      const params = [];

      if (industry !== undefined) {
        where.push('industry = ?');
        params.push(industry);
      }

      const order = ['name', 'industry', 'created_at'].includes(orderBy)
        ? orderBy
        : 'name';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM companies ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY ${order} ${dir}
                   LIMIT ? OFFSET ?;`;

      const res = await execute(sql, [...params, limit, offset]);
      return res.rows;
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }

      const companyData = pick(data, COMPANY_FIELDS);
      if (Object.keys(companyData).length === 0) {
        return existing;
      }

      const sets = Object.keys(companyData).map(k => `${k} = ?`);
      const vals = Object.keys(companyData).map(k => companyData[k]);

      await execute(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?;`, [
        ...vals,
        id,
      ]);

      return this.getById(id);
    },

    async delete(id) {
      const res = await execute('DELETE FROM companies WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    // Search & Filter
    async search(query) {
      const term = String(query || '').trim();
      if (!term) return [];

      const q = `%${term}%`;
      const res = await execute(
        `SELECT * FROM companies 
         WHERE name LIKE ? OR industry LIKE ? OR address LIKE ? OR notes LIKE ?
         ORDER BY name ASC;`,
        [q, q, q, q]
      );
      return res.rows;
    },

    // Relations
    async getWithContacts(id) {
      const [companyRes, contactsRes] = await Promise.all([
        execute('SELECT * FROM companies WHERE id = ?;', [id]),
        execute(
          `SELECT * FROM contacts 
           WHERE company_id = ? 
           ORDER BY last_name ASC, first_name ASC;`,
          [id]
        ),
      ]);

      const company = companyRes.rows[0] || null;
      if (!company) return null;

      return { ...company, contacts: contactsRes.rows };
    },

    // Company-specific features
    async updateLogo(id, attachmentId) {
      const res = await execute(
        'UPDATE companies SET logo_attachment_id = ? WHERE id = ?;',
        [attachmentId, id]
      );

      if (res.rowsAffected === 0) {
        throw new DatabaseError('Company not found', 'NOT_FOUND');
      }

      return this.getById(id);
    },

    async mergeCompanies(keepId, mergeId) {
      if (!keepId || !mergeId || keepId === mergeId) {
        throw new DatabaseError(
          'Invalid company IDs for merge',
          'VALIDATION_ERROR'
        );
      }

      // Use transaction for atomic merge operation
      if (!transaction) {
        throw new DatabaseError(
          'Transaction support required for merge operation',
          'TRANSACTION_REQUIRED'
        );
      }

      return await transaction(async tx => {
        // Verify both companies exist
        const [keepRes, mergeRes] = await Promise.all([
          tx.execute('SELECT * FROM companies WHERE id = ?;', [keepId]),
          tx.execute('SELECT * FROM companies WHERE id = ?;', [mergeId]),
        ]);

        const keepCompany = keepRes.rows[0];
        const mergeCompany = mergeRes.rows[0];

        if (!keepCompany) {
          throw new DatabaseError('Company to keep not found', 'NOT_FOUND');
        }
        if (!mergeCompany) {
          throw new DatabaseError('Company to merge not found', 'NOT_FOUND');
        }

        // Update all contacts to point to the company we're keeping
        const updateContactsRes = await tx.execute(
          'UPDATE contacts SET company_id = ? WHERE company_id = ?;',
          [keepId, mergeId]
        );

        // Merge company data - prefer non-null values from merge company
        const mergedData = {};
        for (const field of ['industry', 'website', 'address', 'notes']) {
          if (mergeCompany[field] && !keepCompany[field]) {
            mergedData[field] = mergeCompany[field];
          }
        }

        // Handle logo preference - keep existing if present, otherwise use merge company's logo
        if (
          mergeCompany.logo_attachment_id &&
          !keepCompany.logo_attachment_id
        ) {
          mergedData.logo_attachment_id = mergeCompany.logo_attachment_id;
        }

        // Update the company we're keeping with merged data
        if (Object.keys(mergedData).length > 0) {
          const sets = Object.keys(mergedData).map(k => `${k} = ?`);
          const vals = Object.keys(mergedData).map(k => mergedData[k]);
          await tx.execute(
            `UPDATE companies SET ${sets.join(', ')} WHERE id = ?;`,
            [...vals, keepId]
          );
        }

        // Delete the company being merged
        await tx.execute('DELETE FROM companies WHERE id = ?;', [mergeId]);

        return {
          mergedCompanyId: keepId,
          contactsUpdated: updateContactsRes.rowsAffected || 0,
          deletedCompanyId: mergeId,
        };
      });
    },
  };
}

export default createCompaniesDB;
