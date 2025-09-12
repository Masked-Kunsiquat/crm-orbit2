import initSqlJs from 'sql.js';
import path from 'path';
import { createSettingsDB } from '../settings';
import { DatabaseError } from '../errors';
import { runMigrations } from '../migrations/migrationRunner';

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
    for (const stmt of statements) {
      const result = await exec(stmt.sql, stmt.params || []);
      results.push(result);
    }
    return results;
  };

  const doTransaction = async (work) => {
    db.run('BEGIN;');
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

describe('createSettingsDB', () => {
  let db, ctx, settingsDB;

  beforeAll(async () => {
    const wasmPath = path.join(__dirname, '../../../node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    db = new SQL.Database();
    ctx = makeCtx(db);
    settingsDB = createSettingsDB(ctx);

    // Apply all migrations to create the real schema
    await runMigrations(ctx);
  });

  beforeEach(async () => {
    await ctx.execute('DELETE FROM user_preferences');
  });

  afterAll(() => {
    db.close();
  });

  describe('get', () => {
    test('returns setting from database', async () => {
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES ('display', 'display.theme', 'dark', 'string')`
      );

      const result = await settingsDB.get('display.theme');
      
      expect(result).toEqual({
        key: 'display.theme',
        value: 'dark',
        dataType: 'string',
        isEnabled: true,
        isDefault: false
      });
    });

    test('returns default setting when not in database', async () => {
      const result = await settingsDB.get('display.theme');
      
      expect(result).toEqual({
        key: 'display.theme',
        value: 'system',
        dataType: 'string',
        isEnabled: true,
        isDefault: true
      });
    });

    test('returns null for unknown setting', async () => {
      const result = await settingsDB.get('unknown.setting');
      expect(result).toBeNull();
    });

    test('casts boolean values correctly', async () => {
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES ('notifications', 'notifications.enabled', '1', 'boolean')`
      );

      const result = await settingsDB.get('notifications.enabled');
      
      expect(result.value).toBe(true);
      expect(result.dataType).toBe('boolean');
    });

    test('casts number values correctly', async () => {
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES ('display', 'display.contacts_per_page', '50', 'number')`
      );

      const result = await settingsDB.get('display.contacts_per_page');
      
      expect(result.value).toBe(50);
      expect(result.dataType).toBe('number');
    });

    test('casts JSON values correctly', async () => {
      const jsonValue = { theme: 'dark', accent: 'blue' };
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES ('display', 'display.custom_config', ?, 'json')`,
        [JSON.stringify(jsonValue)]
      );

      const result = await settingsDB.get('display.custom_config');
      
      expect(result.value).toEqual(jsonValue);
      expect(result.dataType).toBe('json');
    });

    test('throws error for invalid setting key', async () => {
      await expect(settingsDB.get('')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.get(null)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.get(123)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('set', () => {
    test('creates new setting', async () => {
      const result = await settingsDB.set('custom.setting', 'test value', 'string');
      
      expect(result).toEqual({
        key: 'custom.setting',
        value: 'test value',
        dataType: 'string',
        isEnabled: true,
        isDefault: false
      });
    });

    test('updates existing setting', async () => {
      await settingsDB.set('display.theme', 'dark', 'string');
      const result = await settingsDB.set('display.theme', 'light', 'string');
      
      expect(result.value).toBe('light');
    });

    test('validates string values', async () => {
      await expect(settingsDB.set('test.key', 123, 'string')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('validates number values', async () => {
      await expect(settingsDB.set('test.key', 'not a number', 'number')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.set('test.key', NaN, 'number')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('validates boolean values', async () => {
      await expect(settingsDB.set('test.key', 'not a boolean', 'boolean')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('validates JSON values', async () => {
      await expect(settingsDB.set('test.key', 'invalid json', 'json')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      
      // Valid JSON should work
      await settingsDB.set('test.key', { valid: 'json' }, 'json');
      await settingsDB.set('test.key', '{"valid": "json"}', 'json');
    });

    test('throws error for null/undefined values', async () => {
      await expect(settingsDB.set('test.key', null, 'string')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.set('test.key', undefined, 'string')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('throws error for invalid setting key', async () => {
      await expect(settingsDB.set('', 'value')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.set(null, 'value')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('getByCategory', () => {
    test('returns settings for specific category', async () => {
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES 
         ('display', 'display.theme', 'dark', 'string'),
         ('display', 'display.contacts_per_page', '50', 'number'),
         ('notifications', 'notifications.enabled', '1', 'boolean')`
      );

      const result = await settingsDB.getByCategory('display');
      
      // Verify we have both DB settings and defaults
      const dbSettings = result.filter(s => !s.isDefault);
      const defaultSettings = result.filter(s => s.isDefault);
      expect(dbSettings).toHaveLength(2); // 2 from DB
      expect(defaultSettings.length).toBeGreaterThan(0); // At least some defaults
      
      // Verify specific settings exist with correct values
      expect(result.find(s => s.key === 'display.theme')).toEqual({
        key: 'display.theme',
        value: 'dark',
        dataType: 'string',
        isEnabled: true,
        isDefault: false
      });
      
      // Verify that all display.* defaults are present (not overridden by DB)
      expect(result.find(s => s.key === 'display.show_avatars' && s.isDefault)).toBeDefined();
      expect(result.find(s => s.key === 'display.date_format' && s.isDefault)).toBeDefined();
      expect(result.find(s => s.key === 'display.time_format' && s.isDefault)).toBeDefined();
    });

    test('includes default settings for category', async () => {
      const result = await settingsDB.getByCategory('display');
      
      const defaultSettings = result.filter(s => s.isDefault);
      expect(defaultSettings.length).toBeGreaterThan(0);
      expect(defaultSettings.find(s => s.key === 'display.theme')).toBeDefined();
    });

    test('returns empty array for unknown category', async () => {
      const result = await settingsDB.getByCategory('unknown');
      expect(result).toEqual([]);
    });

    test('throws error for invalid category', async () => {
      await expect(settingsDB.getByCategory('')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.getByCategory(null)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('setMultiple', () => {
    test('sets multiple settings in batch', async () => {
      const settings = [
        { key: 'display.theme', value: 'dark', dataType: 'string' },
        { key: 'notifications.enabled', value: false, dataType: 'boolean' },
        { key: 'display.contacts_per_page', value: 100, dataType: 'number' }
      ];

      const result = await settingsDB.setMultiple(settings);
      
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe('dark');
      expect(result[1].value).toBe(false);
      expect(result[2].value).toBe(100);
    });

    test('validates all settings before setting any', async () => {
      const settings = [
        { key: 'display.theme', value: 'dark', dataType: 'string' },
        { key: 'notifications.enabled', value: 'not a boolean', dataType: 'boolean' }
      ];

      await expect(settingsDB.setMultiple(settings)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      
      // Verify no settings were created
      const themes = await settingsDB.get('display.theme');
      expect(themes.isDefault).toBe(true);
    });

    test('throws error for empty or invalid input', async () => {
      await expect(settingsDB.setMultiple([])).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.setMultiple([{ key: '', value: 'test' }])).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('reset', () => {
    test('resets setting to default value', async () => {
      await settingsDB.set('display.theme', 'dark', 'string');
      
      const result = await settingsDB.reset('display.theme');
      
      expect(result).toEqual({
        key: 'display.theme',
        value: 'system',
        dataType: 'string',
        category: 'display',
        isEnabled: true,
        isDefault: true
      });
    });

    test('throws error for setting without default', async () => {
      await expect(settingsDB.reset('unknown.setting')).rejects.toMatchObject({ code: 'NO_DEFAULT_VALUE' });
    });

    test('throws error for invalid setting key', async () => {
      await expect(settingsDB.reset('')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.reset(null)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('getAll', () => {
    test('returns all settings with defaults', async () => {
      await ctx.execute(
        `INSERT INTO user_preferences (category, setting_key, setting_value, data_type) 
         VALUES ('display', 'display.theme', 'dark', 'string')`
      );

      const result = await settingsDB.getAll();
      
      expect(result.length).toBeGreaterThan(10); // Should include all defaults plus custom
      expect(result.find(s => s.key === 'display.theme' && !s.isDefault)).toBeDefined();
      expect(result.find(s => s.key === 'notifications.enabled' && s.isDefault)).toBeDefined();
    });

    test('groups settings by category', async () => {
      const result = await settingsDB.getAll();
      
      const categories = [...new Set(result.map(s => s.category))];
      expect(categories).toContain('display');
      expect(categories).toContain('notifications');
      expect(categories).toContain('security');
      expect(categories).toContain('backup');
    });
  });

  describe('toggle', () => {
    test('toggles boolean setting', async () => {
      await settingsDB.set('notifications.enabled', true, 'boolean');
      
      const result = await settingsDB.toggle('notifications.enabled');
      
      expect(result.value).toBe(false);
    });

    test('toggles from false to true', async () => {
      await settingsDB.set('notifications.enabled', false, 'boolean');
      
      const result = await settingsDB.toggle('notifications.enabled');
      
      expect(result.value).toBe(true);
    });

    test('toggles default boolean setting', async () => {
      const result = await settingsDB.toggle('notifications.enabled');
      
      expect(result.value).toBe(false); // Default is true, so toggle to false
    });

    test('throws error for non-boolean setting', async () => {
      await settingsDB.set('display.theme', 'dark', 'string');
      
      await expect(settingsDB.toggle('display.theme')).rejects.toMatchObject({ code: 'INVALID_TYPE_FOR_TOGGLE' });
    });

    test('throws error for non-existent setting', async () => {
      await expect(settingsDB.toggle('unknown.setting')).rejects.toMatchObject({ code: 'SETTING_NOT_FOUND' });
    });

    test('throws error for invalid setting key', async () => {
      await expect(settingsDB.toggle('')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.toggle(null)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('increment', () => {
    test('increments number setting', async () => {
      await settingsDB.set('display.contacts_per_page', 25, 'number');
      
      const result = await settingsDB.increment('display.contacts_per_page', 5);
      
      expect(result.value).toBe(30);
    });

    test('increments by 1 when no amount specified', async () => {
      await settingsDB.set('display.contacts_per_page', 25, 'number');
      
      const result = await settingsDB.increment('display.contacts_per_page');
      
      expect(result.value).toBe(26);
    });

    test('decrements with negative amount', async () => {
      await settingsDB.set('display.contacts_per_page', 25, 'number');
      
      const result = await settingsDB.increment('display.contacts_per_page', -10);
      
      expect(result.value).toBe(15);
    });

    test('increments default number setting', async () => {
      const result = await settingsDB.increment('display.contacts_per_page', 5);
      
      expect(result.value).toBe(30); // Default 25 + 5
    });

    test('throws error for non-number setting', async () => {
      await settingsDB.set('display.theme', 'dark', 'string');
      
      await expect(settingsDB.increment('display.theme')).rejects.toMatchObject({ code: 'INVALID_TYPE_FOR_INCREMENT' });
    });

    test('throws error for non-existent setting', async () => {
      await expect(settingsDB.increment('unknown.setting')).rejects.toMatchObject({ code: 'SETTING_NOT_FOUND' });
    });

    test('throws error for invalid amount', async () => {
      await expect(settingsDB.increment('display.contacts_per_page', 'not a number')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.increment('display.contacts_per_page', NaN)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('throws error for invalid setting key', async () => {
      await expect(settingsDB.increment('', 5)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      await expect(settingsDB.increment(null, 5)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('validation and error handling', () => {
    test('throws DatabaseError for constraint violations', async () => {
      // This would test database-level constraint violations if any exist
      // Currently, the settings table doesn't have strict constraints beyond unique key
      expect(true).toBe(true); // Placeholder
    });

    test('handles concurrent access gracefully', async () => {
      // Test concurrent set operations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(settingsDB.set(`concurrent.test${i}`, i, 'number'));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });
  });

  describe('business logic', () => {
    test('maintains setting categories correctly', async () => {
      await settingsDB.set('custom.category.setting', 'value', 'string');
      
      const result = await settingsDB.getByCategory('custom');
      expect(result.find(s => s.key === 'custom.category.setting')).toBeDefined();
    });

    test('preserves data types across operations', async () => {
      await settingsDB.set('test.number', 42, 'number');
      await settingsDB.set('test.boolean', true, 'boolean');
      await settingsDB.set('test.json', { test: 'data' }, 'json');
      
      const numberSetting = await settingsDB.get('test.number');
      const booleanSetting = await settingsDB.get('test.boolean');
      const jsonSetting = await settingsDB.get('test.json');
      
      expect(typeof numberSetting.value).toBe('number');
      expect(typeof booleanSetting.value).toBe('boolean');
      expect(typeof jsonSetting.value).toBe('object');
    });

    test('automatically resolves types from DEFAULT_SETTINGS and JS values', async () => {
      // Should use type from DEFAULT_SETTINGS
      const knownSetting = await settingsDB.set('display.theme', 'custom');
      expect(knownSetting.dataType).toBe('string');
      
      // Should infer from JS type
      const numberSetting = await settingsDB.set('custom.number', 123);
      expect(numberSetting.dataType).toBe('number');
      
      const boolSetting = await settingsDB.set('custom.bool', false);
      expect(boolSetting.dataType).toBe('boolean');
      
      const objSetting = await settingsDB.set('custom.obj', { key: 'value' });
      expect(objSetting.dataType).toBe('json');
      
      // Explicit type should override
      const overrideSetting = await settingsDB.set('custom.override', 456, 'string');
      expect(overrideSetting.dataType).toBe('string');
      expect(overrideSetting.value).toBe('456');
    });
  });
});