import initSqlJs from 'sql.js';
import path from 'path';
import { createContactsDB } from '../contacts';
import { createContactsInfoDB } from '../contactsInfo';
import { createCategoriesDB } from '../categories';
import { createCategoriesRelationsDB } from '../categoriesRelations';
import { createCompaniesDB } from '../companies';
import { createEventsDB } from '../events';
import { createEventsRecurringDB } from '../eventsRecurring';
import { createEventsRemindersDB } from '../eventsReminders';
import { createInteractionsDB } from '../interactions';
import { createNotesDB } from '../notes';
import { createAttachmentsDB } from '../attachments';
import { createSettingsDB } from '../settings';
import { DatabaseError } from '../errors';
import { runMigrations } from '../migrations/migrationRunner';

// Test utilities from existing pattern
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
    try {
      await exec('BEGIN TRANSACTION');
      for (const stmt of statements) {
        const result = await exec(stmt.sql, stmt.params || []);
        results.push(result);
      }
      await exec('COMMIT');
      return results;
    } catch (error) {
      try {
        await exec('ROLLBACK');
      } catch (rollbackError) {
        // Log rollback error but throw original error
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  };

  const doTransaction = async (fn) => {
    try {
      await exec('BEGIN TRANSACTION');
      const result = await fn({ execute: exec, batch: doBatch, transaction: doTransaction });
      await exec('COMMIT');
      return result;
    } catch (error) {
      await exec('ROLLBACK');
      throw error;
    }
  };

  return { execute: exec, batch: doBatch, transaction: doTransaction };
}

describe('Database Integration Tests', () => {
  let SQL, db, ctx;
  let contacts, contactsInfo, categories, categoriesRelations, companies, events, eventsRecurring, eventsReminders;
  let interactions, notes, attachments, settings;

  beforeAll(async () => {
    SQL = await initSqlJs({
      locateFile: file => path.resolve(__dirname, '../../../node_modules/sql.js/dist', file)
    });
  });

  beforeEach(async () => {
    db = new SQL.Database();
    ctx = makeCtx(db);
    
    // Run migrations to set up schema
    await runMigrations(ctx);
    
    // Initialize all database modules
    contacts = createContactsDB(ctx);
    contactsInfo = createContactsInfoDB(ctx);
    categories = createCategoriesDB(ctx);
    categoriesRelations = createCategoriesRelationsDB(ctx);
    companies = createCompaniesDB(ctx);
    events = createEventsDB(ctx);
    eventsRecurring = createEventsRecurringDB(ctx);
    eventsReminders = createEventsRemindersDB(ctx);
    interactions = createInteractionsDB(ctx);
    notes = createNotesDB(ctx);
    attachments = createAttachmentsDB(ctx);
    settings = createSettingsDB(ctx);
  });

  afterAll(() => {
    if (db) db.close();
  });

  describe('cross-module contact operations', () => {
    test('creates contact with company, categories, and contact info', async () => {
      // 1. Create a company
      const companyResult = await companies.create({
        name: 'Tech Solutions Inc',
        industry: 'Technology',
        website: 'https://techsolutions.com'
      });
      expect(companyResult.id).toBeDefined();
      
      // Get the full company details
      const company = await companies.getById(companyResult.id);
      expect(company.name).toBe('Tech Solutions Inc');

      // 2. Create categories
      const timestamp = Date.now();
      const workCategory = await categories.create({
        name: `Work Contacts ${timestamp}`,
        color: '#FF6B35',
        icon: 'briefcase'
      });
      
      const vipCategory = await categories.create({
        name: `VIP ${timestamp}`,
        color: '#FFD700',
        icon: 'star'
      });

      // 3. Create contact with company relationship
      const contact = await contacts.create({
        first_name: 'John',
        last_name: 'Doe',
        company_id: companyResult.id,
        job_title: 'Senior Developer'
      });
      expect(contact.id).toBeDefined();
      expect(contact.company_id).toBe(companyResult.id);

      // 4. Add contact info
      const phoneInfo = await contactsInfo.addContactInfo(contact.id, {
        type: 'mobile',
        subtype: 'personal',
        value: '+1-555-0123',
        is_primary: true
      });
      
      const emailInfo = await contactsInfo.addContactInfo(contact.id, {
        type: 'email',
        subtype: 'work',
        value: 'john.doe@techsolutions.com',
        is_primary: true
      });

      // 5. Associate contact with categories
      await categoriesRelations.addContactToCategory(contact.id, workCategory.id);
      await categoriesRelations.addContactToCategory(contact.id, vipCategory.id);

      // 6. Verify complete contact with all relationships
      const fullContact = await contacts.getById(contact.id);
      expect(fullContact).toMatchObject({
        id: contact.id,
        first_name: 'John',
        last_name: 'Doe',
        job_title: 'Senior Developer',
        company_id: companyResult.id
      });

      // 7. Verify contact info
      const contactWithInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(contactWithInfo.contact_info).toHaveLength(2);
      expect(contactWithInfo.contact_info.find(info => info.type === 'mobile')).toMatchObject({
        value: '+1-555-0123',
        is_primary: 1
      });
      expect(contactWithInfo.contact_info.find(info => info.type === 'email')).toMatchObject({
        value: 'john.doe@techsolutions.com',
        is_primary: 1
      });

      // 8. Verify category relationships
      const contactCategories = await categoriesRelations.getCategoriesForContact(contact.id);
      expect(contactCategories).toHaveLength(2);
      expect(contactCategories.map(cat => cat.name)).toContain(`Work Contacts ${timestamp}`);
      expect(contactCategories.map(cat => cat.name)).toContain(`VIP ${timestamp}`);
    });
  });

  describe('events and reminders integration', () => {
    test('creates events with multiple reminders for a contact', async () => {
      // 1. Create contact
      const contact = await contacts.create({
        first_name: 'Jane',
        last_name: 'Smith'
      });

      // 2. Create birthday event
      const birthdayEvent = await events.create({
        contact_id: contact.id,
        title: 'Jane\'s Birthday',
        event_type: 'birthday',
        event_date: '1990-05-15',
        recurring: true,
        recurrence_pattern: 'yearly',
        notes: 'Don\'t forget the cake!'
      });
      expect(birthdayEvent.id).toBeDefined();
      expect(birthdayEvent.recurring).toBe(true);

      // 3. Create multiple reminders
      const reminder1 = await eventsReminders.createReminder({
        event_id: birthdayEvent.id,
        reminder_datetime: '2024-05-14 09:00:00',
        reminder_type: 'notification'
      });

      const reminder2 = await eventsReminders.createReminder({
        event_id: birthdayEvent.id,
        reminder_datetime: '2024-05-15 08:00:00',
        reminder_type: 'notification'
      });

      // 4. Create meeting event
      const meetingEvent = await events.create({
        contact_id: contact.id,
        title: 'Quarterly Review Meeting',
        event_type: 'meeting',
        event_date: '2024-06-15',
        recurring: false,
        notes: 'Discuss Q2 performance'
      });

      const meetingReminder = await eventsReminders.createReminder({
        event_id: meetingEvent.id,
        reminder_datetime: '2024-06-15 08:30:00',
        reminder_type: 'notification'
      });

      // 5. Verify events for contact
      const contactEvents = await events.getByContact(contact.id);
      expect(contactEvents).toHaveLength(2);
      
      const birthday = contactEvents.find(e => e.event_type === 'birthday');
      const meeting = contactEvents.find(e => e.event_type === 'meeting');
      expect(birthday.recurring).toBe(true);
      expect(meeting.recurring).toBe(false);

      // 6. Verify reminders
      const birthdayReminders = await eventsReminders.getEventReminders(birthdayEvent.id);
      expect(birthdayReminders).toHaveLength(2);

      const meetingReminders = await eventsReminders.getEventReminders(meetingEvent.id);
      expect(meetingReminders).toHaveLength(1);

      // 7. Test recurring event calculation
      const nextOccurrence = await eventsRecurring.getNextOccurrence(birthdayEvent.id);
      expect(nextOccurrence).toBeDefined();
    });
  });

  describe('interaction logging and contact updates', () => {
    test('logs interactions and updates last_interaction_at', async () => {
      // 1. Create contact
      const contact = await contacts.create({
        first_name: 'Bob',
        last_name: 'Wilson'
      });
      
      const originalLastInteraction = contact.last_interaction_at;
      expect(originalLastInteraction).toBeNull();

      // 2. Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // 3. Log first interaction
      const interaction1 = await interactions.create({
        contact_id: contact.id,
        title: 'Initial phone call',
        note: 'Discussed project requirements',
        interaction_type: 'call',
        duration: 30
      });
      expect(interaction1.id).toBeDefined();

      // 4. Verify last_interaction_at was updated
      const updatedContact1 = await contacts.getById(contact.id);
      expect(updatedContact1.last_interaction_at).not.toBeNull();
      expect(updatedContact1.last_interaction_at).not.toBe(originalLastInteraction);

      // 5. Wait and log second interaction
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const interaction2 = await interactions.create({
        contact_id: contact.id,
        title: 'Follow-up email',
        note: 'Sent project proposal',
        interaction_type: 'email'
      });

      // 6. Verify last_interaction_at updated again
      const updatedContact2 = await contacts.getById(contact.id);
      expect(new Date(updatedContact2.last_interaction_at).getTime())
        .toBeGreaterThan(new Date(updatedContact1.last_interaction_at).getTime());

      // 7. Verify all interactions are recorded
      const allInteractions = await interactions.getAll({ contactId: contact.id });
      expect(allInteractions).toHaveLength(2);
      expect(allInteractions.map(i => i.interaction_type)).toContain('call');
      expect(allInteractions.map(i => i.interaction_type)).toContain('email');
    });
  });

  describe('cascading deletes', () => {
    test('removes all related data when contact is deleted', async () => {
      // 1. Create contact with full relationships
      const contact = await contacts.create({
        first_name: 'Alice',
        last_name: 'Johnson'
      });

      const category = await categories.create({
        name: `Test Category ${Date.now()}`,
        color: '#FF0000',
        icon: 'test'
      });

      // 2. Create related data
      await contactsInfo.addContactInfo(contact.id, {
        type: 'mobile',
        value: '+1-555-9999'
      });

      await categoriesRelations.addContactToCategory(contact.id, category.id);

      const event = await events.create({
        contact_id: contact.id,
        title: 'Test Event',
        event_type: 'meeting',
        event_date: '2024-07-01'
      });

      await eventsReminders.createReminder({
        event_id: event.id,
        reminder_datetime: '2024-07-01 09:00:00'
      });

      await interactions.create({
        contact_id: contact.id,
        title: 'Test Interaction',
        interaction_type: 'call'
      });

      await notes.create({
        contact_id: contact.id,
        title: 'Test Note',
        content: 'This is a test note'
      });

      await attachments.create({
        entity_type: 'contact',
        entity_id: contact.id,
        file_name: 'test.jpg',
        original_name: 'photo.jpg',
        file_path: '/path/to/test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024
      });

      // 3. Verify data exists
      const contactWithInfoBefore = await contactsInfo.getWithContactInfo(contact.id);
      expect(contactWithInfoBefore.contact_info).toHaveLength(1);
      expect(await events.getByContact(contact.id)).toHaveLength(1);
      expect(await interactions.getAll({ contactId: contact.id })).toHaveLength(1);
      expect(await notes.getAllByContactId(contact.id)).toHaveLength(1);
      expect(await attachments.getByEntity('contact', contact.id)).toHaveLength(1);

      // 4. Delete contact
      await contacts.delete(contact.id);

      // 5. Verify cascading deletes worked
      const contactWithInfoAfter = await contactsInfo.getWithContactInfo(contact.id);
      expect(contactWithInfoAfter).toBeNull(); // Contact should be deleted
      expect(await events.getByContact(contact.id)).toHaveLength(0);
      expect(await interactions.getAll({ contactId: contact.id })).toHaveLength(0);
      expect(await notes.getAllByContactId(contact.id)).toHaveLength(0);
      expect(await attachments.getByEntity('contact', contact.id)).toHaveLength(0);
      
      // 6. Verify category relationship is removed
      const contactsInCategory = await categoriesRelations.getContactsByCategory(category.id);
      expect(contactsInCategory).toHaveLength(0);
    });
  });

  describe('foreign key constraints', () => {
    test('prevents invalid foreign key relationships', async () => {
      // 1. Try to create contact info for non-existent contact
      await expect(contactsInfo.addContactInfo(99999, {
        type: 'mobile',
        value: '+1-555-0000'
      })).rejects.toThrow(DatabaseError);

      // 2. Try to create event for non-existent contact
      await expect(events.create({
        contact_id: 99999,
        title: 'Invalid Event',
        event_type: 'meeting',
        event_date: '2024-01-01'
      })).rejects.toThrow(DatabaseError);

      // 3. Try to create reminder for non-existent event
      await expect(eventsReminders.createReminder({
        event_id: 99999,
        reminder_datetime: '2024-01-01 09:00:00'
      })).rejects.toThrow(DatabaseError);

      // 4. Try to associate contact with non-existent category
      const contact = await contacts.create({
        first_name: 'Test',
        last_name: 'User'
      });

      await expect(categoriesRelations.addContactToCategory(contact.id, 99999))
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('transaction rollbacks', () => {
    test('rolls back transaction on error', async () => {
      const contact = await contacts.create({
        first_name: 'Transaction',
        last_name: 'Test'
      });

      // Verify initial state
      const initialContactInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(initialContactInfo.contact_info).toHaveLength(0);

      // Attempt transaction that should fail
      await expect(ctx.transaction(async (tx) => {
        // This should succeed
        await tx.execute(
          'INSERT INTO contact_info (contact_id, type, subtype, value) VALUES (?, ?, ?, ?)',
          [contact.id, 'mobile', 'personal', '+1-555-1111']
        );

        // This should fail due to constraint violation
        await tx.execute(
          'INSERT INTO contact_info (contact_id, type, subtype, value) VALUES (?, ?, ?, ?)',
          [99999, 'mobile', 'personal', '+1-555-2222'] // Invalid contact_id
        );
      })).rejects.toThrow();

      // Verify transaction was rolled back - no contact info should exist
      const rolledBackContactInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(rolledBackContactInfo.contact_info).toHaveLength(0);
    });

    test('commits successful transaction', async () => {
      const contact = await contacts.create({
        first_name: 'Success',
        last_name: 'Test'
      });

      // Execute successful transaction
      await ctx.transaction(async (tx) => {
        await tx.execute(
          'INSERT INTO contact_info (contact_id, type, subtype, value) VALUES (?, ?, ?, ?)',
          [contact.id, 'mobile', 'personal', '+1-555-3333']
        );

        await tx.execute(
          'INSERT INTO contact_info (contact_id, type, subtype, value) VALUES (?, ?, ?, ?)',
          [contact.id, 'email', 'work', 'test@example.com']
        );
      });

      // Verify transaction was committed
      const committedContactInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(committedContactInfo.contact_info).toHaveLength(2);
      expect(committedContactInfo.contact_info.map(info => info.value)).toContain('+1-555-3333');
      expect(committedContactInfo.contact_info.map(info => info.value)).toContain('test@example.com');
    });
  });

  describe('notes with attachments', () => {
    test('creates and retrieves notes with attachments', async () => {
      // 1. Create contact and note
      const contact = await contacts.create({
        first_name: 'Notes',
        last_name: 'Test'
      });

      const note = await notes.create({
        contact_id: contact.id,
        title: 'Meeting Notes',
        content: 'Important discussion about project timeline',
        is_pinned: true
      });

      // 2. Create attachments for the note
      const attachment1 = await attachments.create({
        entity_type: 'note',
        entity_id: note.id,
        file_name: 'meeting_slides.pdf',
        original_name: 'Q2 Meeting Slides.pdf',
        file_path: '/documents/meeting_slides.pdf',
        file_type: 'document',
        mime_type: 'application/pdf',
        file_size: 2048000,
        description: 'Presentation slides from the meeting'
      });

      const attachment2 = await attachments.create({
        entity_type: 'note',
        entity_id: note.id,
        file_name: 'whiteboard_photo.jpg',
        original_name: 'Whiteboard Photo.jpg',
        file_path: '/images/whiteboard_photo.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1536000,
        thumbnail_path: '/thumbnails/whiteboard_photo_thumb.jpg',
        description: 'Photo of whiteboard diagrams'
      });

      // 3. Verify note exists
      const retrievedNote = await notes.getById(note.id);
      expect(retrievedNote).toMatchObject({
        title: 'Meeting Notes',
        content: 'Important discussion about project timeline',
        is_pinned: true
      });

      // 4. Verify attachments for note
      const noteAttachments = await attachments.getByEntity('note', note.id);
      expect(noteAttachments).toHaveLength(2);

      const pdfAttachment = noteAttachments.find(att => att.file_type === 'document');
      const imageAttachment = noteAttachments.find(att => att.file_type === 'image');

      expect(pdfAttachment).toMatchObject({
        original_name: 'Q2 Meeting Slides.pdf',
        mime_type: 'application/pdf',
        file_size: 2048000
      });

      expect(imageAttachment).toMatchObject({
        original_name: 'Whiteboard Photo.jpg',
        mime_type: 'image/jpeg',
        thumbnail_path: '/thumbnails/whiteboard_photo_thumb.jpg'
      });

      // 5. Test general note (not associated with contact)
      const generalNote = await notes.create({
        contact_id: null,
        title: 'General Reminder',
        content: 'Remember to update the CRM documentation'
      });

      const generalNoteAttachment = await attachments.create({
        entity_type: 'note',
        entity_id: generalNote.id,
        file_name: 'checklist.txt',
        original_name: 'Documentation Checklist.txt',
        file_path: '/documents/checklist.txt',
        file_type: 'document',
        mime_type: 'text/plain',
        file_size: 1024
      });

      // 6. Verify general notes can be retrieved
      const allNotes = await notes.getAll();
      expect(allNotes.length).toBeGreaterThanOrEqual(2);
      
      const generalNotes = allNotes.filter(n => n.contact_id === null);
      expect(generalNotes).toHaveLength(1);
      expect(generalNotes[0].title).toBe('General Reminder');
    });
  });

  describe('settings persistence', () => {
    test('persists settings across sessions', async () => {
      // 1. Set various types of settings
      await settings.set('notifications.enabled', true, 'boolean');
      await settings.set('display.theme', 'dark', 'string');
      await settings.set('backup.interval_hours', 24, 'number');
      
      const complexData = {
        categories: ['work', 'personal'],
        preferences: { autoSync: true, notifications: false }
      };
      await settings.set('user.preferences', complexData, 'json');

      // 2. Retrieve settings individually
      const notificationsEnabled = await settings.get('notifications.enabled');
      expect(notificationsEnabled).toMatchObject({
        key: 'notifications.enabled',
        value: true,
        dataType: 'boolean',
        isEnabled: true,
        isDefault: false
      });

      const theme = await settings.get('display.theme');
      expect(theme.value).toBe('dark');

      const backupInterval = await settings.get('backup.interval_hours');
      expect(backupInterval.value).toBe(24);

      const userPrefs = await settings.get('user.preferences');
      expect(userPrefs.value).toEqual(complexData);

      // 3. Test settings by category
      const notificationSettings = await settings.getByCategory('notifications');
      expect(notificationSettings.length).toBeGreaterThanOrEqual(1);
      
      const enabledSetting = notificationSettings.find(s => s.key === 'notifications.enabled');
      expect(enabledSetting.value).toBe(true);

      // 4. Test setting multiple at once
      const multipleSettings = [
        { key: 'notifications.enabled', value: true, dataType: 'boolean' },
        { key: 'security.timeout_minutes', value: 15, dataType: 'number' },
        { key: 'security.biometric_enabled', value: false, dataType: 'boolean' }
      ];

      const setResults = await settings.setMultiple(multipleSettings);
      expect(setResults).toHaveLength(3);
      expect(setResults.every(result => result.isDefault === false)).toBe(true);

      // 5. Verify all settings exist
      const allSettings = await settings.getAll();
      const settingKeys = allSettings.map(s => s.key);
      
      expect(settingKeys).toContain('notifications.enabled');
      expect(settingKeys).toContain('display.theme');
      expect(settingKeys).toContain('backup.interval_hours');
      expect(settingKeys).toContain('user.preferences');
      expect(settingKeys).toContain('notifications.enabled');

      // 6. Test settings reset to defaults (use a setting that has a default)
      // First set a custom value, then reset to default
      await settings.set('notifications.sound_enabled', false, 'boolean');
      await settings.reset('notifications.sound_enabled');
      const resetSetting = await settings.get('notifications.sound_enabled');
      expect(resetSetting.isDefault).toBe(true);

      // 7. Test toggle functionality
      await settings.set('test.toggle_setting', false, 'boolean');
      let toggleSetting = await settings.get('test.toggle_setting');
      expect(toggleSetting.value).toBe(false);

      await settings.toggle('test.toggle_setting');
      toggleSetting = await settings.get('test.toggle_setting');
      expect(toggleSetting.value).toBe(true);

      // 8. Test increment functionality
      await settings.set('test.counter', 10, 'number');
      await settings.increment('test.counter', 5);
      const counterSetting = await settings.get('test.counter');
      expect(counterSetting.value).toBe(15);
    });

    test('handles default settings correctly', async () => {
      // Test that default settings are returned when not explicitly set
      const defaultSetting = await settings.get('display.contact_sort_order');
      if (defaultSetting) {
        expect(defaultSetting.isDefault).toBe(true);
      }

      // Test that setting a value overrides the default
      await settings.set('display.contact_sort_order', 'last_name', 'string');
      const customSetting = await settings.get('display.contact_sort_order');
      expect(customSetting.isDefault).toBe(false);
      expect(customSetting.value).toBe('last_name');
    });
  });

  describe('complex cross-module scenarios', () => {
    test('handles complete contact lifecycle with all relationships', async () => {
      // 1. Create company
      const companyResult = await companies.create({
        name: 'Integration Test Corp',
        industry: 'Software Testing'
      });
      const company = await companies.getById(companyResult.id);

      // 2. Create categories
      const timestamp2 = Date.now();
      const category1 = await categories.create({ name: `Clients ${timestamp2}`, color: '#00FF00', icon: 'user' });
      const category2 = await categories.create({ name: `Priority ${timestamp2}`, color: '#FF0000', icon: 'star' });

      // 3. Create contact with company
      const contact = await contacts.create({
        first_name: 'Complete',
        last_name: 'Integration',
        company_id: companyResult.id,
        job_title: 'Integration Manager'
      });

      // 4. Add contact info
      await contactsInfo.addContactInfo(contact.id, {
        type: 'mobile',
        value: '+1-555-FULL',
        is_primary: true
      });

      // 5. Associate with categories
      await categoriesRelations.addContactToCategory(contact.id, category1.id);
      await categoriesRelations.addContactToCategory(contact.id, category2.id);

      // 6. Create events
      const event = await events.create({
        contact_id: contact.id,
        title: 'Integration Review',
        event_type: 'meeting',
        event_date: '2024-08-15'
      });

      await eventsReminders.createReminder({
        event_id: event.id,
        reminder_datetime: '2024-08-15 09:00:00'
      });

      // 7. Log interactions
      await interactions.create({
        contact_id: contact.id,
        title: 'Integration Planning Call',
        interaction_type: 'call',
        duration: 45
      });

      // 8. Add notes and attachments
      const note = await notes.create({
        contact_id: contact.id,
        title: 'Integration Requirements',
        content: 'Key requirements for the integration project'
      });

      await attachments.create({
        entity_type: 'note',
        entity_id: note.id,
        file_name: 'requirements.pdf',
        original_name: 'Integration Requirements.pdf',
        file_path: '/docs/requirements.pdf',
        file_type: 'document',
        mime_type: 'application/pdf',
        file_size: 512000
      });

      // 9. Verify complete data integrity
      const fullContact = await contacts.getById(contact.id);
      expect(fullContact.first_name).toBe('Complete');
      expect(fullContact.company_id).toBe(companyResult.id);

      const contactInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(contactInfo.contact_info).toHaveLength(1);

      const contactCategories = await categoriesRelations.getCategoriesForContact(contact.id);
      expect(contactCategories).toHaveLength(2);

      const contactEvents = await events.getByContact(contact.id);
      expect(contactEvents).toHaveLength(1);

      const contactInteractions = await interactions.getAll({ contactId: contact.id });
      expect(contactInteractions).toHaveLength(1);
      expect(contactInteractions[0].duration).toBe(45);

      const contactNotes = await notes.getAllByContactId(contact.id);
      expect(contactNotes).toHaveLength(1);

      const noteAttachments = await attachments.getByEntity('note', note.id);
      expect(noteAttachments).toHaveLength(1);

      // 10. Test final cleanup - delete contact and verify cascade
      await contacts.delete(contact.id);

      const finalContactInfo = await contactsInfo.getWithContactInfo(contact.id);
      expect(finalContactInfo).toBeNull(); // Contact deleted, so should return null
      expect(await events.getByContact(contact.id)).toHaveLength(0);
      expect(await interactions.getAll({ contactId: contact.id })).toHaveLength(0);
      expect(await notes.getAllByContactId(contact.id)).toHaveLength(0);
      
      // Categories should still exist but with no contact relationships
      const clientsCategory = await categories.getById(category1.id);
      expect(clientsCategory).toBeDefined();
      
      const contactsInCategory = await categoriesRelations.getContactsByCategory(category1.id);
      expect(contactsInCategory).toHaveLength(0);
    });
  });
});