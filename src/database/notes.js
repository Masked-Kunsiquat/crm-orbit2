// Notes database module
// Manages notes and general notes functionality

import { DatabaseError } from './errors';

const NOTE_FIELDS = ['contact_id', 'title', 'content', 'is_pinned'];

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

function convertBooleanFields(row) {
  if (!row) return row;
  const out = { ...row };
  if ('is_pinned' in out) {
    const v = out.is_pinned;
    out.is_pinned = v === true || v === 1 || v === '1';
  }
  return out;
}

/**
 * Create a notes DB API bound to provided DB helpers.
 * @param {{ execute: Function, batch: Function, transaction?: Function }} ctx
 */
export function createNotesDB(ctx) {
  const { execute, batch, transaction } = ctx || {};
  if (typeof execute !== 'function' || typeof batch !== 'function') {
    throw new DatabaseError(
      'notesDB requires execute and batch helpers',
      'MODULE_INIT_ERROR'
    );
  }

  return {
    // Core CRUD
    async create(data) {
      if (!data || !data.content) {
        throw new DatabaseError('content is required', 'VALIDATION_ERROR');
      }

      const noteData = pick(data, NOTE_FIELDS);
      // Ensure is_pinned is boolean
      if ('is_pinned' in noteData) {
        noteData.is_pinned = noteData.is_pinned ? 1 : 0;
      }

      const cols = Object.keys(noteData);
      const vals = cols.map(k => noteData[k]);

      try {
        const insertRes = await execute(
          `INSERT INTO notes (${cols.join(', ')}) VALUES (${placeholders(cols.length)});`,
          vals
        );
        const id = insertRes.insertId;
        if (!id) {
          throw new DatabaseError('Failed to create note', 'INSERT_FAILED');
        }

        return this.getById(id);
      } catch (error) {
        // Handle foreign key constraint errors - check message and nested error properties
        const errorMessage =
          error.message || error.cause?.message || error.originalError?.message;
        if (
          errorMessage &&
          errorMessage.includes('FOREIGN KEY constraint failed')
        ) {
          throw new DatabaseError('Contact not found', 'NOT_FOUND', error);
        }
        // Re-throw other errors as-is
        throw error;
      }
    },

    async getById(id) {
      const res = await execute('SELECT * FROM notes WHERE id = ?;', [id]);
      return convertBooleanFields(res.rows[0]) || null;
    },

    async getAll(options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'created_at',
        orderDir = 'DESC',
        contactId = undefined,
        pinned = undefined,
      } = options;

      const where = [];
      const params = [];

      if (contactId !== undefined) {
        if (contactId === null) {
          where.push('contact_id IS NULL');
        } else {
          where.push('contact_id = ?');
          params.push(contactId);
        }
      }

      if (pinned === true) {
        where.push('is_pinned = 1');
      } else if (pinned === false) {
        where.push('is_pinned = 0');
      }

      const order = ['title', 'content', 'created_at', 'updated_at'].includes(
        orderBy
      )
        ? orderBy
        : 'created_at';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const sql = `SELECT * FROM notes ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY is_pinned DESC, ${order} ${dir}
                   LIMIT ? OFFSET ?;`;

      const res = await execute(sql, [...params, limit, offset]);
      return res.rows.map(convertBooleanFields);
    },

    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      const noteData = pick(data, NOTE_FIELDS);
      // Ensure is_pinned is boolean
      if ('is_pinned' in noteData) {
        noteData.is_pinned = noteData.is_pinned ? 1 : 0;
      }

      if (Object.keys(noteData).length === 0) {
        return this.getById(id);
      }

      const sets = Object.keys(noteData).map(k => `${k} = ?`);
      const vals = Object.keys(noteData).map(k => noteData[k]);

      await execute(
        `UPDATE notes SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...vals, id]
      );

      const updated = await this.getById(id);
      return updated;
    },

    async delete(id) {
      const res = await execute('DELETE FROM notes WHERE id = ?;', [id]);
      return res.rowsAffected || 0;
    },

    // Entity-specific methods
    async getByContact(contactId) {
      const res = await execute(
        `SELECT * FROM notes 
         WHERE contact_id = ? 
         ORDER BY is_pinned DESC, created_at DESC;`,
        [contactId]
      );
      return res.rows.map(convertBooleanFields);
    },

    async getGeneralNotes(options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'created_at',
        orderDir = 'DESC',
      } = options;

      const order = ['title', 'content', 'created_at', 'updated_at'].includes(
        orderBy
      )
        ? orderBy
        : 'created_at';
      const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const res = await execute(
        `SELECT * FROM notes 
         WHERE contact_id IS NULL 
         ORDER BY is_pinned DESC, ${order} ${dir}
         LIMIT ? OFFSET ?;`,
        [limit, offset]
      );
      return res.rows.map(convertBooleanFields);
    },

    async getPinned(options = {}) {
      const { limit = 100, offset = 0, contactId = undefined } = options;

      const where = ['is_pinned = 1'];
      const params = [];

      if (contactId !== undefined) {
        if (contactId === null) {
          where.push('contact_id IS NULL');
        } else {
          where.push('contact_id = ?');
          params.push(contactId);
        }
      }

      const res = await execute(
        `SELECT * FROM notes 
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?;`,
        [...params, limit, offset]
      );
      return res.rows.map(convertBooleanFields);
    },

    async search(query, options = {}) {
      const term = String(query || '').trim();
      if (!term) return [];

      const { limit = 100, offset = 0, contactId = undefined } = options;

      const q = `%${term}%`;
      const where = ['(title LIKE ? OR content LIKE ?)'];
      const params = [q, q];

      if (contactId !== undefined) {
        if (contactId === null) {
          where.push('contact_id IS NULL');
        } else {
          where.push('contact_id = ?');
          params.push(contactId);
        }
      }

      const res = await execute(
        `SELECT * FROM notes
         WHERE ${where.join(' AND ')}
         ORDER BY is_pinned DESC, 
                  CASE WHEN title LIKE ? THEN 1 ELSE 2 END,
                  created_at DESC
         LIMIT ? OFFSET ?;`,
        [...params, q, limit, offset]
      );
      return res.rows.map(convertBooleanFields);
    },

    async togglePin(id) {
      await execute(
        'UPDATE notes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [id]
      );

      const updated = await this.getById(id);
      return updated;
    },

    async bulkDelete(ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return 0;
      }

      const placeholderList = ids.map(() => '?').join(', ');
      const res = await execute(
        `DELETE FROM notes WHERE id IN (${placeholderList});`,
        ids
      );

      return res.rowsAffected || 0;
    },
  };
}

export default createNotesDB;
