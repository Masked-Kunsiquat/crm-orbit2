// Categories Relations database module
// Focused on contact-category relationship operations

import { DatabaseError, logger } from '../errors';

/**
 * Create the categories relations database module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @param {Function} deps.batch - Batch SQL function
 * @param {Function} deps.transaction - Transaction function
 * @returns {Object} Categories relations database API
 */
export function createCategoriesRelationsDB({ execute, batch, transaction }) {
  return {
    /**
     * Create a contact-category relationship.
     * Duplicate pairs are ignored.
     * @param {number} contactId
     * @param {number} categoryId
     * @returns {Promise<boolean>} True if a new link was created, false if it already existed
     */
    async addContactToCategory(contactId, categoryId) {
      try {
        const res = await execute(
          'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
          [contactId, categoryId]
        );
        const success = res && res.rowsAffected ? res.rowsAffected > 0 : false;
        if (success) {
          logger.success('CategoriesRelationsDB', 'addContactToCategory', { contactId, categoryId });
        }
        return success;
      } catch (error) {
        const msg = String(
          error?.originalError?.message ??
            error?.cause?.message ??
            error?.message ??
            ''
        );
        if (msg.includes('FOREIGN KEY constraint failed')) {
          logger.error('CategoriesRelationsDB', 'addContactToCategory', error, { constraint: 'FOREIGN_KEY' });
          throw new DatabaseError(
            'Contact or category not found',
            'NOT_FOUND',
            error
          );
        }
        if (msg.includes('UNIQUE constraint failed')) {
          logger.warn('CategoriesRelationsDB', 'Relationship already exists', { contactId, categoryId });
          return false; // Relationship already exists
        }
        logger.error('CategoriesRelationsDB', 'addContactToCategory', error);
        throw error;
      }
    },

    /**
     * Alias for addContactToCategory for compatibility.
     * Create a contact-category relationship.
     * @param {number} contactId
     * @param {number} categoryId
     * @returns {Promise<boolean>} True if a new link was created, false if it already existed
     */
    async addToCategory(contactId, categoryId) {
      return this.addContactToCategory(contactId, categoryId);
    },

    /**
     * Remove a contact-category relationship.
     * @param {number} contactId
     * @param {number} categoryId
     * @returns {Promise<number>} Number of rows removed (0 or 1)
     */
    async removeContactFromCategory(contactId, categoryId) {
      const res = await execute(
        'DELETE FROM contact_categories WHERE contact_id = ? AND category_id = ?;',
        [contactId, categoryId]
      );
      return res.rowsAffected || 0;
    },

    /**
     * Get contacts that belong to a given category.
     * @param {number} categoryId
     * @returns {Promise<object[]>}
     */
    async getContactsByCategory(categoryId) {
      const res = await execute(
        `SELECT c.*
         FROM contacts c
         INNER JOIN contact_categories cc ON cc.contact_id = c.id
         WHERE cc.category_id = ?
         ORDER BY c.last_name ASC, c.first_name ASC;`,
        [categoryId]
      );
      return res.rows;
    },

    /**
     * Get categories that a given contact belongs to.
     * @param {number} contactId
     * @returns {Promise<object[]>}
     */
    async getCategoriesForContact(contactId) {
      const res = await execute(
        `SELECT cat.*
         FROM categories cat
         INNER JOIN contact_categories cc ON cc.category_id = cat.id
         WHERE cc.contact_id = ?
         ORDER BY cat.sort_order ASC, cat.name ASC;`,
        [contactId]
      );
      return res.rows;
    },

    /**
     * Fetch categories for many contacts in a single query.
     * Returns rows joined with contact_id.
     * @param {number[]} contactIds
     * @returns {Promise<Array<{contact_id:number} & any>>}
     */
    async getCategoriesForContacts(contactIds) {
      if (!Array.isArray(contactIds) || contactIds.length === 0) return [];
      const unique = [...new Set(contactIds)];
      const res = await execute(
        `SELECT cc.contact_id, cat.*
         FROM categories cat
         INNER JOIN contact_categories cc ON cc.category_id = cat.id
         WHERE cc.contact_id IN (${unique.map(() => '?').join(', ')})
         ORDER BY cc.contact_id ASC, cat.sort_order ASC, cat.name ASC;`,
        unique
      );
      return res.rows;
    },

    /**
     * Alias for getCategoriesForContact for compatibility.
     * Get categories that a given contact belongs to.
     * @param {number} contactId
     * @returns {Promise<object[]>}
     */
    async getCategoriesByContactId(contactId) {
      return this.getCategoriesForContact(contactId);
    },

    /**
     * Batch update contact categories for a single contact.
     * Replaces all existing category relationships for the contact.
     * @param {number} contactId
     * @param {number[]} categoryIds
     * @returns {Promise<boolean>} True on success
     */
    async setContactCategories(contactId, categoryIds, txOverride) {
      if (!Array.isArray(categoryIds)) {
        throw new DatabaseError(
          'categoryIds must be an array',
          'VALIDATION_ERROR'
        );
      }

      if (txOverride && txOverride.execute) {
        // Inside an existing transaction
        await txOverride.execute(
          'DELETE FROM contact_categories WHERE contact_id = ?;',
          [contactId]
        );
        const uniqueCategoryIds = [...new Set(categoryIds)];
        for (const categoryId of uniqueCategoryIds) {
          await txOverride.execute(
            'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
            [contactId, categoryId]
          );
        }
        return true;
      }

      if (!transaction) {
        throw new DatabaseError(
          'Transaction support required for setContactCategories',
          'TRANSACTION_REQUIRED'
        );
      }

      return await transaction(async tx => {
        // Remove all existing relationships for this contact
        const deletePromise = tx.execute(
          'DELETE FROM contact_categories WHERE contact_id = ?;',
          [contactId]
        );

        // Deduplicate categoryIds to prevent primary key conflicts
        const uniqueCategoryIds = [...new Set(categoryIds)];

        // Add new relationships
        const insertPromises = [];
        for (const categoryId of uniqueCategoryIds) {
          insertPromises.push(
            tx.execute(
              'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
              [contactId, categoryId]
            )
          );
        }

        await Promise.all([deletePromise, ...insertPromises]);
        return true;
      });
    },

    /**
     * Remove contact from all categories.
     * @param {number} contactId
     * @returns {Promise<number>} Number of relationships removed
     */
    async removeContactFromAllCategories(contactId) {
      const res = await execute(
        'DELETE FROM contact_categories WHERE contact_id = ?;',
        [contactId]
      );
      return res.rowsAffected || 0;
    },

    /**
     * Get contact count for each category.
     * @returns {Promise<Array<{id: number, name: string, contact_count: number}>>}
     */
    async getCategoryContactCounts() {
      const res = await execute(
        `SELECT cat.id, cat.name, COUNT(cc.contact_id) as contact_count
         FROM categories cat
         LEFT JOIN contact_categories cc ON cc.category_id = cat.id
         GROUP BY cat.id, cat.name
         ORDER BY cat.sort_order ASC, cat.name ASC;`
      );
      return res.rows;
    },
  };
}

export default createCategoriesRelationsDB;
