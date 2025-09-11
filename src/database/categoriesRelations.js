// Categories Relations database module
// Focused on contact-category relationship operations

import { DatabaseError } from './errors';

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
      const res = await execute(
        'INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
        [contactId, categoryId]
      );
      return res && res.rowsAffected ? res.rowsAffected > 0 : false;
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
     * Batch update contact categories for a single contact.
     * Replaces all existing category relationships for the contact.
     * @param {number} contactId
     * @param {number[]} categoryIds
     * @returns {Promise<boolean>} True on success
     */
    async setContactCategories(contactId, categoryIds) {
      if (!Array.isArray(categoryIds)) {
        throw new DatabaseError('categoryIds must be an array', 'VALIDATION_ERROR');
      }

      if (!transaction) {
        throw new DatabaseError('Transaction support required for setContactCategories', 'TRANSACTION_REQUIRED');
      }

      return await transaction(async (tx) => {
        // Remove all existing relationships for this contact
        const deletePromise = tx.execute(
          'DELETE FROM contact_categories WHERE contact_id = ?;',
          [contactId]
        );

        // Add new relationships
        const insertPromises = [];
        for (const categoryId of categoryIds) {
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
    }
  };
}

export default createCategoriesRelationsDB;