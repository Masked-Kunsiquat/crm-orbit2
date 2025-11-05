import { DatabaseError, logger } from '../errors';
import {
  DEFAULT_SETTINGS,
  validateSettingValue,
  castValue,
  serializeValue,
} from './settingsHelpers';

export function createSettingsDB({ execute, batch, transaction }) {
  return {
    async get(settingKey) {
      // Enforce hierarchical key and derive category
      const validateSettingKey = k => {
        if (typeof k !== 'string' || !k.includes('.')) {
          throw new DatabaseError(
            'Setting keys must be "category.key"',
            'VALIDATION_ERROR',
            null,
            { settingKey: k }
          );
        }
        const [cat, sub] = k.split('.');
        if (!cat || !sub) {
          throw new DatabaseError(
            'Setting keys must be "category.key"',
            'VALIDATION_ERROR',
            null,
            { settingKey: k }
          );
        }
        return cat;
      };

      const sql = `
        SELECT setting_key, setting_value, data_type, is_enabled, category
        FROM user_preferences
        WHERE category = ? AND setting_key = ?
      `;

      try {
        const category = validateSettingKey(settingKey);
        const result = await execute(sql, [category, settingKey]);

        if (result.rows.length === 0) {
          const defaultSetting = DEFAULT_SETTINGS[settingKey];
          if (defaultSetting) {
            logger.success('SettingsDB', 'get', { settingKey, isDefault: true });
            return {
              key: settingKey,
              value: defaultSetting.value,
              dataType: defaultSetting.type,
              isEnabled: true,
              isDefault: true,
            };
          }
          logger.success('SettingsDB', 'get', { settingKey, found: false });
          return null;
        }

        const row = result.rows[0];
        const castedValue = castValue(row.setting_value, row.data_type);

        logger.success('SettingsDB', 'get', { settingKey });
        return {
          key: row.setting_key,
          value: castedValue,
          dataType: row.data_type,
          isEnabled:
            row.is_enabled === 1 ||
            row.is_enabled === '1' ||
            row.is_enabled === 't' ||
            row.is_enabled === 'true' ||
            row.is_enabled === true,
          isDefault: false,
        };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'get', error, { settingKey });
        throw new DatabaseError(
          'Failed to get setting',
          'GET_SETTING_FAILED',
          error,
          { settingKey }
        );
      }
    },

    async set(settingKey, value, dataType = null) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError(
          'Setting key must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      // Validate hierarchical key format
      if (!settingKey.includes('.')) {
        throw new DatabaseError(
          'Setting keys must be "category.key"',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }
      const category = settingKey.substring(0, settingKey.indexOf('.'));
      if (!category) {
        throw new DatabaseError(
          'Setting keys must be "category.key"',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      // Resolve data type automatically if not provided
      let resolvedType = dataType;
      const defaultType = DEFAULT_SETTINGS[settingKey]?.type;
      if (dataType && defaultType && defaultType !== dataType) {
        throw new DatabaseError(
          `Data type '${dataType}' conflicts with default type '${defaultType}' for setting '${settingKey}'`,
          'TYPE_CONFLICT_ERROR',
          null,
          { settingKey, providedType: dataType, defaultType }
        );
      }
      if (!resolvedType) {
        // First, check if we have a default setting with a known type
        if (defaultType) {
          resolvedType = defaultType;
        } else {
          // Fallback to JS type inference
          const jsType = typeof value;
          switch (jsType) {
            case 'number':
              resolvedType = 'number';
              break;
            case 'boolean':
              resolvedType = 'boolean';
              break;
            case 'object':
              resolvedType = value === null ? 'string' : 'json';
              break;
            case 'string':
            default:
              resolvedType = 'string';
              break;
          }
        }
      }

      validateSettingValue(settingKey, value, resolvedType);
      const serializedValue = serializeValue(value, resolvedType);

      const sql = `
        INSERT INTO user_preferences (category, setting_key, setting_value, data_type, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(category, setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          data_type = excluded.data_type,
          updated_at = CURRENT_TIMESTAMP
      `;

      try {
        await execute(sql, [
          category,
          settingKey,
          serializedValue,
          resolvedType,
        ]);

        const setting = await this.get(settingKey);
        logger.success('SettingsDB', 'set', { settingKey });
        return setting;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'set', error, { settingKey, value });
        throw new DatabaseError(
          'Failed to set setting',
          'SET_SETTING_FAILED',
          error,
          { settingKey, value }
        );
      }
    },

    async getByCategory(category) {
      if (!category || typeof category !== 'string') {
        throw new DatabaseError(
          'Category must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { category }
        );
      }

      const sql = `
        SELECT setting_key, setting_value, data_type, is_enabled
        FROM user_preferences
        WHERE category = ?
        ORDER BY setting_key
      `;

      try {
        const result = await execute(sql, [category]);

        const settings = result.rows.map(row => ({
          key: row.setting_key,
          value: castValue(row.setting_value, row.data_type),
          dataType: row.data_type,
          isEnabled:
            row.is_enabled === 1 ||
            row.is_enabled === '1' ||
            row.is_enabled === 't' ||
            row.is_enabled === 'true' ||
            row.is_enabled === true,
          isDefault: false,
        }));

        const defaults = Object.entries(DEFAULT_SETTINGS)
          .filter(([key]) => key.startsWith(category + '.'))
          .filter(([key]) => !result.rows.some(row => row.setting_key === key))
          .map(([key, config]) => ({
            key,
            value: config.value,
            dataType: config.type,
            isEnabled: true,
            isDefault: true,
          }));

        const allSettings = [...settings, ...defaults].sort((a, b) =>
          a.key.localeCompare(b.key)
        );
        logger.success('SettingsDB', 'getByCategory', { category, count: allSettings.length });
        return allSettings;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'getByCategory', error, { category });
        throw new DatabaseError(
          'Failed to get settings by category',
          'GET_CATEGORY_FAILED',
          error,
          { category }
        );
      }
    },

    async setMultiple(settings) {
      if (!Array.isArray(settings) || settings.length === 0) {
        throw new DatabaseError(
          'Settings must be a non-empty array',
          'VALIDATION_ERROR',
          null,
          { settings }
        );
      }

      for (const setting of settings) {
        if (!setting.key || typeof setting.key !== 'string') {
          throw new DatabaseError(
            'Each setting must have a valid key',
            'VALIDATION_ERROR',
            null,
            { setting }
          );
        }
        if (
          !setting.key.includes('.') ||
          setting.key.split('.').some(p => !p)
        ) {
          throw new DatabaseError(
            'Setting keys must be "category.key"',
            'VALIDATION_ERROR',
            null,
            { settingKey: setting.key }
          );
        }

        // Resolve data type if not provided
        let resolvedType = setting.dataType;
        if (!resolvedType) {
          // First, check if we have a default setting with a known type
          const defaultSetting = DEFAULT_SETTINGS[setting.key];
          if (defaultSetting?.type) {
            resolvedType = defaultSetting.type;
          } else {
            // Fallback to JS type inference
            const jsType = typeof setting.value;
            switch (jsType) {
              case 'number':
                resolvedType = 'number';
                break;
              case 'boolean':
                resolvedType = 'boolean';
                break;
              case 'object':
                resolvedType = setting.value === null ? 'string' : 'json';
                break;
              case 'string':
              default:
                resolvedType = 'string';
                break;
            }
          }
          setting.dataType = resolvedType; // Update the setting object
        } else {
          // If explicit dataType is provided, check for conflicts with defaults
          const defaultSetting = DEFAULT_SETTINGS[setting.key];
          if (
            defaultSetting?.type &&
            defaultSetting.type !== setting.dataType
          ) {
            throw new DatabaseError(
              `Data type '${setting.dataType}' conflicts with default type '${defaultSetting.type}' for setting '${setting.key}'`,
              'TYPE_CONFLICT_ERROR',
              null,
              {
                settingKey: setting.key,
                providedType: setting.dataType,
                defaultType: defaultSetting.type,
              }
            );
          }
        }

        validateSettingValue(setting.key, setting.value, setting.dataType);
      }

      const statements = settings.map(setting => {
        const category = setting.key.split('.')[0] || 'general';
        const serializedValue = serializeValue(setting.value, setting.dataType);

        return {
          sql: `
            INSERT INTO user_preferences (category, setting_key, setting_value, data_type, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(category, setting_key) DO UPDATE SET
              setting_value = excluded.setting_value,
              data_type = excluded.data_type,
              updated_at = CURRENT_TIMESTAMP
          `,
          params: [category, setting.key, serializedValue, setting.dataType],
        };
      });

      try {
        await batch(statements);

        const result = await Promise.all(settings.map(s => this.get(s.key)));
        logger.success('SettingsDB', 'setMultiple', { count: settings.length });
        return result;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'setMultiple', error, { count: settings.length });
        throw new DatabaseError(
          'Failed to set multiple settings',
          'SET_MULTIPLE_FAILED',
          error,
          { settings }
        );
      }
    },

    async reset(settingKey) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError(
          'Setting key must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      const defaultSetting = DEFAULT_SETTINGS[settingKey];
      if (!defaultSetting) {
        throw new DatabaseError(
          `No default value found for setting: ${settingKey}`,
          'NO_DEFAULT_VALUE',
          null,
          { settingKey }
        );
      }

      // Extract category from the setting key
      if (!settingKey.includes('.')) {
        throw new DatabaseError(
          'Setting keys must be "category.key"',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }
      const category = settingKey.substring(0, settingKey.indexOf('.'));
      if (!category) {
        throw new DatabaseError(
          'Setting keys must be "category.key"',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      const sql = `DELETE FROM user_preferences WHERE setting_key = ? AND category = ?`;

      try {
        await execute(sql, [settingKey, category]);

        logger.success('SettingsDB', 'reset', { settingKey });
        return {
          key: settingKey,
          value: defaultSetting.value,
          dataType: defaultSetting.type,
          category: category,
          isEnabled: true,
          isDefault: true,
        };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'reset', error, { settingKey, category });
        throw new DatabaseError(
          'Failed to reset setting',
          'RESET_SETTING_FAILED',
          error,
          { settingKey, category }
        );
      }
    },

    async getAll() {
      const sql = `
        SELECT setting_key, setting_value, data_type, is_enabled, category
        FROM user_preferences
        ORDER BY category, setting_key
      `;

      try {
        const result = await execute(sql);

        const settings = result.rows.map(row => ({
          key: row.setting_key,
          value: castValue(row.setting_value, row.data_type),
          dataType: row.data_type,
          isEnabled:
            row.is_enabled === 1 ||
            row.is_enabled === '1' ||
            row.is_enabled === 't' ||
            row.is_enabled === 'true' ||
            row.is_enabled === true,
          category: row.category,
          isDefault: false,
        }));

        const defaults = Object.entries(DEFAULT_SETTINGS)
          .filter(([key]) => !result.rows.some(row => row.setting_key === key))
          .map(([key, config]) => ({
            key,
            value: config.value,
            dataType: config.type,
            isEnabled: true,
            category: key.split('.')[0],
            isDefault: true,
          }));

        const allSettings = [...settings, ...defaults].sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.key.localeCompare(b.key);
        });
        logger.success('SettingsDB', 'getAll', { count: allSettings.length });
        return allSettings;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'getAll', error);
        throw new DatabaseError(
          'Failed to get all settings',
          'GET_ALL_FAILED',
          error
        );
      }
    },

    async toggle(settingKey) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError(
          'Setting key must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      const currentSetting = await this.get(settingKey);
      if (!currentSetting) {
        throw new DatabaseError(
          `Setting not found: ${settingKey}`,
          'SETTING_NOT_FOUND',
          null,
          { settingKey }
        );
      }

      if (currentSetting.dataType !== 'boolean') {
        throw new DatabaseError(
          `Setting '${settingKey}' is not a boolean type`,
          'INVALID_TYPE_FOR_TOGGLE',
          null,
          {
            settingKey,
            currentType: currentSetting.dataType,
          }
        );
      }

      const newValue = !currentSetting.value;
      return this.set(settingKey, newValue, 'boolean');
    },

    async increment(settingKey, amount = 1) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError(
          'Setting key must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { settingKey }
        );
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new DatabaseError(
          'Increment amount must be a valid number',
          'VALIDATION_ERROR',
          null,
          { settingKey, amount }
        );
      }

      const currentSetting = await this.get(settingKey);
      if (!currentSetting) {
        throw new DatabaseError(
          `Setting not found: ${settingKey}`,
          'SETTING_NOT_FOUND',
          null,
          { settingKey }
        );
      }

      if (currentSetting.dataType !== 'number') {
        throw new DatabaseError(
          `Setting '${settingKey}' is not a number type`,
          'INVALID_TYPE_FOR_INCREMENT',
          null,
          {
            settingKey,
            currentType: currentSetting.dataType,
          }
        );
      }

      const newValue = currentSetting.value + amount;
      return this.set(settingKey, newValue, 'number');
    },

    /**
     * Convenience method to get a setting value by category and key
     * @param {string} category - Setting category
     * @param {string} key - Setting key within the category
     * @param {string} [expectedType] - Expected data type for validation
     * @returns {Promise<any>} Setting value or null if not found
     */
    async getValue(category, key, expectedType = null) {
      if (!category || typeof category !== 'string') {
        throw new DatabaseError(
          'Category must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { category }
        );
      }
      if (!key || typeof key !== 'string') {
        throw new DatabaseError(
          'Key must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { key }
        );
      }

      const settingKey = `${category}.${key}`;
      const setting = await this.get(settingKey);

      if (!setting) {
        return null;
      }

      // Optional type validation
      if (expectedType && setting.dataType !== expectedType) {
        throw new DatabaseError(
          `Setting '${settingKey}' has type '${setting.dataType}' but expected '${expectedType}'`,
          'TYPE_MISMATCH_ERROR',
          null,
          { settingKey, actualType: setting.dataType, expectedType }
        );
      }

      return setting.value;
    },

    /**
     * Get multiple settings values in a single database operation
     * @param {string} category - Setting category
     * @param {Array<string|{key: string, expectedType?: string}>} keys - Array of keys or key objects with optional type validation
     * @returns {Promise<Object>} Object mapping keys to their values
     */
    async getValues(category, keys) {
      if (!category || typeof category !== 'string') {
        throw new DatabaseError(
          'Category must be a non-empty string',
          'VALIDATION_ERROR',
          null,
          { category }
        );
      }
      if (!Array.isArray(keys) || keys.length === 0) {
        throw new DatabaseError(
          'Keys must be a non-empty array',
          'VALIDATION_ERROR',
          null,
          { keys }
        );
      }

      // Normalize keys to objects with key and optional expectedType
      const normalizedKeys = keys.map(k => {
        if (typeof k === 'string') {
          return { key: k };
        }
        if (typeof k === 'object' && k.key) {
          return k;
        }
        throw new DatabaseError(
          'Each key must be a string or object with key property',
          'VALIDATION_ERROR',
          null,
          { key: k }
        );
      });

      // Build SQL to get all settings at once
      const settingKeys = normalizedKeys.map(k => `${category}.${k.key}`);
      const placeholders = settingKeys.map(() => '?').join(', ');

      const sql = `
        SELECT setting_key, setting_value, data_type, is_enabled
        FROM user_preferences
        WHERE category = ? AND setting_key IN (${placeholders})
      `;

      try {
        const result = await execute(sql, [category, ...settingKeys]);

        const values = {};

        // Process database results
        const dbSettings = new Map();
        result.rows.forEach(row => {
          const keyPart = row.setting_key.substring(category.length + 1); // Remove "category." prefix
          dbSettings.set(keyPart, {
            value: castValue(row.setting_value, row.data_type),
            dataType: row.data_type,
            isEnabled:
              row.is_enabled === 1 ||
              row.is_enabled === '1' ||
              row.is_enabled === 't' ||
              row.is_enabled === 'true' ||
              row.is_enabled === true,
          });
        });

        // Fill in values, checking defaults for missing keys
        for (const keyObj of normalizedKeys) {
          const { key, expectedType } = keyObj;
          const fullKey = `${category}.${key}`;

          let value = null;
          let dataType = null;

          if (dbSettings.has(key)) {
            const dbSetting = dbSettings.get(key);
            value = dbSetting.value;
            dataType = dbSetting.dataType;
          } else {
            // Check for default value
            const defaultSetting = DEFAULT_SETTINGS[fullKey];
            if (defaultSetting) {
              value = defaultSetting.value;
              dataType = defaultSetting.type;
            }
          }

          // Optional type validation
          if (expectedType && dataType && dataType !== expectedType) {
            throw new DatabaseError(
              `Setting '${fullKey}' has type '${dataType}' but expected '${expectedType}'`,
              'TYPE_MISMATCH_ERROR',
              null,
              { settingKey: fullKey, actualType: dataType, expectedType }
            );
          }

          values[key] = value;
        }

        logger.success('SettingsDB', 'getValues', { category, count: normalizedKeys.length });
        return values;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        logger.error('SettingsDB', 'getValues', error, { category, keys: normalizedKeys });
        throw new DatabaseError(
          'Failed to get multiple values',
          'GET_VALUES_FAILED',
          error,
          { category, keys: normalizedKeys }
        );
      }
    },
  };
}
