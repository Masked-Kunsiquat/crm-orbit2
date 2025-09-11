// interactions.test.js
// Comprehensive unit tests for interactionsDB using an in-memory SQLite database.
// Uses sql.js (pure WASM) to avoid native builds.
import initSqlJs from 'sql.js';
import path from 'path';
import { createInteractionsDB } from '../interactions';

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
    // Transaction wrapper that enforces synchronous scheduling to match production WebSQL semantics.
    // In production, all tx.executeSql calls must be scheduled synchronously inside the callback.
    // While callers can return a Promise to handle async results, all execute calls must be scheduled
    // synchronously without awaiting between them.
    let result;
    let workError;
    let workPromise = null;
    const wrapped = {
      execute: (sql, params = []) => exec(sql, params),
    };
    
    db.prepare('BEGIN').run();
    try {
      // Call work synchronously - it may return a Promise to handle async results,
      // but all execute() calls must be scheduled before the Promise resolves
      const maybePromise = work(wrapped);
      if (maybePromise && typeof maybePromise.then === 'function') {
        // It's a Promise - capture it but don't resolve until after commit
        workPromise = maybePromise;
      } else {
        result = maybePromise;
      }
      db.prepare('COMMIT').run();
    } catch (e) {
      workError = e;
      try { db.prepare('ROLLBACK').run(); } catch (_) {}
      throw workError;
    }
    
    // If work returned a Promise, wait for it after commit
    if (workPromise) {
      try {
        result = await workPromise;
      } catch (e) {
        throw e;
      }
    }
    
    return result;
  };

  return { execute: exec, batch: doBatch, transaction: tx };
}

function createSchema(db) {
  const run = (sql) => db.run(sql);
  
  // Create contacts table (required for foreign key)
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

  // Create interactions table
  run(`CREATE TABLE interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    note TEXT,
    interaction_type TEXT NOT NULL,
    custom_type TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`);

  // Create indexes
  run(`CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_interactions_datetime ON interactions(datetime);`);
  run(`CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);`);
}

describe('interactionsDB (in-memory)', () => {
  let SQL;
  let db;
  let ctx;
  let interactions;
  let contactId;
  let contact2Id;

  beforeAll(async () => {
    SQL = await initSqlJs({
      locateFile: (file) => {
        // Resolve WASM shipped with sql.js
        const resolved = require.resolve('sql.js/dist/sql-wasm.wasm');
        return path.join(path.dirname(resolved), file);
      },
    });
  });

  beforeEach(async () => {
    db = new SQL.Database();
    createSchema(db);
    ctx = makeCtx(db);
    interactions = createInteractionsDB(ctx);
    
    // Create test contacts
    const contactRes = await ctx.execute(
      'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?)',
      ['John', 'Doe', 'John Doe']
    );
    contactId = contactRes.insertId;

    const contact2Res = await ctx.execute(
      'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?)',
      ['Jane', 'Smith', 'Jane Smith']
    );
    contact2Id = contact2Res.insertId;
  });

  afterEach(() => {
    try { db.close(); } catch (_) {}
  });

  // Core CRUD tests
  test('create rejects without required fields', async () => {
    await expect(interactions.create({}))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await expect(interactions.create({ contact_id: contactId }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await expect(interactions.create({ contact_id: contactId, title: 'Test' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('create interaction and fetch by id', async () => {
    const interactionData = {
      contact_id: contactId,
      title: 'Phone call',
      interaction_type: 'call',
      duration: 15,
      note: 'Discussed project requirements'
    };
    
    const created = await interactions.create(interactionData);
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('Phone call');
    expect(created.interaction_type).toBe('call');
    expect(created.duration).toBe(15);
    expect(created.note).toBe('Discussed project requirements');
    expect(created.datetime).toBeTruthy();

    const found = await interactions.getById(created.id);
    expect(found.title).toBe('Phone call');
    expect(found.contact_id).toBe(contactId);
  });

  test('create sets default datetime when not provided', async () => {
    const interactionData = {
      contact_id: contactId,
      title: 'Meeting',
      interaction_type: 'meeting'
    };
    
    const created = await interactions.create(interactionData);
    expect(created.datetime).toBeTruthy();
    
    // Should be recent (within last minute)
    const now = new Date();
    const createdTime = new Date(created.datetime);
    const diffMs = Math.abs(now - createdTime);
    expect(diffMs).toBeLessThan(60000); // Less than 1 minute
  });

  test('create auto-updates contact last_interaction_at', async () => {
    const beforeContact = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    expect(beforeContact.rows[0].last_interaction_at).toBeFalsy();

    await interactions.create({
      contact_id: contactId,
      title: 'Call',
      interaction_type: 'call'
    });

    const afterContact = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    expect(afterContact.rows[0].last_interaction_at).toBeTruthy();
  });

  test('update interaction', async () => {
    const created = await interactions.create({
      contact_id: contactId,
      title: 'Original Title',
      interaction_type: 'call',
      duration: 10
    });

    const updated = await interactions.update(created.id, {
      title: 'Updated Title',
      duration: 20,
      note: 'Added notes'
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.duration).toBe(20);
    expect(updated.note).toBe('Added notes');
    expect(updated.interaction_type).toBe('call'); // Unchanged
  });

  test('update non-existent interaction throws error', async () => {
    await expect(interactions.update(9999, { title: 'Test' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('delete interaction', async () => {
    const created = await interactions.create({
      contact_id: contactId,
      title: 'To Delete',
      interaction_type: 'email'
    });

    const rowsAffected = await interactions.delete(created.id);
    expect(rowsAffected).toBe(1);

    const found = await interactions.getById(created.id);
    expect(found).toBeNull();
  });

  test('getAll returns interactions with pagination', async () => {
    // Create multiple interactions with deterministic, unique datetimes to avoid tie ordering
    const base = new Date('2024-01-01T00:00:00.000Z').getTime();
    for (let i = 0; i < 5; i++) {
      await interactions.create({
        contact_id: contactId,
        title: `Interaction ${i}`,
        interaction_type: 'email',
        datetime: new Date(base + i * 1000).toISOString()
      });
    }

    const all = await interactions.getAll({ limit: 3 });
    expect(all.length).toBe(3);
    // Should be in DESC order by default (most recent first)
    expect(all.map(i => i.title)).toEqual(['Interaction 4', 'Interaction 3', 'Interaction 2']);

    const page2 = await interactions.getAll({ limit: 3, offset: 3 });
    expect(page2.length).toBe(2);
    expect(page2.map(i => i.title)).toEqual(['Interaction 1', 'Interaction 0']);
  });

  // Search & Filter tests
  test('getByContact returns contact interactions only', async () => {
    // Create interactions for both contacts
    await interactions.create({
      contact_id: contactId,
      title: 'John Call',
      interaction_type: 'call'
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Jane Email',
      interaction_type: 'email'
    });

    const johnInteractions = await interactions.getByContact(contactId);
    expect(johnInteractions.length).toBe(1);
    expect(johnInteractions[0].title).toBe('John Call');

    const janeInteractions = await interactions.getByContact(contact2Id);
    expect(janeInteractions.length).toBe(1);
    expect(janeInteractions[0].title).toBe('Jane Email');
  });

  test('getRecent returns recent interactions with contact info', async () => {
    const recentTime = new Date().toISOString();
    const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

    await interactions.create({
      contact_id: contactId,
      title: 'Recent Call',
      interaction_type: 'call',
      datetime: recentTime
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Old Call',
      interaction_type: 'call',
      datetime: oldTime
    });

    const recent = await interactions.getRecent({ days: 7 });
    expect(recent.length).toBe(1);
    expect(recent[0].title).toBe('Recent Call');
    expect(recent[0].first_name).toBe('John');
    expect(recent[0].display_name).toBe('John Doe');
  });

  test('getByType returns interactions of specific type', async () => {
    await interactions.create({
      contact_id: contactId,
      title: 'Phone Call',
      interaction_type: 'call'
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Email Thread',
      interaction_type: 'email'
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Another Call',
      interaction_type: 'call'
    });

    const calls = await interactions.getByType('call');
    expect(calls.length).toBe(2);
    expect(calls.every(i => i.interaction_type === 'call')).toBe(true);

    const emails = await interactions.getByType('email');
    expect(emails.length).toBe(1);
    expect(emails[0].title).toBe('Email Thread');
  });

  test('getByDateRange returns interactions in specified range', async () => {
    const date1 = '2024-06-01T10:00:00Z';
    const date2 = '2024-06-15T10:00:00Z';
    const dateBoundaryInclusive = '2024-06-30T23:59:59Z';
    const dateOutside = '2024-07-01T00:00:00Z';
    
    await interactions.create({
      contact_id: contactId,
      title: 'June Interaction',
      interaction_type: 'call',
      datetime: date1
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Mid June Interaction',
      interaction_type: 'email',
      datetime: date2
    });

    // Edge of day boundary (should be included when using end-exclusive normalization)
    await interactions.create({
      contact_id: contactId,
      title: 'End of June Interaction',
      interaction_type: 'meeting',
      datetime: dateBoundaryInclusive
    });

    // Outside the range (should be excluded)
    await interactions.create({
      contact_id: contactId,
      title: 'July Interaction',
      interaction_type: 'meeting',
      datetime: dateOutside
    });

    const juneInteractions = await interactions.getByDateRange('2024-06-01', '2024-06-30');
    expect(juneInteractions.length).toBe(3);
    expect(juneInteractions.some(i => i.title === 'June Interaction')).toBe(true);
    expect(juneInteractions.some(i => i.title === 'Mid June Interaction')).toBe(true);
    expect(juneInteractions.some(i => i.title === 'End of June Interaction')).toBe(true);
    expect(juneInteractions.some(i => i.title === 'July Interaction')).toBe(false);
  });

  // Statistics tests
  test('getStatistics returns comprehensive statistics', async () => {
    // Create various interactions
    await interactions.create({
      contact_id: contactId,
      title: 'Call 1',
      interaction_type: 'call',
      duration: 10
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Call 2',
      interaction_type: 'call',
      duration: 20
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Email 1',
      interaction_type: 'email'
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Meeting 1',
      interaction_type: 'meeting',
      duration: 60
    });

    const stats = await interactions.getStatistics();
    
    expect(stats.totalInteractions).toBe(4);
    expect(stats.uniqueContacts).toBe(2);
    expect(stats.countByType.call).toBe(2);
    expect(stats.countByType.email).toBe(1);
    expect(stats.countByType.meeting).toBe(1);
    expect(stats.averageDuration.call).toBe(15); // (10 + 20) / 2
    expect(stats.averageDuration.meeting).toBe(60);
  });

  test('getStatistics with contact filter', async () => {
    await interactions.create({
      contact_id: contactId,
      title: 'John Call',
      interaction_type: 'call'
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Jane Call',
      interaction_type: 'call'
    });

    const stats = await interactions.getStatistics({ contactId });
    expect(stats.totalInteractions).toBe(1);
    expect(stats.uniqueContacts).toBe(1);
    expect(stats.countByType.call).toBe(1);
  });

  // Bulk operations tests
  test('bulkCreate creates multiple interactions atomically', async () => {
    const interactionList = [
      {
        contact_id: contactId,
        title: 'Bulk Call 1',
        interaction_type: 'call',
        duration: 5
      },
      {
        contact_id: contact2Id,
        title: 'Bulk Email 1',
        interaction_type: 'email'
      },
      {
        contact_id: contactId,
        title: 'Bulk Meeting 1',
        interaction_type: 'meeting',
        duration: 30
      }
    ];

    const results = await interactions.bulkCreate(interactionList);
    expect(results.length).toBe(3);
    expect(results[0].title).toBe('Bulk Call 1');
    expect(results[1].title).toBe('Bulk Email 1');
    expect(results[2].title).toBe('Bulk Meeting 1');

    // Verify they were actually created
    const all = await interactions.getAll();
    expect(all.length).toBe(3);
  });

  test('bulkCreate updates last_interaction_at for all affected contacts', async () => {
    const interactionList = [
      // Two for contact 1: latest should be Aug 02 09:00:00Z
      {
        contact_id: contactId,
        title: 'Bulk Call (older)',
        interaction_type: 'call',
        datetime: '2024-08-01T12:00:00.000Z'
      },
      {
        contact_id: contactId,
        title: 'Bulk Meeting (newer)',
        interaction_type: 'meeting',
        datetime: '2024-08-02T09:00:00.000Z'
      },
      // Two for contact 2: latest should be Aug 03 00:00:00Z
      {
        contact_id: contact2Id,
        title: 'Bulk Email (older)',
        interaction_type: 'email',
        datetime: '2024-08-01T12:00:00.000Z'
      },
      {
        contact_id: contact2Id,
        title: 'Bulk Call (newer)',
        interaction_type: 'call',
        datetime: '2024-08-03T00:00:00.000Z'
      }
    ];

    await interactions.bulkCreate(interactionList);

    // Check both contacts were updated to the actual MAX(datetime) among their interactions
    const contact1 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    const contact2 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contact2Id]);
    
    expect(contact1.rows[0].last_interaction_at).toBe('2024-08-02T09:00:00.000Z');
    expect(contact2.rows[0].last_interaction_at).toBe('2024-08-03T00:00:00.000Z');
  });

  test('bulkCreate validates input', async () => {
    await expect(interactions.bulkCreate([]))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await expect(interactions.bulkCreate([{ title: 'Missing fields' }]))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test("updating an interaction's contact_id recalculates last_interaction_at for both contacts", async () => {
    // Create interactions for two contacts with known datetimes
    const movedDatetime = '2024-06-02T10:00:00Z';
    const otherForContact1 = '2024-05-01T09:00:00Z';
    const existingForContact2 = '2024-05-15T11:00:00Z';

    const other1 = await interactions.create({
      contact_id: contactId,
      title: 'Other for C1',
      interaction_type: 'call',
      datetime: otherForContact1
    });

    const toMove = await interactions.create({
      contact_id: contactId,
      title: 'To Move',
      interaction_type: 'email',
      datetime: movedDatetime
    });

    const c2existing = await interactions.create({
      contact_id: contact2Id,
      title: 'Existing for C2',
      interaction_type: 'meeting',
      datetime: existingForContact2
    });

    // Record both contacts' last_interaction_at before the update
    const beforeC1 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    const beforeC2 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contact2Id]);
    const beforeC1Last = beforeC1.rows[0].last_interaction_at;
    const beforeC2Last = beforeC2.rows[0].last_interaction_at;
    expect(beforeC1Last).toBeTruthy();
    expect(beforeC2Last).toBeTruthy();

    // Transfer the interaction to the second contact
    await interactions.update(toMove.id, { contact_id: contact2Id });

    // Fetch contacts after transfer
    const afterC1 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    const afterC2 = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contact2Id]);

    const afterC1Last = afterC1.rows[0].last_interaction_at;
    const afterC2Last = afterC2.rows[0].last_interaction_at;

    // Old contact should no longer reflect the moved interaction's datetime
    expect(afterC1Last).not.toBe(movedDatetime);

    // New contact should reflect the moved interaction's datetime
    expect(afterC2Last).toBe(movedDatetime);
  });

  test("deleting an interaction recalculates contact's last_interaction_at to next most recent or null", async () => {
    const d1 = '2024-01-01T10:00:00Z';
    const d2 = '2024-06-01T10:00:00Z';
    const d3 = '2024-07-01T10:00:00Z'; // most recent

    const i1 = await interactions.create({
      contact_id: contactId,
      title: 'Oldest',
      interaction_type: 'call',
      datetime: d1
    });
    const i2 = await interactions.create({
      contact_id: contactId,
      title: 'Middle',
      interaction_type: 'email',
      datetime: d2
    });
    const i3 = await interactions.create({
      contact_id: contactId,
      title: 'Latest',
      interaction_type: 'meeting',
      datetime: d3
    });

    // Delete the most recent one
    await interactions.delete(i3.id);

    // After deletion, last_interaction_at should be d2
    const afterDeleteOne = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    expect(afterDeleteOne.rows[0].last_interaction_at).toBe(d2);

    // Delete remaining interactions and expect null
    await interactions.delete(i2.id);
    await interactions.delete(i1.id);

    const afterDeleteAll = await ctx.execute('SELECT last_interaction_at FROM contacts WHERE id = ?', [contactId]);
    expect(afterDeleteAll.rows[0].last_interaction_at || null).toBeNull();
  });

  // Additional utility method tests
  test('getContactInteractionSummary returns summary by type', async () => {
    await interactions.create({
      contact_id: contactId,
      title: 'Call 1',
      interaction_type: 'call',
      duration: 10
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Call 2',
      interaction_type: 'call',
      duration: 20
    });

    await interactions.create({
      contact_id: contactId,
      title: 'Email 1',
      interaction_type: 'email'
    });

    const summary = await interactions.getContactInteractionSummary(contactId);
    expect(summary.length).toBe(2);
    
    const callSummary = summary.find(s => s.interaction_type === 'call');
    expect(callSummary.count).toBe(2);
    expect(callSummary.avg_duration).toBe(15);
    
    const emailSummary = summary.find(s => s.interaction_type === 'email');
    expect(emailSummary.count).toBe(1);
  });

  test('searchInteractions finds interactions by title, note, or contact name', async () => {
    await interactions.create({
      contact_id: contactId,
      title: 'Important meeting',
      interaction_type: 'meeting',
      note: 'Discussed budget'
    });

    await interactions.create({
      contact_id: contact2Id,
      title: 'Follow up call',
      interaction_type: 'call',
      note: 'Quick check-in'
    });

    // Search by title
    const titleResults = await interactions.searchInteractions('important');
    expect(titleResults.length).toBe(1);
    expect(titleResults[0].title).toBe('Important meeting');

    // Search by note
    const noteResults = await interactions.searchInteractions('budget');
    expect(noteResults.length).toBe(1);
    expect(noteResults[0].note).toBe('Discussed budget');

    // Search by contact name
    const contactResults = await interactions.searchInteractions('Jane');
    expect(contactResults.length).toBe(1);
    expect(contactResults[0].title).toBe('Follow up call');
    expect(contactResults[0].display_name).toBe('Jane Smith');
  });

  test('searchInteractions returns empty array for empty query', async () => {
    await interactions.create({
      contact_id: contactId,
      title: 'Test interaction',
      interaction_type: 'call'
    });

    const results = await interactions.searchInteractions('');
    expect(results).toEqual([]);
  });
});
