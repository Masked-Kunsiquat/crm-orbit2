// Contacts API routes with Swagger documentation
import express from 'express';
import { getSimpleDatabase } from '../../database/simpleInit.js';

const router = express.Router();

/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Get all contacts
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of contacts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of contacts to skip
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering contacts
 *     responses:
 *       200:
 *         description: List of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 total:
 *                   type: integer
 *                   description: Total number of contacts
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    const db = getSimpleDatabase();

    let query = 'SELECT * FROM contacts';
    let params = [];

    if (search) {
      query += ' WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ' ORDER BY first_name, last_name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.transaction(tx => {
      tx.executeSql(query, params, (_, result) => {
        const contacts = [];
        for (let i = 0; i < result.rows.length; i++) {
          contacts.push(result.rows.item(i));
        }

        // Get total count
        const countQuery = search
          ? 'SELECT COUNT(*) as total FROM contacts WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?'
          : 'SELECT COUNT(*) as total FROM contacts';
        const countParams = search ? [searchTerm, searchTerm, searchTerm] : [];

        tx.executeSql(countQuery, countParams, (_, countResult) => {
          const total = countResult.rows.item(0).total;
          res.json({
            contacts,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch contacts',
      code: 'FETCH_CONTACTS_ERROR',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /contacts/{id}:
 *   get:
 *     summary: Get contact by ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSimpleDatabase();

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM contacts WHERE id = ?',
        [parseInt(id)],
        (_, result) => {
          if (result.rows.length === 0) {
            return res.status(404).json({
              error: 'Contact not found',
              code: 'CONTACT_NOT_FOUND'
            });
          }
          res.json(result.rows.item(0));
        }
      );
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch contact',
      code: 'FETCH_CONTACT_ERROR',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /contacts:
 *   post:
 *     summary: Create a new contact
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactInput'
 *     responses:
 *       201:
 *         description: Contact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name?.trim()) {
      return res.status(400).json({
        error: 'First name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const db = getSimpleDatabase();

    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO contacts (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
        [first_name.trim(), last_name?.trim() || null, email?.trim() || null, phone?.trim() || null],
        (_, result) => {
          const insertId = result.insertId;

          // Fetch the created contact
          tx.executeSql(
            'SELECT * FROM contacts WHERE id = ?',
            [insertId],
            (_, selectResult) => {
              res.status(201).json(selectResult.rows.item(0));
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create contact',
      code: 'CREATE_CONTACT_ERROR',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /contacts/{id}:
 *   put:
 *     summary: Update contact by ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactInput'
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name?.trim()) {
      return res.status(400).json({
        error: 'First name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const db = getSimpleDatabase();

    db.transaction(tx => {
      // Check if contact exists
      tx.executeSql(
        'SELECT id FROM contacts WHERE id = ?',
        [parseInt(id)],
        (_, selectResult) => {
          if (selectResult.rows.length === 0) {
            return res.status(404).json({
              error: 'Contact not found',
              code: 'CONTACT_NOT_FOUND'
            });
          }

          // Update contact
          tx.executeSql(
            'UPDATE contacts SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
            [first_name.trim(), last_name?.trim() || null, email?.trim() || null, phone?.trim() || null, parseInt(id)],
            (_, updateResult) => {
              // Fetch updated contact
              tx.executeSql(
                'SELECT * FROM contacts WHERE id = ?',
                [parseInt(id)],
                (_, fetchResult) => {
                  res.json(fetchResult.rows.item(0));
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update contact',
      code: 'UPDATE_CONTACT_ERROR',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /contacts/{id}:
 *   delete:
 *     summary: Delete contact by ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact ID
 *     responses:
 *       204:
 *         description: Contact deleted successfully
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSimpleDatabase();

    db.transaction(tx => {
      // Check if contact exists
      tx.executeSql(
        'SELECT id FROM contacts WHERE id = ?',
        [parseInt(id)],
        (_, selectResult) => {
          if (selectResult.rows.length === 0) {
            return res.status(404).json({
              error: 'Contact not found',
              code: 'CONTACT_NOT_FOUND'
            });
          }

          // Delete contact
          tx.executeSql(
            'DELETE FROM contacts WHERE id = ?',
            [parseInt(id)],
            (_, deleteResult) => {
              res.status(204).send();
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete contact',
      code: 'DELETE_CONTACT_ERROR',
      details: error.message
    });
  }
});

export default router;