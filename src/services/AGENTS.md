# Services Layer Agent Instructions

## Overview
The services layer handles business logic, orchestrates database operations, and manages system integrations. Build after completing the database layer.

## Service Modules

### 1. File Service (`fileService.js`)

#### Responsibilities
- Manage file storage in Expo FileSystem
- Generate UUID filenames
- Create image thumbnails
- Handle file uploads/downloads
- Clean up orphaned files

#### Key Functions
```javascript
export const fileService = {
  // File Operations
  saveFile: async (uri, originalName, entityType, entityId) => Promise<attachment>,
  deleteFile: async (attachmentId) => Promise<void>,
  getFileUri: (attachmentId) => Promise<string>,
  
  // Thumbnail Management
  generateThumbnail: async (imageUri) => Promise<thumbnailUri>,
  getThumbnailUri: (attachmentId) => Promise<string>,
  
  // Cleanup
  cleanOrphanedFiles: async () => Promise<number>,
  calculateStorageUsed: async () => Promise<bytes>,
  
  // Validation
  validateFileType: (mimeType) => boolean,
  validateFileSize: (bytes) => boolean,
  
  // Batch Operations
  saveMultipleFiles: async (files) => Promise<attachments[]>,
  deleteMultipleFiles: async (attachmentIds) => Promise<void>
};
```

#### Implementation Details
```javascript
// File Storage Structure
FileSystem.documentDirectory/
├── attachments/
│   ├── images/
│   │   ├── {uuid}.jpg
│   │   └── thumbnails/
│   │       └── {uuid}_thumb.jpg
│   ├── documents/
│   │   └── {uuid}.pdf
│   └── audio/
│       └── {uuid}.m4a

// Configuration
const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  THUMBNAIL_SIZE: { width: 150, height: 150 },
  ALLOWED_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif'],
    document: ['application/pdf', 'application/msword'],
    audio: ['audio/mpeg', 'audio/m4a'],
    video: ['video/mp4', 'video/quicktime']
  }
};
```

### 2. Authentication Service (`authService.js`)

#### Responsibilities
- Manage local authentication with Expo LocalAuthentication
- Handle PIN/biometric setup
- Session management
- App lock/unlock functionality

#### Key Functions
```javascript
export const authService = {
  // Authentication
  authenticate: async () => Promise<boolean>,
  isAuthenticationAvailable: async () => Promise<boolean>,
  getAuthenticationType: async () => Promise<'biometric'|'pin'|'none'>,
  
  // Setup
  setupBiometric: async () => Promise<void>,
  setupPin: async (pin) => Promise<void>,
  changePin: async (oldPin, newPin) => Promise<void>,
  
  // Session
  lockApp: async () => Promise<void>,
  unlockApp: async () => Promise<void>,
  isAppLocked: () => boolean,
  
  // Settings
  setAutoLockTimeout: async (minutes) => Promise<void>,
  requireAuthOnAppResume: async (enabled) => Promise<void>
};
```

#### Security Considerations
- Store PIN using secure storage
- Implement brute force protection
- Clear sensitive data on lock
- Handle authentication failures gracefully

### 3. Notification Service (`notificationService.js`)

#### Responsibilities
- Schedule event reminder notifications
- Handle notification permissions
- Manage notification preferences
- Track notification delivery

#### Key Functions
```javascript
export const notificationService = {
  // Permissions
  requestPermissions: async () => Promise<boolean>,
  checkPermissions: async () => Promise<PermissionStatus>,
  
  // Scheduling
  scheduleEventReminder: async (eventId, reminderData) => Promise<notificationId>,
  cancelReminder: async (notificationId) => Promise<void>,
  rescheduleReminder: async (notificationId, newTime) => Promise<void>,
  
  // Batch Operations
  scheduleMultipleReminders: async (reminders) => Promise<notificationIds[]>,
  cancelAllReminders: async () => Promise<void>,
  
  // Recurring Events
  scheduleRecurringReminder: async (event, pattern) => Promise<void>,
  updateRecurringReminder: async (eventId, newPattern) => Promise<void>,
  
  // Notification Handling
  handleNotificationResponse: async (response) => Promise<void>,
  markReminderAsSent: async (reminderId) => Promise<void>,
  
  // Settings
  setDefaultReminderTime: async (minutes) => Promise<void>,
  setQuietHours: async (start, end) => Promise<void>
};
```

#### Notification Types
```javascript
const NOTIFICATION_TEMPLATES = {
  birthday: {
    title: "Birthday Reminder 🎂",
    body: "{name}'s birthday is {when}",
    data: { type: 'birthday', contactId: null }
  },
  meeting: {
    title: "Meeting Reminder 📅",
    body: "Meeting with {name} {when}",
    data: { type: 'meeting', eventId: null }
  },
  followUp: {
    title: "Follow-up Reminder 📞",
    body: "Time to follow up with {name}",
    data: { type: 'followUp', contactId: null }
  }
};
```

### 4. Backup Service (`backupService.js`)

#### Responsibilities
- Export database to JSON/CSV
- Import data from backup
- Handle data migration
- Manage automatic backups

#### Key Functions
```javascript
export const backupService = {
  // Export
  exportToJSON: async () => Promise<exportData>,
  exportToCSV: async (tables) => Promise<csvData>,
  createBackup: async () => Promise<backupFile>,
  
  // Import
  importFromJSON: async (jsonData) => Promise<importResult>,
  importFromCSV: async (csvData, tableName) => Promise<importResult>,
  restoreFromBackup: async (backupFile) => Promise<void>,
  
  // Validation
  validateBackupFile: async (file) => Promise<boolean>,
  validateImportData: (data, schema) => ValidationResult,
  
  // Auto Backup
  enableAutoBackup: async (interval) => Promise<void>,
  disableAutoBackup: async () => Promise<void>,
  getLastBackupDate: async () => Promise<Date>,
  
  // Cleanup
  deleteOldBackups: async (daysToKeep) => Promise<number>,
  getBackupFiles: async () => Promise<backupFiles[]>
};
```

#### Backup Format
```javascript
const BACKUP_STRUCTURE = {
  version: "1.0.0",
  created_at: "2024-01-01T00:00:00Z",
  app_version: "1.0.0",
  data: {
    contacts: [],
    contact_info: [],
    categories: [],
    events: [],
    interactions: [],
    notes: [],
    attachments: [],
    companies: [],
    user_preferences: []
  },
  metadata: {
    total_contacts: 0,
    total_events: 0,
    total_attachments: 0,
    storage_used: 0
  }
};
```

## Service Integration Patterns

### Cross-Service Communication
```javascript
// Example: Creating a contact with photo
async function createContactWithPhoto(contactData, photoUri) {
  // 1. Save photo using fileService
  const attachment = await fileService.saveFile(
    photoUri, 
    'profile.jpg', 
    'contact', 
    null // Will update after contact creation
  );
  
  // 2. Create contact with avatar
  const contact = await contactsDB.create({
    ...contactData,
    avatar_uri: attachment.file_path
  });
  
  // 3. Update attachment with contact ID
  await attachmentsDB.update(attachment.id, {
    entity_id: contact.id
  });
  
  // 4. Schedule birthday reminder if applicable
  if (contactData.birthday) {
    await notificationService.scheduleEventReminder(
      contact.id,
      { type: 'birthday', date: contactData.birthday }
    );
  }
  
  return contact;
}
```

### Error Handling
```javascript
class ServiceError extends Error {
  constructor(service, operation, originalError) {
    super(`${service}.${operation} failed: ${originalError.message}`);
    this.service = service;
    this.operation = operation;
    this.originalError = originalError;
  }
}

// Usage
try {
  await fileService.saveFile(uri, name);
} catch (error) {
  throw new ServiceError('fileService', 'saveFile', error);
}
```

### Service Initialization
```javascript
// services/index.js
export async function initializeServices() {
  // Check permissions
  await notificationService.requestPermissions();
  
  // Setup authentication if available
  if (await authService.isAuthenticationAvailable()) {
    await authService.setupBiometric();
  }
  
  // Clean orphaned files
  await fileService.cleanOrphanedFiles();
  
  // Schedule pending reminders
  await notificationService.reschedulePendingReminders();
  
  // Check for auto-backup
  await backupService.checkAutoBackup();
}
```

## Testing Requirements

### Unit Tests
- Mock Expo modules (FileSystem, Notifications, etc.)
- Test error handling
- Test validation logic
- Test data transformations

### Integration Tests
- Test service interactions
- Test with real Expo modules in development
- Test backup/restore cycle
- Test notification scheduling

### Performance Tests
- File upload/download speed
- Backup/restore with large datasets
- Batch operation performance
- Memory usage monitoring

## Implementation Checklist

- [ ] Create fileService.js with UUID generation
- [ ] Implement thumbnail generation
- [ ] Create authService.js with biometric support
- [ ] Implement PIN authentication
- [ ] Create notificationService.js
- [ ] Implement reminder scheduling
- [ ] Create backupService.js
- [ ] Implement JSON export/import
- [ ] Add CSV export functionality
- [ ] Implement auto-backup
- [ ] Create service orchestrator
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization