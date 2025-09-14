// contacts.test.js
// Comprehensive unit tests for contactsDB using an in-memory SQLite database.
// Uses sql.js (pure WASM) to avoid native builds.
import initSqlJs from 'sql.js';
import path from 'path';
import { createContactsDB } from '../contacts';
import { createContactsInfoDB } from '../contactsInfo';

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
      batch: async (statements) => {
        // Batch within transaction - no BEGIN/COMMIT needed
        const results = [];
        for (const stmt of statements) {
          const result = await exec(stmt.sql, stmt.params || []);
          results.push(result);
        }
        return results;
      }
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
  // Minimal subset required for contacts features
  run(`CREATE TABLE contacts (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    middle_name TEXT,
    display_name TEXT,
    avatar_uri TEXT,
    company_id INTEGER,
    job_title TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    last_interaction_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  // Indexes reflecting frequently queried columns
  run(`CREATE INDEX IF NOT EXISTS idx_contacts_last_first ON contacts(last_name, first_name);`);
  run(`CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);`);
  run(`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);`);

  run(`CREATE TABLE contact_info (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    subtype TEXT,
    value TEXT NOT NULL,
    label TEXT,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`);

  run(`CREATE INDEX IF NOT EXISTS idx_contact_info_contact ON contact_info(contact_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_contact_info_primary ON contact_info(contact_id, type, is_primary);`);

  run(`CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#007AFF',
    icon TEXT DEFAULT 'folder',
    is_system BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  run(`CREATE TABLE contact_categories (
    contact_id INTEGER,
    category_id INTEGER,
    PRIMARY KEY (contact_id, category_id),
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  );`);

  run(`CREATE INDEX IF NOT EXISTS idx_contact_categories_contact ON contact_categories(contact_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_contact_categories_category ON contact_categories(category_id);`);

  // Attachments table (for contact deletion tests)
  run(`CREATE TABLE attachments (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','note','event','interaction')),
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
  );`);

  run(`CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);`);
}

describe('contactsDB (in-memory)', () => {
  let SQL;
  let db;
  let ctx;
  let contacts;
  let contactsInfo;

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
    contacts = createContactsDB(ctx);
    contactsInfo = createContactsInfoDB(ctx);
  });

  afterEach(() => {
    try { db.close(); } catch (_) {}
  });

  test('create rejects without first_name', async () => {
    await expect(contacts.create({ last_name: 'NoFirst' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('create contact without info and fetch by id', async () => {
    const { id } = await contacts.create({ first_name: 'Ada', last_name: 'Lovelace' });
    expect(id).toBeGreaterThan(0);
    const found = await contacts.getById(id);
    expect(found.first_name).toBe('Ada');
    expect(found.last_name).toBe('Lovelace');
    expect(found.is_favorite).toBe(0);
  });

  test('create contact with info batch and retrieve with info', async () => {
    // Create contact first
    const { id } = await contacts.create({
      first_name: 'Alan',
      last_name: 'Turing'
    });
    
    // Add contact info separately
    await contactsInfo.addContactInfo(id, { type: 'mobile', value: '+111', is_primary: 1 });
    await contactsInfo.addContactInfo(id, { type: 'email', value: 'alan@example.com', is_primary: 1 });
    await contactsInfo.addContactInfo(id, { type: 'mobile', value: '+222', is_primary: 0 });
    
    const detailed = await contactsInfo.getWithContactInfo(id);
    expect(detailed.contact_info.length).toBe(3);
    const mobiles = detailed.contact_info.filter((ci) => ci.type === 'mobile');
    expect(mobiles.some((m) => m.is_primary === 1)).toBe(true);
  });

  test('getAll, search, favorites filtering', async () => {
    const a = await contacts.create({ first_name: 'Grace', last_name: 'Hopper' });
    const b = await contacts.create({ first_name: 'Linus', last_name: 'Torvalds', is_favorite: 1 });
    const all = await contacts.getAll({ orderBy: 'first_name' });
    expect(all.length).toBeGreaterThanOrEqual(2);
    const hits = await contacts.search('Linus');
    expect(hits.map((h) => h.id)).toEqual([b.id]);
    const favs = await contacts.getFavorites();
    expect(favs.find((f) => f.id === b.id)).toBeTruthy();
    expect(favs.find((f) => f.id === a.id)).toBeFalsy();
  });

  test('getAll respects limit/offset', async () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    for (const n of names) {
      // eslint-disable-next-line no-await-in-loop
      await contacts.create({ first_name: n });
    }
    const firstTwo = await contacts.getAll({ orderBy: 'first_name', limit: 2, offset: 0 });
    expect(firstTwo.map(c => c.first_name)).toEqual(['A', 'B']);
    const nextTwo = await contacts.getAll({ orderBy: 'first_name', limit: 2, offset: 2 });
    expect(nextTwo.map(c => c.first_name)).toEqual(['C', 'D']);
  });

  test('update contact fields and toggle favorite', async () => {
    const { id } = await contacts.create({ first_name: 'Katherine', last_name: 'Johnson' });
    const updated = await contacts.update(id, { job_title: 'Mathematician' });
    expect(updated.job_title).toBe('Mathematician');
    const t1 = await contacts.toggleFavorite(id);
    expect(t1.is_favorite).toBe(1);
    const after1 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?;', [id]);
    expect(after1.rows[0].last_interaction_at).toBeTruthy();
    const t2 = await contacts.toggleFavorite(id);
    expect(t2.is_favorite).toBe(0);
    const after2 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?;', [id]);
    expect(after2.rows[0].last_interaction_at).toBeTruthy();
  });

  test('add/update/delete contact info with primary enforcement', async () => {
    const { id } = await contacts.create({ first_name: 'Margaret', last_name: 'Hamilton' });
    const created = await contactsInfo.addContactInfo(id, [
      { type: 'email', value: 'margaret@apollo.com', is_primary: 1 },
      { type: 'email', value: 'margaret@mit.edu', is_primary: 0 },
    ]);
    expect(created.length).toBe(2);
    const afterAdd = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?;', [id]);
    expect(afterAdd.rows[0].last_interaction_at).toBeTruthy();

    const infoRows = await ctx.execute('SELECT * FROM contact_info WHERE contact_id = ? ORDER BY id;', [id]);
    const firstInfo = infoRows.rows[0];
    const secondInfo = infoRows.rows[1];
    expect(firstInfo.is_primary).toBe(1);

    // Promote second to primary; first should be reset
    const updatedInfo = await contactsInfo.updateContactInfo(secondInfo.id, { is_primary: 1 });
    expect(updatedInfo.is_primary).toBe(1);
    const afterUpdate = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?;', [id]);
    expect(afterUpdate.rows[0].last_interaction_at).toBeTruthy();
    const check = await ctx.execute('SELECT * FROM contact_info WHERE id IN (?, ?) ORDER BY id;', [firstInfo.id, secondInfo.id]);
    expect(check.rows[0].is_primary + check.rows[1].is_primary).toBe(1);

    // Delete one info
    const removed = await contactsInfo.deleteContactInfo(firstInfo.id);
    expect(removed).toBe(1);
    const remaining = await ctx.execute('SELECT COUNT(*) as cnt FROM contact_info WHERE contact_id = ?;', [id]);
    expect(remaining.rows[0].cnt).toBe(1);
  });

  test('getByCategory and getWithCategories', async () => {
    const { id } = await contacts.create({ first_name: 'Tim', last_name: 'Berners-Lee' });
    const { insertId: categoryId } = await ctx.execute(
      'INSERT INTO categories (name, color, icon, is_system, sort_order) VALUES (?, ?, ?, 1, 10);',
      ['VIP', '#F4C430', 'star']
    );
    await ctx.execute('INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);', [id, categoryId]);

    const inCat = await contacts.getByCategory(categoryId);
    expect(inCat.find((c) => c.id === id)).toBeTruthy();

    const detailed = await contacts.getWithCategories(id);
    expect(detailed.categories.length).toBe(1);
    expect(detailed.categories[0].name).toBe('VIP');
  });

  test('delete contact cascades to contact_info', async () => {
    // Create contact first
    const { id } = await contacts.create({
      first_name: 'Barbara',
      last_name: 'Liskov'
    });
    
    // Add contact info separately
    await contactsInfo.addContactInfo(id, { type: 'mobile', value: '+333', is_primary: 1 });
    
    const before = await ctx.execute('SELECT COUNT(*) as cnt FROM contact_info WHERE contact_id = ?;', [id]);
    expect(before.rows[0].cnt).toBe(1);
    const removed = await contacts.delete(id);
    expect(removed).toBe(1);
    const after = await ctx.execute('SELECT COUNT(*) as cnt FROM contact_info WHERE contact_id = ?;', [id]);
    expect(after.rows[0].cnt).toBe(0);
  });
});
