// Interactions search module
// Focused on search and filtering operations for interactions

import { DatabaseError } from './errors';
import { parseLocalDate, addDays, getCurrentISO } from '../utils/dateUtils';
import { safeTrim } from '../utils/stringHelpers';
import { is } from '../utils/validators';

const MAX_PAGE_SIZE = 500;

function clampLimit(n, max = MAX_PAGE_SIZE) {
  const num = Number(n) || 0;
  if (num < 1) return 1;
  return Math.min(num, max);
}

function clampOffset(n) {
  const num = Number(n) || 0;
  return num < 0 ? 0 : num;
}

function isDateOnlyString(s) {
  return is.string(s) && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeDateRange(startDate, endDate) {
  let start = startDate;
  let end = endDate;
  let endOp = '<='; // default inclusive end

  // Handle YYYY-MM-DD strings as local dates, not UTC
  if (start && isDateOnlyString(start)) {
    const localDate = parseLocalDate(start);
    start = localDate ? localDate.toISOString() : new Date(start).toISOString();
  }
  if (end && isDateOnlyString(end)) {
    const localDate = parseLocalDate(end);
    if (localDate) {
      // Add 1 day to make the end date exclusive (covers the entire end day)
      const nextDay = addDays(localDate, 1);
      if (nextDay) {
        end = nextDay.toISOString();
        endOp = '<';
      } else {
        // Fallback if addDays fails
        const d = new Date(localDate);
        d.setDate(d.getDate() + 1);
        end = d.toISOString();
        endOp = '<';
      }
    } else {
      // Fallback for invalid dates
      const d = new Date(end);
      d.setDate(d.getDate() + 1);
      end = d.toISOString();
      endOp = '<';
    }
  }

  return { start, end, endOp };
}

/**
 * Create the interactions search module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @returns {Object} Interactions search API
 */
export function createInteractionsSearchDB({ execute }) {
  return {
    async getRecent(options = {}) {
      const { limit = 20, days = 7 } = options;
      const cutoffDate = addDays(new Date(), -days) || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cutoff = cutoffDate.toISOString();

      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   WHERE i.interaction_datetime >= ? 
                   ORDER BY i.interaction_datetime DESC 
                   LIMIT ?;`;
      const res = await execute(sql, [cutoff, clampLimit(limit)]);
      return res.rows;
    },

    async getByType(interactionType, options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'interaction_datetime',
        orderDir = 'DESC',
      } = options;
      const order = [
        'interaction_datetime',
        'title',
        'interaction_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'interaction_datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const sql = `SELECT * FROM interactions
                   WHERE interaction_type = ? OR (custom_type IS NOT NULL AND custom_type = ?)
                   ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [
        interactionType,
        interactionType,
        clampLimit(limit),
        clampOffset(offset),
      ]);
      return res.rows;
    },

    async getByDateRange(startDate, endDate, options = {}) {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'interaction_datetime',
        orderDir = 'DESC',
      } = options;
      const order = [
        'interaction_datetime',
        'title',
        'interaction_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'interaction_datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const { start, end, endOp } = normalizeDateRange(startDate, endDate);
      const conds = [];
      const params = [];
      if (start) {
        conds.push('interaction_datetime >= ?');
        params.push(start);
      }
      if (end) {
        conds.push(`interaction_datetime ${endOp} ?`);
        params.push(end);
      }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT * FROM interactions ${where} ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      params.push(clampLimit(limit), clampOffset(offset));
      const res = await execute(sql, params);
      return res.rows;
    },

    async searchInteractions(query, options = {}) {
      const { limit = 50, offset = 0 } = options;
      const term = safeTrim(query);
      if (!term || term.length < 2) return [];

      const searchTerm = `%${term}%`;
      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   WHERE i.title LIKE ? OR i.note LIKE ? OR c.display_name LIKE ?
                   ORDER BY i.interaction_datetime DESC 
                   LIMIT ? OFFSET ?;`;

      const res = await execute(sql, [
        searchTerm,
        searchTerm,
        searchTerm,
        clampLimit(limit),
        clampOffset(offset),
      ]);
      return res.rows;
    },

    async getByContact(contactId, options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'interaction_datetime',
        orderDir = 'DESC',
      } = options;
      const order = [
        'interaction_datetime',
        'title',
        'interaction_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'interaction_datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const sql = `SELECT * FROM interactions WHERE contact_id = ? ORDER BY ${order} ${dir} LIMIT ? OFFSET ?;`;
      const res = await execute(sql, [
        contactId,
        clampLimit(limit),
        clampOffset(offset),
      ]);
      return res.rows;
    },

    async advancedSearch(criteria = {}, options = {}) {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'interaction_datetime',
        orderDir = 'DESC',
      } = options;
      const order = [
        'interaction_datetime',
        'title',
        'interaction_type',
        'created_at',
      ].includes(orderBy)
        ? orderBy
        : 'interaction_datetime';
      const dir = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const conditions = [];
      const params = [];

      if (
        criteria.contactIds &&
        is.array(criteria.contactIds) &&
        criteria.contactIds.length > 0
      ) {
        const placeholders = criteria.contactIds.map(() => '?').join(', ');
        conditions.push(`contact_id IN (${placeholders})`);
        params.push(...criteria.contactIds);
      }

      if (
        criteria.interactionTypes &&
        is.array(criteria.interactionTypes) &&
        criteria.interactionTypes.length > 0
      ) {
        const placeholders = criteria.interactionTypes
          .map(() => '?')
          .join(', ');
        // Check both built-in and custom interaction types using COALESCE
        conditions.push(
          `COALESCE(interaction_type, custom_type) IN (${placeholders})`
        );
        params.push(...criteria.interactionTypes);
      }

      if (criteria.title) {
        conditions.push('title LIKE ?');
        params.push(`%${criteria.title}%`);
      }

      if (criteria.note) {
        conditions.push('note LIKE ?');
        params.push(`%${criteria.note}%`);
      }

      if (criteria.startDate || criteria.endDate) {
        const { start, end, endOp } = normalizeDateRange(
          criteria.startDate,
          criteria.endDate
        );
        if (start) {
          conditions.push('interaction_datetime >= ?');
          params.push(start);
        }
        if (end) {
          conditions.push(`interaction_datetime ${endOp} ?`);
          params.push(end);
        }
      }

      if (criteria.minDuration) {
        conditions.push('duration >= ?');
        params.push(criteria.minDuration);
      }

      if (criteria.maxDuration) {
        conditions.push('duration <= ?');
        params.push(criteria.maxDuration);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `SELECT i.*, c.first_name, c.last_name, c.display_name 
                   FROM interactions i 
                   JOIN contacts c ON i.contact_id = c.id 
                   ${whereClause}
                   ORDER BY i.${order} ${dir} 
                   LIMIT ? OFFSET ?;`;

      params.push(clampLimit(limit), clampOffset(offset));
      const res = await execute(sql, params);
      return res.rows;
    },
  };
}

export default createInteractionsSearchDB;
