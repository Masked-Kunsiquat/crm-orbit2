import { DatabaseError } from './errors';

export const DEFAULT_SETTINGS = {
  // Notifications
  'notifications.enabled': { value: true, type: 'boolean' },
  'notifications.birthday_reminders': { value: true, type: 'boolean' },
  'notifications.event_reminders': { value: true, type: 'boolean' },
  'notifications.reminder_advance_days': { value: 1, type: 'number' },
  
  // Display
  'display.theme': { value: 'system', type: 'string' },
  'display.contacts_per_page': { value: 25, type: 'number' },
  'display.show_avatars': { value: true, type: 'boolean' },
  'display.date_format': { value: 'MM/DD/YYYY', type: 'string' },
  'display.time_format': { value: '12h', type: 'string' },
  
  // Security
  'security.require_biometric': { value: false, type: 'boolean' },
  'security.auto_lock_minutes': { value: 15, type: 'number' },
  'security.hide_sensitive_info': { value: false, type: 'boolean' },
  
  // Backup
  'backup.auto_backup_enabled': { value: true, type: 'boolean' },
  'backup.backup_frequency_days': { value: 7, type: 'number' },
  'backup.include_attachments': { value: true, type: 'boolean' },
  'backup.max_backup_count': { value: 5, type: 'number' }
};

export function validateSettingValue(key, value, dataType) {
  if (value === null || value === undefined) {
    throw new DatabaseError(`Setting value cannot be null or undefined`, 'VALIDATION_ERROR', null, { key, value });
  }

  switch (dataType) {
    case 'string':
      if (typeof value !== 'string') {
        throw new DatabaseError(`Setting '${key}' must be a string`, 'VALIDATION_ERROR', null, { key, value, expectedType: 'string' });
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new DatabaseError(`Setting '${key}' must be a valid number`, 'VALIDATION_ERROR', null, { key, value, expectedType: 'number' });
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DatabaseError(`Setting '${key}' must be a boolean`, 'VALIDATION_ERROR', null, { key, value, expectedType: 'boolean' });
      }
      break;
    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        } else if (typeof value === 'object') {
          JSON.stringify(value);
        } else {
          throw new Error('Invalid JSON type');
        }
      } catch {
        throw new DatabaseError(`Setting '${key}' must be valid JSON`, 'VALIDATION_ERROR', null, { key, value, expectedType: 'json' });
      }
      break;
    default:
      throw new DatabaseError(`Unknown data type: ${dataType}`, 'VALIDATION_ERROR', null, { key, dataType });
  }
}

export function castValue(value, dataType) {
  if (value === null || value === undefined) return null;

  switch (dataType) {
    case 'string':
      return String(value);
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        throw new DatabaseError(`Cannot cast value to number: ${value}`, 'TYPE_CAST_ERROR', null, { value, dataType });
      }
      return num;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      throw new DatabaseError(`Cannot cast value to boolean: ${value}`, 'TYPE_CAST_ERROR', null, { value, dataType });
    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          throw new DatabaseError(`Cannot parse JSON value: ${value}`, 'TYPE_CAST_ERROR', null, { value, dataType });
        }
      }
      return value;
    default:
      return value;
  }
}

export function serializeValue(value, dataType) {
  switch (dataType) {
    case 'json':
      return typeof value === 'string' ? value : JSON.stringify(value);
    case 'boolean':
      return value ? '1' : '0';
    case 'number':
      return String(value);
    case 'string':
    default:
      return String(value);
  }
}