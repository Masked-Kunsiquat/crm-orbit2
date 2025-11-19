// Saved Searches database module
// Manage saved filter combinations for quick access

import { DatabaseError } from './errors';
import { is, hasValue } from '../utils/validators';
import { safeTrim } from '../utils/stringHelpers';
import { pick, buildUpdateSet, buildInsert } from './sqlHelpers';
import { logger } from '../errors/utils/errorLogger';

const SAVED_SEARCH_FIELDS = ['name', 'entity_type', 'filters'];

const VALID_ENTITY_TYPES = ['contacts', 'interactions', 'events'];

/**
 * Create saved searches DB API
 * @param {{ execute: Function, batch: Function }} ctx
 */
export function createSavedSearchesDB(ctx) {
  const { execute, batch } = ctx || {};
  if (!is.function(execute) || !is.function(batch)) {
    throw new DatabaseError(
      'savedSearchesDB requires execute and batch helpers',
      'MODULE_INIT_ERROR'
    );
  }

  return {
    /**
     * Create a new saved search
     * @param {Object} data - Search data
     * @param {string} data.name - Search name
     * @param {string} data.entity_type - Entity type (contacts, interactions, events)
     * @param {Object} data.filters - Filter object (will be stringified)
     * @returns {Promise<Object>} Created saved search
     */
    async create(data) {
      if (!hasValue(data?.name)) {
        throw new DatabaseError('name is required', 'VALIDATION_ERROR');
      }

      if (!hasValue(data?.entity_type)) {
        throw new DatabaseError('entity_type is required', 'VALIDATION_ERROR');
      }

      if (!VALID_ENTITY_TYPES.includes(data.entity_type)) {
        throw new DatabaseError(
          `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      if (!data?.filters || typeof data.filters !== 'object') {
        throw new DatabaseError(
          'filters must be an object',
          'VALIDATION_ERROR'
        );
      }

      const searchData = pick(data, SAVED_SEARCH_FIELDS);
      searchData.name = safeTrim(searchData.name);

      // Stringify filters for storage
      searchData.filters = JSON.stringify(data.filters);

      const { sql, values } = buildInsert('saved_searches', searchData);
      const insertRes = await execute(`${sql};`, values);
      const id = insertRes.insertId;

      if (!id) {
        throw new DatabaseError(
          'Failed to create saved search',
          'INSERT_FAILED'
        );
      }

      logger.success('SavedSearchesDB', 'create', {
        id,
        name: searchData.name,
      });
      return this.getById(id);
    },

    /**
     * Get saved search by ID
     * @param {number} id - Search ID
     * @returns {Promise<Object|null>} Saved search with parsed filters
     */
    async getById(id) {
      const res = await execute('SELECT * FROM saved_searches WHERE id = ?;', [
        id,
      ]);
      const search = res.rows[0] || null;

      if (search) {
        // Parse filters JSON
        try {
          search.filters = JSON.parse(search.filters);
        } catch (error) {
          logger.error('SavedSearchesDB', 'getById', error, { id });
          search.filters = {};
        }
      }

      return search;
    },

    /**
     * Get all saved searches for an entity type
     * @param {string} entityType - Entity type (contacts, interactions, events)
     * @returns {Promise<Object[]>} Array of saved searches
     */
    async getByEntityType(entityType) {
      if (!VALID_ENTITY_TYPES.includes(entityType)) {
        throw new DatabaseError(
          `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      const res = await execute(
        'SELECT * FROM saved_searches WHERE entity_type = ? ORDER BY name ASC;',
        [entityType]
      );

      return res.rows.map(search => {
        try {
          search.filters = JSON.parse(search.filters);
        } catch (error) {
          logger.error('SavedSearchesDB', 'getByEntityType', error, {
            id: search.id,
          });
          search.filters = {};
        }
        return search;
      });
    },

    /**
     * Get all saved searches
     * @returns {Promise<Object[]>} Array of all saved searches
     */
    async getAll() {
      const res = await execute(
        'SELECT * FROM saved_searches ORDER BY entity_type ASC, name ASC;'
      );

      return res.rows.map(search => {
        try {
          search.filters = JSON.parse(search.filters);
        } catch (error) {
          logger.error('SavedSearchesDB', 'getAll', error, { id: search.id });
          search.filters = {};
        }
        return search;
      });
    },

    /**
     * Update saved search
     * @param {number} id - Search ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated saved search
     */
    async update(id, data) {
      if (!data || Object.keys(data).length === 0) {
        return this.getById(id);
      }

      const updateData = pick(data, SAVED_SEARCH_FIELDS);

      if (updateData.name !== undefined) {
        updateData.name = safeTrim(updateData.name);
        if (!hasValue(updateData.name)) {
          throw new DatabaseError('name cannot be empty', 'VALIDATION_ERROR');
        }
      }

      if (updateData.entity_type !== undefined) {
        if (!VALID_ENTITY_TYPES.includes(updateData.entity_type)) {
          throw new DatabaseError(
            `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
            'VALIDATION_ERROR'
          );
        }
      }

      if (updateData.filters !== undefined) {
        if (typeof updateData.filters !== 'object') {
          throw new DatabaseError(
            'filters must be an object',
            'VALIDATION_ERROR'
          );
        }
        updateData.filters = JSON.stringify(updateData.filters);
      }

      if (Object.keys(updateData).length === 0) {
        return this.getById(id);
      }

      const { setClause, values } = buildUpdateSet(updateData);
      await execute(
        `UPDATE saved_searches SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [...values, id]
      );

      logger.success('SavedSearchesDB', 'update', { id });
      return this.getById(id);
    },

    /**
     * Delete saved search
     * @param {number} id - Search ID
     * @returns {Promise<number>} Rows affected
     */
    async delete(id) {
      const res = await execute('DELETE FROM saved_searches WHERE id = ?;', [
        id,
      ]);
      logger.success('SavedSearchesDB', 'delete', { id });
      return res.rowsAffected || 0;
    },

    /**
     * Search saved searches by name
     * @param {string} query - Search query
     * @param {string} entityType - Optional entity type filter
     * @returns {Promise<Object[]>} Matching saved searches
     */
    async search(query, entityType = null) {
      const term = safeTrim(query);
      if (!term) return [];

      const searchTerm = `%${term.toLowerCase()}%`;
      let sql = 'SELECT * FROM saved_searches WHERE LOWER(name) LIKE ?';
      const params = [searchTerm];

      if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
        sql += ' AND entity_type = ?';
        params.push(entityType);
      }

      sql += ' ORDER BY name ASC;';

      const res = await execute(sql, params);
      return res.rows.map(search => {
        try {
          search.filters = JSON.parse(search.filters);
        } catch (error) {
          logger.error('SavedSearchesDB', 'search', error, { id: search.id });
          search.filters = {};
        }
        return search;
      });
    },
  };
}

export default createSavedSearchesDB;
