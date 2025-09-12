import { DatabaseError } from './errors';
import { DEFAULT_SETTINGS, validateSettingValue, castValue, serializeValue } from './settingsHelpers';

export function createSettingsDB({ execute, batch, transaction }) {
  return {
    async get(settingKey) {
      // Enforce hierarchical key and derive category
      const validateSettingKey = (k) => {
        if (typeof k !== 'string' || !k.includes('.')) {
          throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey: k });
        }
        const [cat, sub] = k.split('.');
        if (!cat || !sub) {
          throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey: k });
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
            return {
              key: settingKey,
              value: defaultSetting.value,
              dataType: defaultSetting.type,
              isEnabled: true,
              isDefault: true
            };
          }
          return null;
        }

        const row = result.rows[0];
        const castedValue = castValue(row.setting_value, row.data_type);
        
        return {
          key: row.setting_key,
          value: castedValue,
          dataType: row.data_type,
          isEnabled: castValue(row.is_enabled, 'boolean'),
          isDefault: false
        };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get setting', 'GET_SETTING_FAILED', error, { settingKey });
      }
    },

    async set(settingKey, value, dataType = null) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError('Setting key must be a non-empty string', 'VALIDATION_ERROR', null, { settingKey });
      }

      // Validate hierarchical key format
      if (!settingKey.includes('.')) {
        throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey });
      }
      const category = settingKey.substring(0, settingKey.indexOf('.'));
      if (!category) {
        throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey });
      }

      // Resolve data type automatically if not provided
      let resolvedType = dataType;
      if (!resolvedType) {
        // First, check if we have a default setting with a known type
        const defaultSetting = DEFAULT_SETTINGS[settingKey];
        if (defaultSetting?.type) {
          resolvedType = defaultSetting.type;
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
        const result = await execute(sql, [category, settingKey, serializedValue, resolvedType]);
        
        const setting = await this.get(settingKey);
        return setting;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to set setting', 'SET_SETTING_FAILED', error, { settingKey, value });
      }
    },

    async getByCategory(category) {
      if (!category || typeof category !== 'string') {
        throw new DatabaseError('Category must be a non-empty string', 'VALIDATION_ERROR', null, { category });
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
          isEnabled: castValue(row.is_enabled, 'boolean'),
          isDefault: false
        }));

        const defaults = Object.entries(DEFAULT_SETTINGS)
          .filter(([key]) => key.startsWith(category + '.'))
          .filter(([key]) => !result.rows.some(row => row.setting_key === key))
          .map(([key, config]) => ({
            key,
            value: config.value,
            dataType: config.type,
            isEnabled: true,
            isDefault: true
          }));

        return [...settings, ...defaults].sort((a, b) => a.key.localeCompare(b.key));
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get settings by category', 'GET_CATEGORY_FAILED', error, { category });
      }
    },

    async setMultiple(settings) {
      if (!Array.isArray(settings) || settings.length === 0) {
        throw new DatabaseError('Settings must be a non-empty array', 'VALIDATION_ERROR', null, { settings });
      }

      for (const setting of settings) {
        if (!setting.key || typeof setting.key !== 'string') {
          throw new DatabaseError('Each setting must have a valid key', 'VALIDATION_ERROR', null, { setting });
        }
        if (!setting.key.includes('.') || setting.key.split('.').some(p => !p)) {
          throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey: setting.key });
        }
        validateSettingValue(setting.key, setting.value, setting.dataType || 'string');
      }

      const statements = settings.map(setting => {
        const category = setting.key.split('.')[0] || 'general';
        const serializedValue = serializeValue(setting.value, setting.dataType || 'string');
        
        return {
          sql: `
            INSERT INTO user_preferences (category, setting_key, setting_value, data_type, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(category, setting_key) DO UPDATE SET
              setting_value = excluded.setting_value,
              data_type = excluded.data_type,
              updated_at = CURRENT_TIMESTAMP
          `,
          params: [category, setting.key, serializedValue, setting.dataType || 'string']
        };
      });

      try {
        await batch(statements);
        
        return await Promise.all(settings.map(s => this.get(s.key)));
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to set multiple settings', 'SET_MULTIPLE_FAILED', error, { settings });
      }
    },

    async reset(settingKey) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError('Setting key must be a non-empty string', 'VALIDATION_ERROR', null, { settingKey });
      }

      const defaultSetting = DEFAULT_SETTINGS[settingKey];
      if (!defaultSetting) {
        throw new DatabaseError(`No default value found for setting: ${settingKey}`, 'NO_DEFAULT_VALUE', null, { settingKey });
      }

      // Extract category from the setting key
      if (!settingKey.includes('.')) {
        throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey });
      }
      const category = settingKey.substring(0, settingKey.indexOf('.'));
      if (!category) {
        throw new DatabaseError('Setting keys must be "category.key"', 'VALIDATION_ERROR', null, { settingKey });
      }

      const sql = `DELETE FROM user_preferences WHERE setting_key = ? AND category = ?`;
      
      try {
        await execute(sql, [settingKey, category]);
        
        return {
          key: settingKey,
          value: defaultSetting.value,
          dataType: defaultSetting.type,
          category: category,
          isEnabled: true,
          isDefault: true
        };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to reset setting', 'RESET_SETTING_FAILED', error, { settingKey, category });
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
          isEnabled: castValue(row.is_enabled, 'boolean'),
          category: row.category,
          isDefault: false
        }));

        const defaults = Object.entries(DEFAULT_SETTINGS)
          .filter(([key]) => !result.rows.some(row => row.setting_key === key))
          .map(([key, config]) => ({
            key,
            value: config.value,
            dataType: config.type,
            isEnabled: true,
            category: key.split('.')[0],
            isDefault: true
          }));

        return [...settings, ...defaults].sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.key.localeCompare(b.key);
        });
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get all settings', 'GET_ALL_FAILED', error);
      }
    },

    async toggle(settingKey) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError('Setting key must be a non-empty string', 'VALIDATION_ERROR', null, { settingKey });
      }

      const currentSetting = await this.get(settingKey);
      if (!currentSetting) {
        throw new DatabaseError(`Setting not found: ${settingKey}`, 'SETTING_NOT_FOUND', null, { settingKey });
      }

      if (currentSetting.dataType !== 'boolean') {
        throw new DatabaseError(`Setting '${settingKey}' is not a boolean type`, 'INVALID_TYPE_FOR_TOGGLE', null, { 
          settingKey, 
          currentType: currentSetting.dataType 
        });
      }

      const newValue = !currentSetting.value;
      return this.set(settingKey, newValue, 'boolean');
    },

    async increment(settingKey, amount = 1) {
      if (!settingKey || typeof settingKey !== 'string') {
        throw new DatabaseError('Setting key must be a non-empty string', 'VALIDATION_ERROR', null, { settingKey });
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new DatabaseError('Increment amount must be a valid number', 'VALIDATION_ERROR', null, { settingKey, amount });
      }

      const currentSetting = await this.get(settingKey);
      if (!currentSetting) {
        throw new DatabaseError(`Setting not found: ${settingKey}`, 'SETTING_NOT_FOUND', null, { settingKey });
      }

      if (currentSetting.dataType !== 'number') {
        throw new DatabaseError(`Setting '${settingKey}' is not a number type`, 'INVALID_TYPE_FOR_INCREMENT', null, { 
          settingKey, 
          currentType: currentSetting.dataType 
        });
      }

      const newValue = currentSetting.value + amount;
      return this.set(settingKey, newValue, 'number');
    }
  };
}