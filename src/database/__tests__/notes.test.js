// notes.test.js
// Comprehensive unit tests for notesDB using an in-memory SQLite database.
// Uses sql.js (pure WASM) to avoid native builds.
import initSqlJs from 'sql.js';
import path from 'path';
import { createNotesDB } from '../notes';
import { DatabaseError } from '../errors';

function rowsFromResult(result) {
  // sql.js exec returns [{ columns, values }]
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map((arr) => Object.fromEntries(arr.map((v, i) => [columns[i], v])));
}

function makeCtx(db) {
  // Enable FK constraints
  db.run('PRAGMA foreign_keys = ON;');

  const exec = (sql, params = []) => {
    const trimmed = String(sql).trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH');
    if (isSelect) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return Promise.resolve({ rows, rowsAffected: 0, insertId: null });
    }
    // Non-SELECT: run and capture rowsAffected and last insert id
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    const rowsAffected = db.getRowsModified();
    let insertId = null;
    if (trimmed.startsWith('INSERT')) {
      const res = db.exec('SELECT last_insert_rowid() AS id;');
      const r = rowsFromResult(res);
      insertId = (r && r[0] && r[0].id) || null;
    }
    return Promise.resolve({ rows: [], rowsAffected, insertId });
  };

  const doBatch = async (statements) => {
    const results = [];
    db.run('BEGIN;');
    try {
      for (const { sql, params = [] } of statements) {
        // Reuse exec for consistent behavior
        // eslint-disable-next-line no-await-in-loop
        const r = await exec(sql, params);
        results.push(r);
      }
      db.run('COMMIT;');
      return results;
    } catch (e) {
      try { db.run('ROLLBACK;'); } catch (_) {}
      throw e;
    }
  };

  const tx = async (work) => {
    // Simple transaction wrapper sufficient for these tests
    let result;
    const wrapped = {
      execute: (sql, params = []) => exec(sql, params),
    };
    db.prepare('BEGIN').run();
    try {
      result = await work(wrapped);
      db.prepare('COMMIT').run();
    } catch (e) {
      try { db.prepare('ROLLBACK').run(); } catch (_) {}
      throw e;
    }
    return result;
  };

  return { execute: exec, batch: doBatch, transaction: tx };
}

function createSchema(db) {
  const run = (sql) => db.run(sql);
  
  // Contacts table for foreign key relationship testing
  run(`CREATE TABLE contacts (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  // Notes table
  run(`CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    title TEXT,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`);

  // Indexes for better query performance
  run(`CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);`);
  run(`CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(title, content);`);
}

describe('createNotesDB', () => {
  let SQL;
  let db;
  let ctx;
  let notesDB;

  beforeAll(async () => {
    SQL = await initSqlJs({
      locateFile: (file) => {
        // Resolve WASM shipped with sql.js
        const resolved = require.resolve('sql.js/dist/sql-wasm.wasm');
        return path.join(path.dirname(resolved), file);
      },
    });
  });

  beforeEach(() => {
    db = new SQL.Database();
    createSchema(db);
    ctx = makeCtx(db);
    notesDB = createNotesDB(ctx);
  });

  afterAll(() => {
    if (SQL) SQL.close?.();
  });

  afterEach(() => {
    try { db.close(); } catch (_) {}
  });

  describe('core CRUD operations', () => {
    test('create() - creates note with required content', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is test content',
        is_pinned: false
      };
      
      const result = await notesDB.create(noteData);
      expect(result.id).toBeGreaterThan(0);
      
      const created = await notesDB.getById(result.id);
      expect(created.title).toBe('Test Note');
      expect(created.content).toBe('This is test content');
      expect(created.is_pinned).toBe(0);
      expect(created.contact_id).toBeNull();
    });

    test('create() - creates note with contact association', async () => {
      // First create a contact
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['John']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      const noteData = {
        contact_id: contactId,
        title: 'Contact Note',
        content: 'Note about John',
        is_pinned: true
      };
      
      const result = await notesDB.create(noteData);
      const created = await notesDB.getById(result.id);
      
      expect(created.contact_id).toBe(contactId);
      expect(created.title).toBe('Contact Note');
      expect(created.is_pinned).toBe(1);
    });

    test('create() - throws error when content is missing', async () => {
      await expect(notesDB.create({ title: 'No content' }))
        .rejects
        .toThrow(DatabaseError);
      
      await expect(notesDB.create({ title: 'No content' }))
        .rejects
        .toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('getById() - returns note by id', async () => {
      const { id } = await notesDB.create({
        title: 'Find Me',
        content: 'Test content'
      });
      
      const found = await notesDB.getById(id);
      expect(found.id).toBe(id);
      expect(found.title).toBe('Find Me');
      expect(found.content).toBe('Test content');
    });

    test('getById() - returns null for non-existent id', async () => {
      const result = await notesDB.getById(99999);
      expect(result).toBeNull();
    });

    test('getAll() - returns all notes with default ordering', async () => {
      await notesDB.create({ title: 'First', content: 'Content 1' });
      await notesDB.create({ title: 'Second', content: 'Content 2' });
      await notesDB.create({ title: 'Third', content: 'Content 3', is_pinned: true });
      
      const all = await notesDB.getAll();
      expect(all).toHaveLength(3);
      // Should be ordered by pinned first, then created_at DESC
      expect(all[0].title).toBe('Third'); // Pinned note first
      expect(all[0].is_pinned).toBe(1);
      expect(all[1].title).toBe('Second');
      expect(all[2].title).toBe('First');
    });

    test('getAll() - supports pagination and ordering options', async () => {
      await notesDB.create({ title: 'A Note', content: 'Content A' });
      await notesDB.create({ title: 'B Note', content: 'Content B' });
      await notesDB.create({ title: 'C Note', content: 'Content C' });
      
      const page1 = await notesDB.getAll({ 
        limit: 2, 
        offset: 0, 
        orderBy: 'title',
        orderDir: 'ASC'
      });
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('A Note');
      expect(page1[1].title).toBe('B Note');
      
      const page2 = await notesDB.getAll({ 
        limit: 2, 
        offset: 2,
        orderBy: 'title',
        orderDir: 'ASC'
      });
      expect(page2).toHaveLength(1);
      expect(page2[0].title).toBe('C Note');
    });

    test('update() - updates note fields', async () => {
      const { id } = await notesDB.create({
        title: 'Original',
        content: 'Original content'
      });
      
      const updated = await notesDB.update(id, {
        title: 'Updated',
        content: 'Updated content',
        is_pinned: true
      });
      
      expect(updated.title).toBe('Updated');
      expect(updated.content).toBe('Updated content');
      expect(updated.is_pinned).toBe(1);
      expect(updated.updated_at).toBeTruthy();
    });

    test('update() - returns unchanged record when no data provided', async () => {
      const { id } = await notesDB.create({
        title: 'Unchanged',
        content: 'Unchanged content'
      });
      
      const result = await notesDB.update(id, {});
      expect(result.title).toBe('Unchanged');
      expect(result.content).toBe('Unchanged content');
    });

    test('delete() - removes note by id', async () => {
      const { id } = await notesDB.create({
        title: 'To Delete',
        content: 'Will be deleted'
      });
      
      const deletedCount = await notesDB.delete(id);
      expect(deletedCount).toBe(1);
      
      const found = await notesDB.getById(id);
      expect(found).toBeNull();
    });

    test('delete() - returns 0 for non-existent id', async () => {
      const deletedCount = await notesDB.delete(99999);
      expect(deletedCount).toBe(0);
    });
  });

  describe('entity-specific operations', () => {
    test('getByContact() - returns notes for specific contact', async () => {
      // Create contact
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['Alice']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      // Create notes
      await notesDB.create({ 
        contact_id: contactId, 
        title: 'Contact Note 1', 
        content: 'Content 1' 
      });
      await notesDB.create({ 
        contact_id: contactId, 
        title: 'Contact Note 2', 
        content: 'Content 2',
        is_pinned: true
      });
      await notesDB.create({ 
        title: 'General Note', 
        content: 'Not for contact' 
      });
      
      const contactNotes = await notesDB.getByContact(contactId);
      expect(contactNotes).toHaveLength(2);
      expect(contactNotes[0].title).toBe('Contact Note 2'); // Pinned first
      expect(contactNotes[1].title).toBe('Contact Note 1');
      contactNotes.forEach(note => {
        expect(note.contact_id).toBe(contactId);
      });
    });

    test('getGeneralNotes() - returns notes with null contact_id', async () => {
      // Create contact
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['Bob']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      await notesDB.create({ 
        contact_id: contactId, 
        title: 'Contact Note', 
        content: 'For contact' 
      });
      await notesDB.create({ 
        title: 'General Note 1', 
        content: 'General content 1' 
      });
      await notesDB.create({ 
        title: 'General Note 2', 
        content: 'General content 2',
        is_pinned: true
      });
      
      const generalNotes = await notesDB.getGeneralNotes();
      expect(generalNotes).toHaveLength(2);
      expect(generalNotes[0].title).toBe('General Note 2'); // Pinned first
      expect(generalNotes[1].title).toBe('General Note 1');
      generalNotes.forEach(note => {
        expect(note.contact_id).toBeNull();
      });
    });

    test('getPinned() - returns only pinned notes', async () => {
      await notesDB.create({ title: 'Regular 1', content: 'Content 1' });
      await notesDB.create({ title: 'Pinned 1', content: 'Content 2', is_pinned: true });
      await notesDB.create({ title: 'Regular 2', content: 'Content 3' });
      await notesDB.create({ title: 'Pinned 2', content: 'Content 4', is_pinned: true });
      
      const pinnedNotes = await notesDB.getPinned();
      expect(pinnedNotes).toHaveLength(2);
      pinnedNotes.forEach(note => {
        expect(note.is_pinned).toBe(1);
      });
    });

    test('getPinned() - supports contact filtering', async () => {
      // Create contact
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['Charlie']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      await notesDB.create({ 
        title: 'General Pinned', 
        content: 'General', 
        is_pinned: true 
      });
      await notesDB.create({ 
        contact_id: contactId,
        title: 'Contact Pinned', 
        content: 'For contact', 
        is_pinned: true 
      });
      
      const contactPinned = await notesDB.getPinned({ contactId });
      expect(contactPinned).toHaveLength(1);
      expect(contactPinned[0].title).toBe('Contact Pinned');
      
      const generalPinned = await notesDB.getPinned({ contactId: null });
      expect(generalPinned).toHaveLength(1);
      expect(generalPinned[0].title).toBe('General Pinned');
    });

    test('search() - finds notes by title and content', async () => {
      await notesDB.create({ 
        title: 'JavaScript Tutorial', 
        content: 'Learn React components' 
      });
      await notesDB.create({ 
        title: 'Python Guide', 
        content: 'Django framework tutorial' 
      });
      await notesDB.create({ 
        title: 'Meeting Notes', 
        content: 'Discussed JavaScript performance' 
      });
      
      const jsResults = await notesDB.search('JavaScript');
      expect(jsResults).toHaveLength(2);
      expect(jsResults[0].title).toBe('JavaScript Tutorial'); // Title match first
      expect(jsResults[1].title).toBe('Meeting Notes');
      
      const tutorialResults = await notesDB.search('tutorial');
      expect(tutorialResults).toHaveLength(2);
    });

    test('search() - returns empty array for empty query', async () => {
      await notesDB.create({ title: 'Test', content: 'Content' });
      
      const results = await notesDB.search('');
      expect(results).toEqual([]);
      
      const nullResults = await notesDB.search(null);
      expect(nullResults).toEqual([]);
    });

    test('search() - supports contact filtering', async () => {
      // Create contact
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['David']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      await notesDB.create({ 
        title: 'General Important', 
        content: 'Important general note' 
      });
      await notesDB.create({ 
        contact_id: contactId,
        title: 'Contact Important', 
        content: 'Important contact note' 
      });
      
      const contactResults = await notesDB.search('Important', { contactId });
      expect(contactResults).toHaveLength(1);
      expect(contactResults[0].title).toBe('Contact Important');
      
      const generalResults = await notesDB.search('Important', { contactId: null });
      expect(generalResults).toHaveLength(1);
      expect(generalResults[0].title).toBe('General Important');
    });

    test('togglePin() - toggles pin status', async () => {
      const { id } = await notesDB.create({
        title: 'Toggle Test',
        content: 'Test content',
        is_pinned: false
      });
      
      // Toggle to pinned
      const pinned = await notesDB.togglePin(id);
      expect(pinned.is_pinned).toBe(1);
      
      // Toggle back to unpinned
      const unpinned = await notesDB.togglePin(id);
      expect(unpinned.is_pinned).toBe(0);
    });

    test('bulkDelete() - deletes multiple notes', async () => {
      const note1 = await notesDB.create({ title: 'Delete 1', content: 'Content 1' });
      const note2 = await notesDB.create({ title: 'Delete 2', content: 'Content 2' });
      const note3 = await notesDB.create({ title: 'Keep', content: 'Content 3' });
      
      const deletedCount = await notesDB.bulkDelete([note1.id, note2.id]);
      expect(deletedCount).toBe(2);
      
      const remaining = await notesDB.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Keep');
    });

    test('bulkDelete() - handles empty array', async () => {
      const deletedCount = await notesDB.bulkDelete([]);
      expect(deletedCount).toBe(0);
    });

    test('bulkDelete() - handles non-existent ids', async () => {
      const deletedCount = await notesDB.bulkDelete([99999, 88888]);
      expect(deletedCount).toBe(0);
    });
  });

  describe('validation and error handling', () => {
    test('throws DatabaseError for missing content', async () => {
      await expect(notesDB.create({ title: 'No content' }))
        .rejects
        .toBeInstanceOf(DatabaseError);
    });

    test('handles foreign key constraint violations', async () => {
      // Try to create note with non-existent contact_id
      await expect(notesDB.create({
        contact_id: 99999,
        title: 'Invalid Contact',
        content: 'Should fail'
      })).rejects.toThrow();
    });

    test('module initialization requires execute and batch helpers', () => {
      expect(() => createNotesDB()).toThrow(DatabaseError);
      expect(() => createNotesDB({})).toThrow(DatabaseError);
      expect(() => createNotesDB({ execute: () => {} })).toThrow(DatabaseError);
    });
  });

  describe('business logic', () => {
    test('cascading delete when contact is removed', async () => {
      // Create contact and notes
      await ctx.execute('INSERT INTO contacts (first_name) VALUES (?)', ['ToDelete']);
      const contactResult = await ctx.execute('SELECT last_insert_rowid() as id');
      const contactId = contactResult.rows[0].id;
      
      await notesDB.create({
        contact_id: contactId,
        title: 'Will be deleted',
        content: 'Content'
      });
      
      // Delete the contact
      await ctx.execute('DELETE FROM contacts WHERE id = ?', [contactId]);
      
      // Verify note was cascaded
      const remainingNotes = await notesDB.getAll();
      expect(remainingNotes).toHaveLength(0);
    });

    test('pinned notes appear first in all listings', async () => {
      await notesDB.create({ title: 'Regular 1', content: 'Content', is_pinned: false });
      await notesDB.create({ title: 'Pinned', content: 'Content', is_pinned: true });
      await notesDB.create({ title: 'Regular 2', content: 'Content', is_pinned: false });
      
      const allNotes = await notesDB.getAll();
      expect(allNotes[0].title).toBe('Pinned');
      expect(allNotes[0].is_pinned).toBe(1);
    });
  });
});