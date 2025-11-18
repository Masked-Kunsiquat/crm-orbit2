// Global search module
// Provides unified search across all entities (contacts, companies, interactions, events, notes)

import { DatabaseError } from './errors';
import { safeTrim } from '../utils/stringHelpers';
import { is } from '../utils/validators';
import { logger } from '../errors/utils/errorLogger';

const MAX_RESULTS_PER_ENTITY = 10;

/**
 * Create the global search module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @returns {Object} Global search API
 */
export function createGlobalSearchDB({ execute }) {
  if (!is.function(execute)) {
    throw new DatabaseError(
      'globalSearchDB requires execute helper',
      'MODULE_INIT_ERROR'
    );
  }

  return {
    /**
     * Search across all entities
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @param {number} options.limit - Max results per entity (default: 10)
     * @returns {Promise<Object>} Results grouped by entity type
     */
    async search(query, options = {}) {
      try {
        const term = safeTrim(query);
        if (!term || term.length < 2) {
          return {
            contacts: [],
            companies: [],
            interactions: [],
            events: [],
            notes: [],
          };
        }

        const limit = options.limit || MAX_RESULTS_PER_ENTITY;
        const searchTerm = `%${term.toLowerCase()}%`;

        // Execute all searches in parallel for performance
        const [contacts, companies, interactions, events, notes] = await Promise.all([
          this.searchContacts(searchTerm, limit),
          this.searchCompanies(searchTerm, limit),
          this.searchInteractions(searchTerm, limit),
          this.searchEvents(searchTerm, limit),
          this.searchNotes(searchTerm, limit),
        ]);

        logger.success('GlobalSearchDB', 'search', {
          query: term,
          totalResults: contacts.length + companies.length + interactions.length + events.length + notes.length,
        });

        return {
          contacts,
          companies,
          interactions,
          events,
          notes,
        };
      } catch (error) {
        logger.error('GlobalSearchDB', 'search', error, { query });
        throw new DatabaseError('Failed to perform global search', 'QUERY_ERROR', error);
      }
    },

    /**
     * Search contacts by name, email, phone
     * @private
     */
    async searchContacts(searchTerm, limit) {
      try {
        const sql = `
          SELECT
            c.id,
            c.first_name,
            c.last_name,
            c.display_name,
            c.avatar_attachment_id,
            c.company_id,
            c.is_favorite,
            GROUP_CONCAT(DISTINCT CASE WHEN ci.type = 'phone' AND ci.is_primary = 1 THEN ci.value END) AS primary_phone,
            GROUP_CONCAT(DISTINCT CASE WHEN ci.type = 'email' AND ci.is_primary = 1 THEN ci.value END) AS primary_email
          FROM contacts c
          LEFT JOIN contact_info ci ON c.id = ci.contact_id AND ci.is_primary = 1
          WHERE
            LOWER(c.display_name) LIKE ? OR
            LOWER(c.first_name) LIKE ? OR
            LOWER(c.last_name) LIKE ? OR
            EXISTS (SELECT 1 FROM contact_info ci2 WHERE ci2.contact_id = c.id AND LOWER(ci2.value) LIKE ?)
          GROUP BY c.id
          ORDER BY c.is_favorite DESC, c.display_name ASC
          LIMIT ?;
        `;

        const res = await execute(sql, [searchTerm, searchTerm, searchTerm, searchTerm, limit]);
        return res.rows || [];
      } catch (error) {
        logger.error('GlobalSearchDB', 'searchContacts', error, { searchTerm });
        return [];
      }
    },

    /**
     * Search companies by name or industry
     * @private
     */
    async searchCompanies(searchTerm, limit) {
      try {
        const sql = `
          SELECT
            id,
            name,
            industry,
            logo_attachment_id,
            created_at
          FROM companies
          WHERE
            LOWER(name) LIKE ? OR
            LOWER(industry) LIKE ?
          ORDER BY name ASC
          LIMIT ?;
        `;

        const res = await execute(sql, [searchTerm, searchTerm, limit]);
        return res.rows || [];
      } catch (error) {
        logger.error('GlobalSearchDB', 'searchCompanies', error, { searchTerm });
        return [];
      }
    },

    /**
     * Search interactions by title, note, or contact name
     * @private
     */
    async searchInteractions(searchTerm, limit) {
      try {
        const sql = `
          SELECT
            i.id,
            i.contact_id,
            i.title,
            i.note,
            i.interaction_type,
            i.custom_type,
            i.interaction_datetime,
            c.display_name AS contact_name,
            c.avatar_attachment_id AS contact_avatar
          FROM interactions i
          JOIN contacts c ON i.contact_id = c.id
          WHERE
            LOWER(i.title) LIKE ? OR
            LOWER(i.note) LIKE ? OR
            LOWER(c.display_name) LIKE ?
          ORDER BY i.interaction_datetime DESC
          LIMIT ?;
        `;

        const res = await execute(sql, [searchTerm, searchTerm, searchTerm, limit]);
        return res.rows || [];
      } catch (error) {
        logger.error('GlobalSearchDB', 'searchInteractions', error, { searchTerm });
        return [];
      }
    },

    /**
     * Search events by title, notes, or contact name
     * @private
     */
    async searchEvents(searchTerm, limit) {
      try {
        const sql = `
          SELECT
            e.id,
            e.contact_id,
            e.title,
            e.notes,
            e.event_date,
            e.event_type,
            c.display_name AS contact_name,
            c.avatar_uri AS contact_avatar
          FROM events e
          LEFT JOIN contacts c ON e.contact_id = c.id
          WHERE
            LOWER(e.title) LIKE ? OR
            LOWER(e.notes) LIKE ? OR
            LOWER(c.display_name) LIKE ?
          ORDER BY e.event_date DESC
          LIMIT ?;
        `;

        const res = await execute(sql, [searchTerm, searchTerm, searchTerm, limit]);
        return res.rows || [];
      } catch (error) {
        logger.error('GlobalSearchDB', 'searchEvents', error, { searchTerm });
        return [];
      }
    },

    /**
     * Search notes by title and content
     * @private
     */
    async searchNotes(searchTerm, limit) {
      try {
        const sql = `
          SELECT
            n.id,
            n.contact_id,
            n.title,
            n.content,
            n.is_pinned,
            n.created_at,
            c.display_name AS related_name,
            c.avatar_uri AS contact_avatar
          FROM notes n
          LEFT JOIN contacts c ON n.contact_id = c.id
          WHERE
            LOWER(n.title) LIKE ? OR
            LOWER(n.content) LIKE ?
          ORDER BY n.is_pinned DESC, n.created_at DESC
          LIMIT ?;
        `;

        const res = await execute(sql, [searchTerm, searchTerm, limit]);
        return res.rows || [];
      } catch (error) {
        logger.error('GlobalSearchDB', 'searchNotes', error, { searchTerm });
        return [];
      }
    },
  };
}

export default createGlobalSearchDB;
