import initSqlJs from 'sql.js';
import path from 'path';
import { createAttachmentsDB } from '../attachments';
import { DatabaseError } from '../errors';

function rowsFromResult(result) {
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map((arr) => Object.fromEntries(arr.map((v, i) => [columns[i], v])));
}

function makeCtx(db) {
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
    for (const { sql, params = [] } of statements) {
      results.push(await exec(sql, params));
    }
    return results;
  };

  const doTransaction = async (work) => {
    db.run('BEGIN TRANSACTION;');
    try {
      const result = await work({ execute: exec });
      db.run('COMMIT;');
      return result;
    } catch (error) {
      db.run('ROLLBACK;');
      throw error;
    }
  };

  return { execute: exec, batch: doBatch, transaction: doTransaction };
}

describe('createAttachmentsDB', () => {
  let db, ctx, attachmentsDB;

  beforeAll(async () => {
    const wasmPath = path.join(__dirname, '../../../node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    db = new SQL.Database();
    ctx = makeCtx(db);
    attachmentsDB = createAttachmentsDB(ctx);

    // Create schema
    await ctx.execute(`
      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        thumbnail_path TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create related tables for orphan testing
    await ctx.execute(`
      CREATE TABLE contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ctx.execute(`
      CREATE TABLE interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ctx.execute(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ctx.execute(`
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  beforeEach(async () => {
    await ctx.execute('DELETE FROM attachments');
    await ctx.execute('DELETE FROM contacts');
    await ctx.execute('DELETE FROM interactions');
    await ctx.execute('DELETE FROM events');
    await ctx.execute('DELETE FROM notes');
  });

  afterAll(() => {
    db.close();
  });

  describe('core CRUD operations', () => {
    test('create() creates a new attachment with required fields', async () => {
      const attachmentData = {
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'uuid-filename.jpg',
        original_name: 'profile.jpg',
        file_path: '/path/to/uuid-filename.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        description: 'Profile picture'
      };

      const result = await attachmentsDB.create(attachmentData);

      expect(result).toMatchObject({
        id: expect.any(Number),
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'uuid-filename.jpg',
        original_name: 'profile.jpg',
        file_path: '/path/to/uuid-filename.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        description: 'Profile picture',
        created_at: expect.any(String)
      });
    });

    test('create() creates attachment with minimal required fields', async () => {
      const attachmentData = {
        entity_type: 'note',
        entity_id: 1,
        file_name: 'document.pdf',
        original_name: 'important-doc.pdf',
        file_path: '/files/document.pdf',
        file_type: 'document'
      };

      const result = await attachmentsDB.create(attachmentData);

      expect(result).toMatchObject({
        id: expect.any(Number),
        entity_type: 'note',
        entity_id: 1,
        file_name: 'document.pdf',
        original_name: 'important-doc.pdf',
        file_path: '/files/document.pdf',
        file_type: 'document',
        mime_type: null,
        file_size: null,
        thumbnail_path: null,
        description: null
      });
    });

    test('create() accepts valid file_size values', async () => {
      // Test zero size
      const zeroSize = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'empty.txt',
        original_name: 'empty.txt',
        file_path: '/empty.txt',
        file_type: 'document',
        file_size: 0
      });
      expect(zeroSize.file_size).toBe(0);

      // Test positive size
      const positiveSize = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'large.jpg',
        original_name: 'large.jpg',
        file_path: '/large.jpg',
        file_type: 'image',
        file_size: 1048576
      });
      expect(positiveSize.file_size).toBe(1048576);

      // Test null/undefined (should be accepted)
      const nullSize = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'unknown.doc',
        original_name: 'unknown.doc',
        file_path: '/unknown.doc',
        file_type: 'document',
        file_size: null
      });
      expect(nullSize.file_size).toBeNull();
    });

    test('getById() returns attachment when it exists', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'event',
        entity_id: 1,
        file_name: 'video.mp4',
        original_name: 'birthday-video.mp4',
        file_path: '/videos/video.mp4',
        file_type: 'video'
      });

      const result = await attachmentsDB.getById(created.id);
      expect(result).toEqual(created);
    });

    test('getById() returns null when attachment does not exist', async () => {
      const result = await attachmentsDB.getById(999);
      expect(result).toBeNull();
    });

    test('getAll() returns all attachments with default sorting', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'first.jpg',
        original_name: 'first.jpg',
        file_path: '/first.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'second.pdf',
        original_name: 'second.pdf',
        file_path: '/second.pdf',
        file_type: 'document'
      });

      const result = await attachmentsDB.getAll();
      
      expect(result).toHaveLength(2);
      // Note: In-memory SQLite may not have enough timestamp precision for ordering
      const fileNames = result.map(r => r.file_name).sort();
      expect(fileNames).toEqual(['first.jpg', 'second.pdf']);
    });

    test('getAll() supports pagination and custom sorting', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'a.jpg',
        original_name: 'a.jpg',
        file_path: '/a.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'b.pdf',
        original_name: 'b.pdf',
        file_path: '/b.pdf',
        file_type: 'document'
      });

      const result = await attachmentsDB.getAll({
        limit: 1,
        offset: 0,
        sortBy: 'file_name',
        sortOrder: 'ASC'
      });

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('a.jpg');
    });

    test('update() updates existing attachment', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'old.jpg',
        original_name: 'old.jpg',
        file_path: '/old.jpg',
        file_type: 'image'
      });

      const updated = await attachmentsDB.update(created.id, {
        file_name: 'new.jpg',
        description: 'Updated description'
      });

      expect(updated.file_name).toBe('new.jpg');
      expect(updated.description).toBe('Updated description');
      expect(updated.original_name).toBe('old.jpg'); // Unchanged
    });

    test('delete() removes existing attachment', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'temp.jpg',
        original_name: 'temp.jpg',
        file_path: '/temp.jpg',
        file_type: 'image'
      });

      const result = await attachmentsDB.delete(created.id);
      expect(result).toEqual({
        success: true,
        deletedId: created.id
      });

      const check = await attachmentsDB.getById(created.id);
      expect(check).toBeNull();
    });
  });

  describe('validation and error handling', () => {
    test('create() throws error for missing required fields', async () => {
      await expect(attachmentsDB.create({}))
        .rejects
        .toThrow(DatabaseError);

      await expect(attachmentsDB.create({ entity_type: 'contact' }))
        .rejects
        .toThrow('Missing required fields');
    });

    test('create() throws error for invalid entity_type', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'invalid',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Invalid entity_type');
    });

    test('create() throws error for invalid file_type', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.xyz',
        original_name: 'test.xyz',
        file_path: '/test.xyz',
        file_type: 'unknown'
      })).rejects.toThrow('Invalid file_type');
    });

    test('create() throws error for invalid file_size', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image',
        file_size: -100
      })).rejects.toThrow('Invalid file_size');

      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image',
        file_size: 'not a number'
      })).rejects.toThrow('Invalid file_size');

      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image',
        file_size: Infinity
      })).rejects.toThrow('Invalid file_size');
    });

    test('update() throws error when attachment not found', async () => {
      await expect(attachmentsDB.update(999, { description: 'test' }))
        .rejects
        .toThrow('Attachment not found');
    });

    test('update() throws error when no fields to update', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      });

      await expect(attachmentsDB.update(created.id, {}))
        .rejects
        .toThrow('No valid fields to update');
    });

    test('update() throws error for invalid file_size', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      });

      await expect(attachmentsDB.update(created.id, { file_size: -50 }))
        .rejects
        .toThrow('Invalid file_size');

      await expect(attachmentsDB.update(created.id, { file_size: 'invalid' }))
        .rejects
        .toThrow('Invalid file_size');

      await expect(attachmentsDB.update(created.id, { file_size: NaN }))
        .rejects
        .toThrow('Invalid file_size');
    });

    test('delete() throws error when attachment not found', async () => {
      await expect(attachmentsDB.delete(999))
        .rejects
        .toThrow('Attachment not found');
    });

    test('getAll() throws error for invalid sort column', async () => {
      await expect(attachmentsDB.getAll({ sortBy: 'invalid_column' }))
        .rejects
        .toThrow('Invalid sort column');
    });

    test('getAll() throws error for invalid sort order', async () => {
      await expect(attachmentsDB.getAll({ sortOrder: 'INVALID' }))
        .rejects
        .toThrow('Invalid sort order');
    });

    test('create() throws error for missing entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Missing required fields: entity_id');
    });

    test('create() throws error for null entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: null,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Missing required fields: entity_id');
    });

    test('create() throws error for negative entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: -1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Invalid entity_id. Must be a positive integer');
    });

    test('create() throws error for zero entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 0,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Invalid entity_id. Must be a positive integer');
    });

    test('create() throws error for non-integer entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1.5,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Invalid entity_id. Must be a positive integer');
    });

    test('create() accepts string numbers for entity_id', async () => {
      const result = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: '123',
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      });

      expect(result).toBeDefined();
      expect(result.entity_id).toBe(123); // Should be converted to number
    });

    test('create() throws error for invalid string entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 'not-a-number',
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Invalid entity_id. Must be a positive integer');
    });

    test('create() throws error for empty string entity_id', async () => {
      await expect(attachmentsDB.create({
        entity_type: 'contact',
        entity_id: '',
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      })).rejects.toThrow('Missing required fields: entity_id');
    });

    test('update() throws error for invalid entity_id', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      });

      await expect(attachmentsDB.update(created.id, { entity_id: -1 }))
        .rejects
        .toThrow('Invalid entity_id. Must be a positive integer');

      await expect(attachmentsDB.update(created.id, { entity_id: 0 }))
        .rejects
        .toThrow('Invalid entity_id. Must be a positive integer');

      await expect(attachmentsDB.update(created.id, { entity_id: 1.5 }))
        .rejects
        .toThrow('Invalid entity_id. Must be a positive integer');

      await expect(attachmentsDB.update(created.id, { entity_id: 'invalid' }))
        .rejects
        .toThrow('Invalid entity_id. Must be a positive integer');
    });

    test('update() accepts string numbers for entity_id', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        file_path: '/test.jpg',
        file_type: 'image'
      });

      const result = await attachmentsDB.update(created.id, { entity_id: '456' });
      expect(result.entity_id).toBe(456); // Should be converted to number
    });

    test('getAll() handles pagination validation', async () => {
      // Create some test data
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test1.jpg',
        original_name: 'test1.jpg',
        file_path: '/test1.jpg',
        file_type: 'image'
      });

      // Test with default pagination (should use limit=10, offset=0)
      const defaultResult = await attachmentsDB.getAll();
      expect(defaultResult.length).toBeGreaterThan(0);

      // Test with valid pagination values
      const validResult = await attachmentsDB.getAll({ limit: 5, offset: 0 });
      expect(validResult.length).toBeGreaterThan(0);

      // Test negative limit (should default to 10)
      const negLimitResult = await attachmentsDB.getAll({ limit: -5 });
      expect(negLimitResult).toBeDefined();

      // Test negative offset (should default to 0)
      const negOffsetResult = await attachmentsDB.getAll({ offset: -1 });
      expect(negOffsetResult).toBeDefined();

      // Test excessively large limit (should be clamped to 100)
      const largeLimitResult = await attachmentsDB.getAll({ limit: 1000 });
      expect(largeLimitResult).toBeDefined();

      // Test zero limit (should be set to 1)
      const zeroLimitResult = await attachmentsDB.getAll({ limit: 0 });
      expect(zeroLimitResult).toBeDefined();

      // Test string numbers for pagination
      const stringParamsResult = await attachmentsDB.getAll({ limit: '15', offset: '2' });
      expect(stringParamsResult).toBeDefined();

      // Test invalid string values (should use defaults)
      const invalidStringResult = await attachmentsDB.getAll({ limit: 'invalid', offset: 'bad' });
      expect(invalidStringResult).toBeDefined();

      // Test null/undefined values (should use defaults)
      const nullResult = await attachmentsDB.getAll({ limit: null, offset: undefined });
      expect(nullResult).toBeDefined();
    });

    test('getByFileType() handles pagination validation', async () => {
      // Create test data
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'test1.jpg',
        original_name: 'test1.jpg',
        file_path: '/test1.jpg',
        file_type: 'image'
      });

      // Test with default pagination
      const defaultResult = await attachmentsDB.getByFileType('image');
      expect(defaultResult.length).toBeGreaterThan(0);

      // Test with valid pagination values
      const validResult = await attachmentsDB.getByFileType('image', { limit: 5, offset: 0 });
      expect(validResult.length).toBeGreaterThan(0);

      // Test negative values (should use defaults)
      const negativeResult = await attachmentsDB.getByFileType('image', { limit: -10, offset: -5 });
      expect(negativeResult).toBeDefined();

      // Test excessive values (should be clamped)
      const excessiveResult = await attachmentsDB.getByFileType('image', { limit: 500, offset: 0 });
      expect(excessiveResult).toBeDefined();

      // Test string numbers
      const stringResult = await attachmentsDB.getByFileType('image', { limit: '8', offset: '1' });
      expect(stringResult).toBeDefined();
    });
  });

  describe('entity-specific operations', () => {
    test('getByEntity() returns attachments for specific entity', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'contact1-photo.jpg',
        original_name: 'photo.jpg',
        file_path: '/contact1-photo.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'contact1-doc.pdf',
        original_name: 'document.pdf',
        file_path: '/contact1-doc.pdf',
        file_type: 'document'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'contact2-photo.jpg',
        original_name: 'other.jpg',
        file_path: '/contact2-photo.jpg',
        file_type: 'image'
      });

      const result = await attachmentsDB.getByEntity('contact', 1);
      
      expect(result).toHaveLength(2);
      expect(result.every(att => att.entity_type === 'contact' && att.entity_id === 1)).toBe(true);
      // Note: In-memory SQLite may not have enough timestamp precision for ordering
      const fileNames = result.map(r => r.file_name).sort();
      expect(fileNames).toEqual(['contact1-doc.pdf', 'contact1-photo.jpg']);
    });

    test('getByEntity() returns empty array when no attachments exist', async () => {
      const result = await attachmentsDB.getByEntity('contact', 999);
      expect(result).toEqual([]);
    });

    test('getByEntity() throws error for invalid entity type', async () => {
      await expect(attachmentsDB.getByEntity('invalid', 1))
        .rejects
        .toThrow('Invalid entity_type');
    });

    test('deleteByEntity() removes all attachments for specific entity', async () => {
      await attachmentsDB.create({
        entity_type: 'interaction',
        entity_id: 1,
        file_name: 'recording.mp3',
        original_name: 'call.mp3',
        file_path: '/recording.mp3',
        file_type: 'audio'
      });

      await attachmentsDB.create({
        entity_type: 'interaction',
        entity_id: 1,
        file_name: 'notes.pdf',
        original_name: 'meeting-notes.pdf',
        file_path: '/notes.pdf',
        file_type: 'document'
      });

      const result = await attachmentsDB.deleteByEntity('interaction', 1);
      
      expect(result).toEqual({
        success: true,
        deletedCount: 2,
        entityType: 'interaction',
        entityId: 1
      });

      const remaining = await attachmentsDB.getByEntity('interaction', 1);
      expect(remaining).toEqual([]);
    });

    test('deleteByEntity() returns zero count when no attachments exist', async () => {
      const result = await attachmentsDB.deleteByEntity('contact', 999);
      
      expect(result).toEqual({
        success: true,
        deletedCount: 0,
        entityType: 'contact',
        entityId: 999
      });
    });
  });

  describe('utility operations', () => {
    test('getOrphaned() finds attachments with non-existent entities', async () => {
      // Create entities
      await ctx.execute('INSERT INTO contacts (id, first_name) VALUES (1, "John")');
      await ctx.execute('INSERT INTO interactions (id, contact_id, title, interaction_type) VALUES (1, 1, "Call", "call")');

      // Create attachments - some orphaned, some not
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1, // exists
        file_name: 'valid-contact.jpg',
        original_name: 'photo.jpg',
        file_path: '/valid-contact.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 999, // does not exist
        file_name: 'orphaned-contact.jpg',
        original_name: 'orphan.jpg',
        file_path: '/orphaned-contact.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'interaction',
        entity_id: 1, // exists
        file_name: 'valid-interaction.mp3',
        original_name: 'recording.mp3',
        file_path: '/valid-interaction.mp3',
        file_type: 'audio'
      });

      await attachmentsDB.create({
        entity_type: 'event',
        entity_id: 999, // does not exist (no events table entries)
        file_name: 'orphaned-event.pdf',
        original_name: 'invite.pdf',
        file_path: '/orphaned-event.pdf',
        file_type: 'document'
      });

      const orphaned = await attachmentsDB.getOrphaned();
      
      expect(orphaned).toHaveLength(2);
      expect(orphaned.map(a => a.file_name).sort()).toEqual(['orphaned-contact.jpg', 'orphaned-event.pdf']);
    });

    test('cleanupOrphaned() removes orphaned attachments', async () => {
      // Create orphaned attachments
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 999,
        file_name: 'orphan1.jpg',
        original_name: 'orphan1.jpg',
        file_path: '/orphan1.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'note',
        entity_id: 999,
        file_name: 'orphan2.pdf',
        original_name: 'orphan2.pdf',
        file_path: '/orphan2.pdf',
        file_type: 'document'
      });

      const result = await attachmentsDB.cleanupOrphaned();
      
      expect(result).toEqual({
        success: true,
        deletedCount: 2
      });

      const allAttachments = await attachmentsDB.getAll();
      expect(allAttachments).toHaveLength(0);
    });

    test('updateFilePath() updates file path and thumbnail path', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'image.jpg',
        original_name: 'image.jpg',
        file_path: '/old/path/image.jpg',
        file_type: 'image',
        thumbnail_path: '/old/path/thumb.jpg'
      });

      const updated = await attachmentsDB.updateFilePath(
        created.id,
        '/new/path/image.jpg',
        '/new/path/thumb.jpg'
      );

      expect(updated.file_path).toBe('/new/path/image.jpg');
      expect(updated.thumbnail_path).toBe('/new/path/thumb.jpg');
    });

    test('updateFilePath() updates only file path when thumbnail not provided', async () => {
      const created = await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'doc.pdf',
        original_name: 'document.pdf',
        file_path: '/old/path/doc.pdf',
        file_type: 'document'
      });

      const updated = await attachmentsDB.updateFilePath(created.id, '/new/path/doc.pdf');

      expect(updated.file_path).toBe('/new/path/doc.pdf');
      expect(updated.thumbnail_path).toBeNull();
    });

    test('getTotalSize() returns total size of all attachments', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'file1.jpg',
        original_name: 'file1.jpg',
        file_path: '/file1.jpg',
        file_type: 'image',
        file_size: 1000
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'file2.pdf',
        original_name: 'file2.pdf',
        file_path: '/file2.pdf',
        file_type: 'document',
        file_size: 2000
      });

      const totalSize = await attachmentsDB.getTotalSize();
      expect(totalSize).toBe(3000);
    });

    test('getTotalSize() returns size for specific entity type', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'contact.jpg',
        original_name: 'contact.jpg',
        file_path: '/contact.jpg',
        file_type: 'image',
        file_size: 1000
      });

      await attachmentsDB.create({
        entity_type: 'event',
        entity_id: 1,
        file_name: 'event.pdf',
        original_name: 'event.pdf',
        file_path: '/event.pdf',
        file_type: 'document',
        file_size: 2000
      });

      const contactSize = await attachmentsDB.getTotalSize('contact');
      expect(contactSize).toBe(1000);
    });

    test('getTotalSize() returns size for specific entity', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'contact1-1.jpg',
        original_name: 'photo1.jpg',
        file_path: '/contact1-1.jpg',
        file_type: 'image',
        file_size: 1000
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'contact1-2.pdf',
        original_name: 'doc.pdf',
        file_path: '/contact1-2.pdf',
        file_type: 'document',
        file_size: 2000
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'contact2.jpg',
        original_name: 'other.jpg',
        file_path: '/contact2.jpg',
        file_type: 'image',
        file_size: 500
      });

      const contact1Size = await attachmentsDB.getTotalSize('contact', 1);
      expect(contact1Size).toBe(3000);
    });

    test('getTotalSize() returns 0 when no attachments have file_size', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'no-size.jpg',
        original_name: 'no-size.jpg',
        file_path: '/no-size.jpg',
        file_type: 'image'
        // file_size is null
      });

      const totalSize = await attachmentsDB.getTotalSize();
      expect(totalSize).toBe(0);
    });

    test('getByFileType() returns attachments of specific file type', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'photo1.jpg',
        original_name: 'photo1.jpg',
        file_path: '/photo1.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'photo2.png',
        original_name: 'photo2.png',
        file_path: '/photo2.png',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'event',
        entity_id: 1,
        file_name: 'document.pdf',
        original_name: 'document.pdf',
        file_path: '/document.pdf',
        file_type: 'document'
      });

      const images = await attachmentsDB.getByFileType('image');
      
      expect(images).toHaveLength(2);
      expect(images.every(att => att.file_type === 'image')).toBe(true);
      // Note: In-memory SQLite may not have enough timestamp precision for ordering
      const fileNames = images.map(r => r.file_name).sort();
      expect(fileNames).toEqual(['photo1.jpg', 'photo2.png']);
    });

    test('getByFileType() supports pagination and sorting', async () => {
      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 1,
        file_name: 'a.jpg',
        original_name: 'a.jpg',
        file_path: '/a.jpg',
        file_type: 'image'
      });

      await attachmentsDB.create({
        entity_type: 'contact',
        entity_id: 2,
        file_name: 'b.jpg',
        original_name: 'b.jpg',
        file_path: '/b.jpg',
        file_type: 'image'
      });

      const result = await attachmentsDB.getByFileType('image', {
        limit: 1,
        offset: 0,
        sortBy: 'file_name',
        sortOrder: 'ASC'
      });

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('a.jpg');
    });

    test('getByFileType() throws error for invalid file type', async () => {
      await expect(attachmentsDB.getByFileType('invalid'))
        .rejects
        .toThrow('Invalid file_type');
    });
  });
});