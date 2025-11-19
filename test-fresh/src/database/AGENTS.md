# Database Layer Agent Instructions

## Overview
This layer manages all SQLite database operations for the CRM application. Build this foundation completely before moving to services or UI.

## Database Schema

### 1. Contacts Table
```sql
contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  middle_name TEXT,
  avatar_uri TEXT,
  company_id INTEGER,
  job_title TEXT,
  is_favorite BOOLEAN DEFAULT 0,
  last_interaction_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies (id)
)
```

### 2. Contact Info Table
```sql
contact_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'mobile', 'office', 'email', 'address', 'website'
  subtype TEXT, -- 'home', 'work', 'other'
  value TEXT NOT NULL,
  label TEXT, -- Custom labels like "TextNow Number"
  is_primary BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
)
```

### 3. Events Table
```sql
events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'birthday', 'anniversary', 'meeting', 'follow_up'
  event_date DATE NOT NULL,
  recurring BOOLEAN DEFAULT 0,
  recurrence_pattern TEXT, -- 'yearly', 'monthly'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
)
```

### 4. Event Reminders Table
```sql
event_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  reminder_datetime DATETIME NOT NULL,
  reminder_type TEXT DEFAULT 'notification',
  is_sent BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
)
```

### 5. Interactions Table
```sql
interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  note TEXT,
  interaction_type TEXT NOT NULL, -- 'call', 'text', 'email', 'meeting', 'other'
  custom_type TEXT, -- For 'other' type
  duration INTEGER, -- Minutes for calls/meetings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
)
```

### 6. Notes Table
```sql
notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER, -- NULL for general notes
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
)
```

### 7. Categories Tables
```sql
categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT 'folder',
  is_system BOOLEAN DEFAULT 0, -- System vs user-created
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

contact_categories (
  contact_id INTEGER,
  category_id INTEGER,
  PRIMARY KEY (contact_id, category_id),
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
)
```

### 8. Attachments Table
```sql
attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'contact', 'interaction', 'event', 'note'
  entity_id INTEGER NOT NULL,
  file_name TEXT NOT NULL, -- UUID filename
  original_name TEXT NOT NULL, -- Original filename
  file_path TEXT NOT NULL, -- Local filesystem path
  file_type TEXT NOT NULL, -- 'image', 'document', 'audio', 'video'
  mime_type TEXT,
  file_size INTEGER, -- Bytes
  thumbnail_path TEXT, -- For images/videos
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 9. Companies Table
```sql
companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  address TEXT,
  notes TEXT,
  logo_attachment_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (logo_attachment_id) REFERENCES attachments (id)
)
```

### 10. User Preferences Table
```sql
user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- 'notifications', 'display', 'security', 'backup'
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  data_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  is_enabled BOOLEAN DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, setting_key)
)
```

## Module Implementation Order

### 1. Database Orchestrator (`index.js`)
```javascript
// Core responsibilities:
- Initialize SQLite connection
- Manage database lifecycle
- Execute migrations
- Export all module APIs
- Handle transactions
```

### 2. Migration System (`migrations/`)
```javascript
// Files to create:
- 001_initial_schema.js
- 002_seed_data.js
- migrationRunner.js

// Migration format:
export default {
  version: 1,
  up: async (db) => { /* create tables */ },
  down: async (db) => { /* drop tables */ }
}
```

### 3. Module API Pattern
Each module must follow this consistent pattern:

```javascript
export const contactsDB = {
  // Core CRUD
  create: (data) => Promise,
  getById: (id) => Promise,
  getAll: (options) => Promise,
  update: (id, data) => Promise,
  delete: (id) => Promise,
  
  // Search & Filter
  search: (query) => Promise,
  getByCategory: (categoryId) => Promise,
  getFavorites: () => Promise,
  
  // Relations
  getWithContactInfo: (id) => Promise,
  getWithCategories: (id) => Promise,
  
  // Entity-specific
  toggleFavorite: (id) => Promise,
  addContactInfo: (contactId, infoData) => Promise,
  updateContactInfo: (infoId, data) => Promise
};
```

## Module-Specific Requirements

### contacts.js
- Manage contacts and contact_info tables
- Auto-update last_interaction_at
- Handle avatar_uri storage
- Support batch operations for contact info

### categories.js
- Seed system categories on first run
- Prevent deletion of system categories
- Manage contact_categories junction table
- Support category sorting

### companies.js
- Handle logo attachments
- Update contact relationships
- Support company merging

### events.js
- Manage events and event_reminders
- Calculate next occurrence for recurring events
- Support reminder scheduling
- Handle timezone considerations

### interactions.js
- Log all contact interactions
- Update contact's last_interaction_at
- Support custom interaction types
- Calculate interaction statistics

### notes.js
- Support both contact and general notes
- Implement pinning functionality
- Full-text search capability
- Handle note archiving

### attachments.js
- Universal attachment system
- File path management
- Orphaned file cleanup
- Thumbnail generation tracking

### settings.js
- Type-safe value storage/retrieval
- Default settings initialization
- Settings migration support
- Batch updates for performance

## Database Best Practices

### Transactions
```javascript
// Use for multi-table operations
await db.transaction(async (tx) => {
  await tx.executeSql('INSERT INTO contacts...');
  await tx.executeSql('INSERT INTO contact_info...');
});
```

### Indexes
Create indexes for:
- Foreign keys
- Frequently searched columns
- Sort columns
- Junction table columns

### Error Handling
```javascript
class DatabaseError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.code = code;
    this.originalError = originalError;
  }
}
```

### Performance
- Use prepared statements
- Implement connection pooling
- Add query result caching where appropriate
- Use EXPLAIN QUERY PLAN for optimization

## Testing Requirements

### Unit Tests
- Test each CRUD operation
- Test search and filter functions
- Test transaction rollback
- Test constraint violations

### Integration Tests
- Test cross-module operations
- Test migration system
- Test data integrity
- Test cascade deletes

### Test Data
Create factories for:
- Contacts with full info
- Events with reminders
- Categories with associations
- Companies with contacts

## Implementation Checklist

- [x] Create database/index.js orchestrator
- [x] Implement migration system
- [x] Create initial schema migration (001_initial_schema.js)
- [x] Implement contacts.js module
- [x] Implement contactsInfo.js helper module
- [x] Implement categories.js module
- [x] Implement categoriesRelations.js helper module
- [x] Implement companies.js module
- [x] Implement events.js module
- [x] Implement eventsRecurring.js helper module
- [x] Implement eventsReminders.js helper module
- [x] Implement interactions.js module
- [x] Implement interactionsStats.js helper module
- [x] Implement interactionsSearch.js helper module
- [x] Implement notes.js module
- [x] Implement attachments.js module
- [x] Implement settings.js module
- [x] Implement settingsHelpers.js helper module  
- [x] Add seed data migration (002_seed_data.js)
- [x] Create performance indexes migration (003_performance_indexes.js)
- [x] Write unit tests for all modules
- [x] Write integration tests
- [x] Performance optimization

## ✅ PHASE 1 COMPLETE - DATABASE FOUNDATION

All database modules are implemented, tested, and ready for production use. The database layer provides:
- Complete CRUD operations for all entities
- Robust error handling and validation
- Comprehensive test coverage (9 test suites)
- Migration system with 3 migrations
- Performance optimizations with proper indexing
- Transaction support for complex operations

**Next Phase:** Ready to proceed to Services Layer (Phase 2)