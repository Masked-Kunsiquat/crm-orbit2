// events.test.js
// Comprehensive unit tests for eventsDB using an in-memory SQLite database.
// Uses sql.js (pure WASM) to avoid native builds.
import initSqlJs from 'sql.js';
import path from 'path';
import { createEventsDB } from '../events';
import { createEventsRecurringDB } from '../eventsRecurring';
import { createEventsRemindersDB } from '../eventsReminders';

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

  // Create events table
  run(`CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    recurring BOOLEAN DEFAULT 0,
    recurrence_pattern TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
  );`);

  // Create event_reminders table
  run(`CREATE TABLE event_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    reminder_datetime DATETIME NOT NULL,
    reminder_type TEXT DEFAULT 'notification',
    is_sent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
  );`);

  // Create indexes
  run(`CREATE INDEX IF NOT EXISTS idx_events_contact ON events(contact_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);`);
  run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);`);
  run(`CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);`);
  run(`CREATE INDEX IF NOT EXISTS idx_event_reminders_datetime ON event_reminders(reminder_datetime);`);
}

describe('eventsDB (in-memory)', () => {
  let SQL;
  let db;
  let ctx;
  let events;
  let eventsRecurring;
  let eventsReminders;
  let contactId;

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
    events = createEventsDB(ctx);
    eventsRecurring = createEventsRecurringDB(ctx);
    eventsReminders = createEventsRemindersDB(ctx);
    
    // Create a test contact
    const contactRes = await ctx.execute(
      'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?)',
      ['John', 'Doe', 'John Doe']
    );
    contactId = contactRes.insertId;
  });

  afterEach(() => {
    try { db.close(); } catch (_) {}
  });

  // Core CRUD tests
  test('create rejects without required fields', async () => {
    await expect(events.create({}))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await expect(events.create({ contact_id: contactId }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    await expect(events.create({ contact_id: contactId, title: 'Test' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('create event and fetch by id', async () => {
    const eventData = {
      contact_id: contactId,
      title: 'Birthday Party',
      event_type: 'birthday',
      event_date: '2024-06-15',
      notes: 'Surprise party'
    };
    
    const created = await events.create(eventData);
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('Birthday Party');
    expect(created.event_type).toBe('birthday');
    expect(created.event_date).toBe('2024-06-15');
    expect(created.notes).toBe('Surprise party');

    const found = await events.getById(created.id);
    expect(found.title).toBe('Birthday Party');
    expect(found.contact_id).toBe(contactId);
  });

  test('create recurring event', async () => {
    const eventData = {
      contact_id: contactId,
      title: 'Annual Review',
      event_type: 'meeting',
      event_date: '2024-12-01',
      recurring: 1,
      recurrence_pattern: 'yearly'
    };
    
    const created = await events.create(eventData);
    expect(created.recurring).toBe(true);
    expect(created.recurrence_pattern).toBe('yearly');
  });

  test('update event', async () => {
    const created = await events.create({
      contact_id: contactId,
      title: 'Original Title',
      event_type: 'meeting',
      event_date: '2024-06-15'
    });

    const updated = await events.update(created.id, {
      title: 'Updated Title',
      notes: 'Added notes'
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.notes).toBe('Added notes');
    expect(updated.event_type).toBe('meeting'); // Unchanged
  });

  test('update non-existent event throws error', async () => {
    await expect(events.update(9999, { title: 'Test' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('delete event', async () => {
    const created = await events.create({
      contact_id: contactId,
      title: 'To Delete',
      event_type: 'meeting',
      event_date: '2024-06-15'
    });

    const rowsAffected = await events.delete(created.id);
    expect(rowsAffected).toBe(1);

    const found = await events.getById(created.id);
    expect(found).toBeNull();
  });

  test('getAll returns events with pagination', async () => {
    // Create multiple events
    for (let i = 0; i < 5; i++) {
      await events.create({
        contact_id: contactId,
        title: `Event ${i}`,
        event_type: 'meeting',
        event_date: `2024-06-${String(i + 10).padStart(2, '0')}`
      });
    }

    const all = await events.getAll({ limit: 3 });
    expect(all.length).toBe(3);

    const page2 = await events.getAll({ limit: 3, offset: 3 });
    expect(page2.length).toBe(2);
  });

  // Search & Filter tests
  test('getByContact returns contact events only', async () => {
    // Create second contact
    const contact2Res = await ctx.execute(
      'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?)',
      ['Jane', 'Smith', 'Jane Smith']
    );
    const contact2Id = contact2Res.insertId;

    // Create events for both contacts
    await events.create({
      contact_id: contactId,
      title: 'John Event',
      event_type: 'meeting',
      event_date: '2024-06-15'
    });

    await events.create({
      contact_id: contact2Id,
      title: 'Jane Event',
      event_type: 'meeting',
      event_date: '2024-06-16'
    });

    const johnEvents = await events.getByContact(contactId);
    expect(johnEvents.length).toBe(1);
    expect(johnEvents[0].title).toBe('John Event');

    const janeEvents = await events.getByContact(contact2Id);
    expect(janeEvents.length).toBe(1);
    expect(janeEvents[0].title).toBe('Jane Event');
  });

  test('getUpcoming returns future events within date range', async () => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + 15);
    const farFuture = new Date(today);
    farFuture.setDate(today.getDate() + 50);

    // Create events at different dates
    await events.create({
      contact_id: contactId,
      title: 'Upcoming Event',
      event_type: 'meeting',
      event_date: future.toISOString().split('T')[0]
    });

    await events.create({
      contact_id: contactId,
      title: 'Far Future Event',
      event_type: 'meeting',
      event_date: farFuture.toISOString().split('T')[0]
    });

    const upcoming = await events.getUpcoming({ days: 30 });
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].title).toBe('Upcoming Event');
  });

  test('getPast returns past events within date range', async () => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(today.getDate() - 10);
    const farPast = new Date(today);
    farPast.setDate(today.getDate() - 50);

    await events.create({
      contact_id: contactId,
      title: 'Recent Past Event',
      event_type: 'meeting',
      event_date: past.toISOString().split('T')[0]
    });

    await events.create({
      contact_id: contactId,
      title: 'Far Past Event',
      event_type: 'meeting',
      event_date: farPast.toISOString().split('T')[0]
    });

    const recent = await events.getPast({ days: 30 });
    expect(recent.length).toBe(1);
    expect(recent[0].title).toBe('Recent Past Event');
  });

  test('getByDateRange returns events in specified range', async () => {
    const startDate = '2024-06-01';
    const endDate = '2024-06-30';
    
    await events.create({
      contact_id: contactId,
      title: 'June Event',
      event_type: 'meeting',
      event_date: '2024-06-15'
    });

    await events.create({
      contact_id: contactId,
      title: 'July Event',
      event_type: 'meeting',
      event_date: '2024-07-15'
    });

    const juneEvents = await events.getByDateRange(startDate, endDate);
    expect(juneEvents.length).toBe(1);
    expect(juneEvents[0].title).toBe('June Event');
  });

  // Event with reminders tests
  test('createWithReminders creates event with reminders atomically', async () => {
    const eventData = {
      contact_id: contactId,
      title: 'Meeting with Reminders',
      event_type: 'meeting',
      event_date: '2024-06-15'
    };

    const reminders = [
      {
        reminder_datetime: '2024-06-14 10:00:00',
        reminder_type: 'notification'
      },
      {
        reminder_datetime: '2024-06-15 09:00:00',
        reminder_type: 'email'
      }
    ];

    const result = await eventsReminders.createEventWithReminders(eventData, reminders);
    expect(result.title).toBe('Meeting with Reminders');
    expect(result.reminders.length).toBe(2);
    expect(result.reminders[0].reminder_type).toBe('notification');
    expect(result.reminders[1].reminder_type).toBe('email');
  });

  test('updateReminders replaces all reminders for event', async () => {
    // Create event first
    const created = await events.create({
      contact_id: contactId,
      title: 'Test Event',
      event_type: 'meeting',
      event_date: '2024-06-15'
    });

    // Add initial reminders
    await eventsReminders.updateEventReminders(created.id, [
      { reminder_datetime: '2024-06-14 10:00:00', reminder_type: 'notification' }
    ]);

    // Update with new reminders
    const newReminders = [
      { reminder_datetime: '2024-06-14 09:00:00', reminder_type: 'email' },
      { reminder_datetime: '2024-06-15 08:00:00', reminder_type: 'sms' }
    ];

    const updated = await eventsReminders.updateEventReminders(created.id, newReminders);
    expect(updated.length).toBe(2);
    expect(updated[0].reminder_type).toBe('email');
    expect(updated[1].reminder_type).toBe('sms');
  });

  test('updateReminders for non-existent event throws error', async () => {
    await expect(eventsReminders.updateEventReminders(9999, []))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // Recurring event tests
  test('getNextOccurrence calculates next yearly occurrence', async () => {
    const birthdayEvent = await events.create({
      contact_id: contactId,
      title: 'John Birthday',
      event_type: 'birthday',
      event_date: '1990-06-15',
      recurring: 1,
      recurrence_pattern: 'yearly'
    });

    const nextOccurrence = await eventsRecurring.getNextOccurrence(birthdayEvent.id, '2024-01-01');
    expect(nextOccurrence.event_date).toBe('2024-06-15');
    expect(nextOccurrence.is_calculated).toBe(true);

    // If past this year's date, should return next year
    const nextOccurrence2 = await eventsRecurring.getNextOccurrence(birthdayEvent.id, '2024-07-01');
    expect(nextOccurrence2.event_date).toBe('2025-06-15');
  });

  test('getNextOccurrence returns null for non-recurring events', async () => {
    const normalEvent = await events.create({
      contact_id: contactId,
      title: 'One-time Meeting',
      event_type: 'meeting',
      event_date: '2024-06-15',
      recurring: 0
    });

    const nextOccurrence = await eventsRecurring.getNextOccurrence(normalEvent.id);
    expect(nextOccurrence).toBeNull();
  });

  // Birthday-specific tests
  test('getTodaysBirthdays returns birthdays for current date', async () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayBirthday = `1990-${month}-${day}`;

    await events.create({
      contact_id: contactId,
      title: 'John Birthday',
      event_type: 'birthday',
      event_date: todayBirthday
    });

    await events.create({
      contact_id: contactId,
      title: 'Different Day Birthday',
      event_type: 'birthday',
      event_date: '1990-01-01'
    });

    const todaysBirthdays = await eventsRecurring.getTodaysBirthdays();
    expect(todaysBirthdays.length).toBe(1);
    expect(todaysBirthdays[0].title).toBe('John Birthday');
    expect(todaysBirthdays[0].first_name).toBe('John');
  });

  test('getUpcomingBirthdays returns birthdays within specified days', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create birthday 10 days from now
    const future = new Date(today);
    future.setDate(today.getDate() + 10);
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    const futureBirthday = `1990-${month}-${day}`;

    await events.create({
      contact_id: contactId,
      title: 'John Birthday',
      event_type: 'birthday',
      event_date: futureBirthday
    });

    const upcomingBirthdays = await eventsRecurring.getUpcomingBirthdays(15);
    expect(upcomingBirthdays.length).toBe(1);
    expect(upcomingBirthdays[0].title).toBe('John Birthday');
    expect(upcomingBirthdays[0].days_until).toBe(10);
    expect(upcomingBirthdays[0].next_occurrence).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
