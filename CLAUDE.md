# Expo CRM - Technical Documentation

**Last Updated**: November 10, 2025
**Project Location**: `crm-orbit/test-fresh/`
**Repository**: https://github.com/Masked-Kunsiquat/crm-orbit2
**Status**: Active Development - Helper Functions Implementation Phase (10/12 Complete)

---

## Executive Summary

Expo CRM is a modern, offline-first Customer Relationship Management (CRM) application built with React Native and Expo. The app provides comprehensive contact management, interaction tracking, event scheduling, and analytics capabilities optimized for mobile devices. The codebase emphasizes clean architecture, comprehensive error handling, and extensive validation patterns.

**Key Stats**:
- **79 source files** (~994 KB)
- **31 database modules** with factory pattern
- **Full TypeScript-like validation** with runtime checkers
- **Multi-language support** (English, Spanish, French, German, Chinese)
- **SQLite local storage** with modern async/await API
- **TanStack Query** for data fetching and caching
- **Material Design 3** UI with React Native Paper
- **537+ duplicate patterns eliminated** through systematic helper function implementation

---

## Quick Navigation

1. [Repository Structure](#repository-structure)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Layer](#database-layer)
5. [Services & Business Logic](#services--business-logic)
6. [UI Components & Screens](#ui-components--screens)
7. [Utilities & Helpers](#utilities--helpers)
8. [Error Handling](#error-handling)
9. [Authentication & Security](#authentication--security)
10. [Configuration](#configuration)
11. [Testing](#testing)
12. [Code Patterns](#code-patterns--conventions)
13. [Development Status](#development-status)
14. [Quick Start](#quick-start)

---

## Repository Structure

The project is organized in `crm-orbit/test-fresh/` with the following structure:

```
crm-orbit/
├── test-fresh/               # Main application directory
│   ├── src/ (994 KB, 79 files)
│   │   ├── components/       # 8 UI components (116 KB)
│   │   ├── screens/          # 6 screen components (92 KB)
│   │   ├── database/         # 31 database modules (337 KB)
│   │   ├── services/         # 8 service modules (209 KB)
│   │   ├── hooks/            # Custom React & TanStack Query hooks
│   │   ├── context/          # React Context providers (Auth, Settings)
│   │   ├── errors/           # Centralized error handling (48 KB)
│   │   ├── utils/            # Helper utilities (64 KB)
│   │   ├── providers/        # Provider wrappers
│   │   ├── constants/        # App constants
│   │   ├── i18n/             # i18next configuration
│   │   └── locales/          # Translation files (5 languages, 48 KB)
│   ├── assets/               # Images and app icons
│   ├── App.js                # Application entry point (206 lines)
│   ├── package.json          # Dependencies (38 runtime, 8 dev)
│   ├── app.json              # Expo configuration
│   ├── babel.config.js       # Babel setup
│   ├── jest.setup.js         # Jest test configuration
│   └── index.js              # Expo entry point
├── docs/                     # Documentation
│   ├── AUDIT-RESULTS.md      # Helper function migration tracking
│   └── ERROR-MIGRATION-PLAN.md
├── CLAUDE.md                 # This file - project documentation
├── README.md                 # Repository README
└── .gitignore
```

### Key Directories

**Database Layer** (31 files, 337 KB):
- **Entity modules** (11): contacts, companies, contactsInfo, interactions, events, notes, attachments, categories, categoriesRelations, eventsRecurring, eventsReminders
- **Supporting** (4): interactionsSearch, interactionsStats, settings, settingsHelpers
- **Infrastructure** (6): index.js (orchestrator), sqlHelpers.js ✅, errors.js, simpleInit.js, simpleSetup.js, resetDb.js
- **Migrations** (9): 6 schema migrations + runner + helpers + registry
- **Adapter** (1): expoSqliteAdapter.js

**Services Layer** (8 files, 209 KB):
- authService.js (26 KB), backupService.js (47 KB), contactSyncService.js (25 KB)
- fileService.js (17 KB), notificationService.js (36 KB)
- backup/ folder, __mocks__/, AGENTS.md (13 KB)

**UI Layer** (14 files, 208 KB):
- **Screens** (6): ContactsList, ContactDetailScreen (25 KB), InteractionsScreen, EventsList, SettingsScreen (14 KB), AuthLockScreen, PinSetupScreen
- **Components** (8): ContactCard, ContactAvatar, AddContactModal (17 KB), EditContactModal (16 KB), AddInteractionModal (18 KB), AddEventModal (20 KB), InteractionCard, InteractionDetailModal

**Utilities** (9+ files, 69 KB):
- **validators.js** ✅ (15+ validation functions)
- **stringHelpers.js** ✅ (7 string functions)
- **contactHelpers.js** ✅ (4 contact formatting functions)
- **fileHelpers.js** ✅ (3 file utility functions)
- **permissionHelpers.js** ✅ (2 permission request functions)
- **dateUtils.js** (18 KB, 10+ date functions)
- **__tests__/** (test files)

**Hooks** (TanStack Query):
- **queries/queryHelpers.js** ✅ (2 query helper functions)

**Error Handling** (48 KB):
- **base/** (AppError, ErrorCodes)
- **database/** (DatabaseError)
- **services/** (ServiceError)
- **ui/** (UIError, ValidationError)
- **utils/** (errorLogger.js ✅, errorHandler.js ✅)

---

## Technology Stack

### Core Framework
- **React Native** 0.81.5
- **Expo** 54.0.22 (SDK 54, New Architecture enabled)
- **React** 19.1.0 (latest)

### Navigation & State
- **React Navigation** 7.1.18 (native-stack 7.3.27, bottom-tabs via Paper)
- **TanStack Query** 5.90.6 (data fetching, caching)
- **React Context** (auth, settings global state)

### UI & Components
- **React Native Paper** 5.14.5 (Material Design 3)
- **React Native Gesture Handler** 2.28.0
- **React Native Vector Icons** 10.3.0
- **React Native Safe Area Context** 5.6.0
- **React Native Screens** 4.16.0

### Database & Storage
- **expo-sqlite** 16.0.9 (SQLite with async API, no callbacks)
- **expo-secure-store** 15.0.7 (credential storage)
- **AsyncStorage** 2.2.0 (key-value storage)

### Authentication
- **expo-local-authentication** 17.0.7 (biometric)
- **expo-crypto** 15.0.7 (hashing)

### Internationalization
- **i18next** 25.6.0
- **react-i18next** 16.0.0
- **expo-localization** 17.0.7

### File & Device Integration
- **expo-contacts** 15.0.10
- **expo-image-picker** 17.0.8
- **expo-image-manipulator** 14.0.7
- **@react-native-community/datetimepicker** 8.4.4

### Testing
- **Jest** 29.7.0
- **@testing-library/react-native** 12.9.0
- **jest-expo** 54.0.3
- **react-test-renderer** 19.1.0

---

## Application Architecture

### Layered Architecture

```
[Presentation Layer]
Screens (6) & Components (8) with React Native Paper
↓ (useQuery hooks, context)

[Business Logic Layer]
Services (8) with TanStack Query hooks and mutations
↓ (database calls)

[Data Access Layer]
31 Database modules with factory pattern
Promise-based CRUD operations
↓ (execute, batch, transaction)

[Foundation Layer]
SQLite adapter with modern async API
Error classes, validation, utilities
↓ (expo-sqlite)

[Storage Layer]
SQLite database, AsyncStorage, SecureStore
```

### Provider Stack (from root)

```
App.js
└─ GestureHandlerRootView
    └─ QueryProvider (TanStack Query)
        └─ SettingsProvider (theme, language)
            └─ ThemeBridge (apply theme to Paper)
                └─ I18nextProvider (translations)
                    └─ AuthProvider (auth state, lock/unlock)
                        └─ AuthGate (lock screen overlay)
                            └─ NavigationContainer
                                └─ Stack Navigator
                                    ├─ MainTabs (BottomNavigation)
                                    │   ├─ Contacts Tab
                                    │   ├─ Interactions Tab
                                    │   ├─ Events Tab
                                    │   └─ Settings Tab
                                    ├─ ContactDetail (Modal)
                                    └─ PinSetup (Modal)
```

### Initialization Flow

1. **Database Init**: `initDatabase()` → `createBasicTables()` → migrations
2. **Auth Init**: Check PIN/biometric → Set locked state
3. **Settings Init**: Load user preferences (theme, language, swipe actions)
4. **App Ready**: Render UI or lock screen based on auth state

---

## Database Layer

### Overview

31 modular database files organized by entity with consistent factory pattern. Uses modern `expo-sqlite` async API (no callbacks, pure async/await).

**Principles**:
- **Modular**: Each entity in separate file
- **Factory Pattern**: `createXyzDB({ execute, batch, transaction })`
- **Promise-based**: All async operations
- **Type-safe**: Runtime validation before all operations
- **Transactional**: Support for atomic multi-step operations
- **Consistent**: All modules use shared helpers from `sqlHelpers.js` ✅

### Database Modules by Category

**Entity Modules** (11):
```
contacts.js              # Core contact CRUD with display_name computation
companies.js             # Company records with industry
contactsInfo.js          # Phone/email/address (type, value, label)
interactions.js          # Activity logs (calls, emails, meetings)
events.js                # Calendar events with recurring support
notes.js                 # Text notes with entity associations
attachments.js           # File attachments (base64, MIME, size)
categories.js            # User & system categories
categoriesRelations.js   # Contact↔Category many-to-many
eventsRecurring.js       # Recurring event patterns
eventsReminders.js       # Reminder scheduling (24 KB - largest)
```

**Supporting Modules** (4):
```
interactionsSearch.js    # Full-text search (FTS5)
interactionsStats.js     # Analytics and statistics
settings.js              # Key-value settings (23 KB)
settingsHelpers.js       # Settings utility functions
```

**Infrastructure** (6):
```
index.js                 # Database orchestrator (14 KB)
sqlHelpers.js            # ✅ SQL building utilities (NEW)
errors.js                # Database error definitions
simpleInit.js            # Simple initialization
simpleSetup.js           # Table creation
resetDb.js               # Database reset utility
```

**Migration System** (9 files, 64 KB):
```
migrations/
├── 001_initial_schema.js           # Core 13 tables (11 KB)
├── 002_seed_data.js                # Initial categories (5 KB)
├── 003_performance_indexes.js      # Database indexes (3 KB)
├── 004_add_display_name_column.js  # Display name support (6 KB)
├── 005_add_avatar_attachment_id.js # Avatar support (2 KB)
├── 006_add_event_reminders_updated_at.js  # Timestamps (2 KB)
├── _helpers.js                     # Migration utilities (3 KB)
├── migrationRunner.js              # Orchestration (8 KB)
└── registry.js                     # Migration registry (1.5 KB)
```

**Adapter** (1):
```
adapters/expoSqliteAdapter.js  # SQLite API compatibility layer
```

### Core Tables (13)

```sql
-- Core entities
contacts              # first/last/middle name, display_name, avatar_attachment_id, company_id
companies             # name, industry, logo_attachment_id
contact_info          # contact_id, type (phone/email/address), value, label, is_primary

-- Activity tracking
interactions          # contact_id, type, subject, body, interaction_date, location
events                # contact_id, title, description, event_date, event_time, location, all_day
notes                 # entity_type, entity_id, content, is_pinned

-- File management
attachments           # file_name, mime_type, file_size, data (base64), thumbnail_data

-- Organization
categories            # name, color, icon, is_system
category_relations    # contact_id, category_id (many-to-many)

-- Event features
event_reminders       # event_id, reminder_time, is_sent, updated_at
events_recurring      # event_id, frequency, interval, days_of_week, end_date

-- Search
interactions_search   # FTS5 virtual table for full-text search

-- Configuration
settings              # key, value (JSON), type
```

### Database Module Pattern

All modules follow this consistent factory pattern:

```javascript
import { is, hasValue } from '../utils/validators';
import { safeTrim } from '../utils/stringHelpers';
import { buildInsert, buildUpdateSet, pick, placeholders } from './sqlHelpers';
import { logger } from '../errors/utils/errorLogger';
import { DatabaseError } from '../errors/database/DatabaseError';

export function createXyzDB({ execute, batch, transaction }) {
  // Validate dependencies
  if (!is.function(execute)) {
    throw new DatabaseError('execute is required', 'MODULE_INIT_ERROR');
  }

  return {
    async create(data) {
      try {
        // 1. Validate required fields
        if (!hasValue(data?.field_name)) {
          throw new DatabaseError('field_name is required', 'VALIDATION_ERROR');
        }

        // 2. Pick allowed fields and build SQL
        const allowed = pick(data, ALLOWED_FIELDS);
        const { sql, values } = buildInsert('table_name', allowed);

        // 3. Execute and return full object
        const result = await execute(sql, values);

        if (!result.insertId) {
          throw new DatabaseError('Insert failed', 'INSERT_FAILED');
        }

        logger.success('XyzDB', 'create', { id: result.insertId });
        return this.getById(result.insertId);
      } catch (error) {
        logger.error('XyzDB', 'create', error, { data });
        throw error;
      }
    },

    async getById(id) {
      try {
        const result = await execute(
          'SELECT * FROM table_name WHERE id = ?',
          [id]
        );
        return result.rows[0] || null;
      } catch (error) {
        logger.error('XyzDB', 'getById', error, { id });
        throw new DatabaseError('Failed to get record', 'QUERY_ERROR', error);
      }
    },

    async getAll(options = {}) {
      // Filtering, pagination, ordering
    },

    async update(id, data) {
      try {
        const allowed = pick(data, UPDATABLE_FIELDS);
        const { sql, values } = buildUpdateSet(allowed);

        if (!sql) {
          throw new DatabaseError('No fields to update', 'VALIDATION_ERROR');
        }

        await execute(
          `UPDATE table_name SET ${sql} WHERE id = ?`,
          [...values, id]
        );

        logger.success('XyzDB', 'update', { id });
        return this.getById(id);
      } catch (error) {
        logger.error('XyzDB', 'update', error, { id, data });
        throw error;
      }
    },

    async delete(id) {
      try {
        await execute('DELETE FROM table_name WHERE id = ?', [id]);
        logger.success('XyzDB', 'delete', { id });
      } catch (error) {
        logger.error('XyzDB', 'delete', error, { id });
        throw new DatabaseError('Failed to delete', 'DELETE_ERROR', error);
      }
    }
  };
}
```

### Database API Surface

```javascript
const database = {
  // Lifecycle
  init(options),
  isInitialized(),
  getDB(),

  // Low-level primitives
  execute(sql, params),
  batch(statements),
  transaction(work),

  // Entity modules
  contacts,
  companies,
  contactsInfo,
  interactions,
  events,
  notes,
  attachments,
  categories,
  categoriesRelations,
  eventsRecurring,
  eventsReminders,
  interactionsSearch,
  interactionsStats,

  // Configuration
  settings
};
```

---

## Services & Business Logic

### Service Modules (8 files, 209 KB)

**authService.js** (26 KB) - Authentication & security
- PIN-based auth (4-8 digits, configurable)
- Biometric authentication (fingerprint, face recognition)
- Brute-force protection (3-tier lockout system)
- Auto-lock with configurable timeout (default 5 minutes)
- Secure storage via expo-secure-store
- Event broadcaster for lock/unlock events
- Hash validation with expo-crypto

**backupService.js** (47 KB - largest service)
- Export database to JSON/CSV
- Import with conflict resolution strategies
- Auto-backup scheduling
- Progress tracking with event emitters
- Supports all 13 tables
- Includes backup/restore validation

**contactSyncService.js** (25 KB)
- Import device contacts via expo-contacts
- Export CRM contacts to device
- Field mapping and normalization
- Conflict resolution (skip, replace, merge)
- Permission management
- Batch processing for performance

**fileService.js** (17 KB)
- File validation (MIME type, size limits)
- Thumbnail generation (150x150 pixels)
- Secure storage in app sandbox
- Cleanup utilities for orphaned files
- Max file size: 10MB
- Supported formats: images, PDFs, common docs

**notificationService.js** (36 KB)
- Event reminder scheduling
- Local notifications via Expo
- User preference management
- Notification permission handling
- Background notification support

**services/backup/** - CSV export utilities
- Table-specific CSV formatting
- Header row generation
- Field escaping and encoding
- Authentication integration

### Service Pattern

```javascript
import { logger } from '../errors/utils/errorLogger';
import { ServiceError } from '../errors/services/ServiceError';
import { is } from '../utils/validators';

class MyService {
  constructor() {
    this.initialized = false;
    this.listeners = [];
  }

  async initialize() {
    try {
      if (this.initialized) return;

      // One-time setup
      await this.setupLogic();

      this.initialized = true;
      logger.success('MyService', 'initialize');
    } catch (error) {
      logger.error('MyService', 'initialize', error);
      throw new ServiceError('MyService', 'initialize', error, 'INIT_FAILED');
    }
  }

  addListener(callback) {
    if (!is.function(callback)) {
      throw new ServiceError('MyService', 'addListener',
        new Error('Callback must be a function'), 'INVALID_CALLBACK');
    }

    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async doWork(input) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Business logic
      const result = await this.performOperation(input);

      logger.success('MyService', 'doWork', { result });
      return result;
    } catch (error) {
      logger.error('MyService', 'doWork', error, { input });
      throw new ServiceError('MyService', 'doWork', error, 'OPERATION_FAILED');
    }
  }
}

export default new MyService();
```

---

## UI Components & Screens

### Screens (6 files, 92 KB)

**ContactsList** (11 KB)
- Contact list with search
- Filter by favorites/categories
- Swipe actions (customizable in settings)
- Bottom sheet filters
- Pull-to-refresh
- Add contact FAB

**ContactDetailScreen** (25 KB - largest screen)
- Full contact details display
- Phone/email/address sections
- Interaction history timeline
- Notes and attachments
- Edit/delete actions
- Avatar management with image picker
- Call/SMS/email integration

**InteractionsScreen** (8 KB)
- Activity timeline for all contacts
- Filter by type (call, email, meeting, etc.)
- Date range filtering
- Add interaction FAB
- Pull-to-refresh

**EventsList** (8 KB)
- Upcoming events list
- Past events section
- Filter by date range
- Add event FAB
- Reminder status indicators

**SettingsScreen** (14 KB)
- Theme selection (light/dark/system)
- Language selection (5 languages)
- PIN setup/change
- Biometric toggle
- Auto-lock timeout configuration
- Swipe action customization (left/right)
- Data management (backup/restore/reset)

**AuthLockScreen** (4 KB)
- PIN entry with keypad
- Biometric prompt button
- Lockout countdown display
- Error message handling

**PinSetupScreen** (2 KB)
- Initial PIN setup flow
- PIN confirmation step
- Validation (4-8 digits)

### Components (8 files, 116 KB)

**Modal Components**:
1. **AddContactModal** (17 KB) - Contact creation form with validation
2. **EditContactModal** (16 KB) - Contact editing form
3. **AddInteractionModal** (18 KB) - Interaction creation with contact selector
4. **AddEventModal** (20 KB - largest) - Event creation with date/time pickers
5. **InteractionDetailModal** (8 KB) - View/edit interaction details

**Display Components**:
6. **ContactCard** (4 KB) - List item with avatar, name, phone, favorite indicator
7. **ContactAvatar** (2 KB) - Profile picture or initials with theming
8. **InteractionCard** (4 KB) - Timeline item with icon, date, summary

### Navigation Structure

```
Stack Navigator
  ├─ MainTabs (React Native Paper BottomNavigation)
  │   ├─ Contacts Tab → ContactsList
  │   ├─ Interactions Tab → InteractionsScreen
  │   ├─ Events Tab → EventsList
  │   └─ Settings Tab → SettingsScreen
  ├─ ContactDetail Screen (Modal presentation)
  └─ PinSetup Screen (Modal presentation)
```

---

## Utilities & Helpers

### ✅ Validation Helpers (validators.js - 4 KB)

**Type Checking** (`is.*` namespace):
```javascript
is.string(val)       // typeof val === 'string'
is.number(val)       // typeof val === 'number' && !isNaN(val)
is.integer(val)      // Number.isInteger(val)
is.boolean(val)      // typeof val === 'boolean'
is.array(val)        // Array.isArray(val)
is.object(val)       // Non-null object, not array
is.date(val)         // Valid Date instance
is.function(val)     // typeof val === 'function'
is.null(val)         // val === null
is.undefined(val)    // val === undefined
is.nullish(val)      // val == null
is.empty(val)        // Empty string/array/object or nullish
```

**Format Validation**:
```javascript
isValidEmail(email)           // Email regex validation
isValidPhone(phone)           // 10 or 11 digit validation
isPositiveInteger(val)        // Integer >= 1
isNonNegativeInteger(val)     // Integer >= 0
```

**Data Validation**:
```javascript
validateRequired(data, rules) // Batch required field validation
hasValue(value)               // Non-empty check with type awareness
```

**Usage**:
- 19+ database files
- 2+ services (fileService, notificationService)
- 2+ utilities (stringHelpers, dateUtils)
- **Impact**: 116+ duplicate patterns eliminated

### ✅ String Helpers (stringHelpers.js - 4.8 KB)

```javascript
safeTrim(value)                    // Null-safe String(value || '').trim()
normalizeTrimLowercase(value)      // Trim and lowercase
hasContent(value)                  // Non-empty after trim
filterNonEmpty(items, field)       // Filter objects by field content
filterNonEmptyStrings(items)       // Filter non-empty strings from array
capitalize(value)                  // First letter uppercase
truncate(value, maxLength, suffix) // Smart truncation with validation
getContactDisplayName(contact, fallback) // Compute display name from contact
```

**Usage**:
- 15 files across components, hooks, services, database
- **Impact**: 43 duplicate `.trim()` patterns eliminated (100% migration)

### Date Utilities (dateUtils.js - 18 KB)

```javascript
getPrimaryLocale()                  // Device locale detection
parseLocalDate(dateString)          // YYYY-MM-DD → local Date (no UTC issues)
formatDateToString(date)            // Date → YYYY-MM-DD
formatDateSmart(dateString, locale) // Human-readable format
isFuture(dateString)                // Date comparison
isToday(dateString)                 // Today check
isPast(dateString)                  // Past check
compareDates(date1, date2)          // -1, 0, 1 comparison
addDays(dateString, days)           // Date arithmetic
subtractDays(dateString, days)      // Date arithmetic
```

**Key Design Decision**: Database stores dates as YYYY-MM-DD strings to avoid UTC timezone conversion issues. All date utilities work with these string representations.

**Usage**: All event/interaction date handling, date pickers, formatting

### ✅ SQL Helpers (sqlHelpers.js)

```javascript
placeholders(count)           // Generate "?, ?, ?" for N parameters
pick(obj, fields)             // Extract allowed fields from object
buildUpdateSet(data)          // Generate "field=?, field=?" with values
buildInsert(table, data)      // Complete INSERT statement with placeholders
```

**Usage**:
- 8 database modules (contacts, companies, categories, events, interactions, notes, contactsInfo, attachments)
- **Impact**: 40+ duplicate SQL patterns eliminated (100% migration)

### ✅ File Helpers (fileHelpers.js)

```javascript
getFileExtension(filename)    // Extract file extension (lowercase)
isImageFile(filename)         // Check if file is an image by extension
formatFileSize(bytes, decimals) // Format bytes to human-readable size
```

**Supported Image Formats**:
- Common: jpg, jpeg, png, gif, webp
- Modern: heic, heif (iOS), avif (AV1 Image Format)

**Usage**:
- fileService.js for MIME type detection and file handling
- **Impact**: 2 duplicate file extension patterns eliminated (100% migration)

### ✅ Permission Helpers (permissionHelpers.js)

```javascript
requestPermission(requestFn, permissionName, customMessage)
  // Request permission with user feedback
  // Returns: Promise<boolean>

checkPermission(checkFn, permissionName)
  // Check permission status without requesting
  // Returns: Promise<boolean>
```

**Features**:
- Consistent error messaging and user alerts
- Automatic logging (success/warn/error)
- Try-catch wrapper for safety
- Custom message support

**Usage**:
- ContactDetailScreen.js (ImagePicker media library permission)
- AddContactModal.js (Expo Contacts permission)
- **Impact**: 2 duplicate permission UI patterns eliminated (100% migration)
- **Note**: Service-level abstractions (notificationService, contactSyncService) already exist

---

## Error Handling

### Error Hierarchy

```
Error (JavaScript built-in)
└── AppError (base/AppError.js)
    ├── DatabaseError (database/DatabaseError.js)
    ├── ServiceError (services/ServiceError.js)
    ├── ValidationError (ui/ValidationError.js)
    └── UIError (ui/UIError.js)
```

### Error Classes

**AppError** (base/AppError.js) - Base custom error
- Properties: `message`, `code`, `originalError`, `context`, `timestamp`
- Methods: `toJSON()`, `getUserMessage()`
- Serializable for logging and debugging

**DatabaseError** (database/DatabaseError.js)
- Methods: `isConstraintError()`, `isNotFoundError()`, `isValidationError()`
- Codes: `DB_ERROR`, `SQL_ERROR`, `TX_ERROR`, `FOREIGN_KEY_VIOLATION`, `RECORD_NOT_FOUND`, `VALIDATION_ERROR`, `MODULE_INIT_ERROR`, `INSERT_FAILED`, `UPDATE_FAILED`, `DELETE_ERROR`, `QUERY_ERROR`

**ServiceError** (services/ServiceError.js)
- Service-specific error codes
- Captures service name and operation
- Includes original error for stack traces

**ValidationError** (ui/ValidationError.js)
- Form validation failures
- Field-level error messages
- User-friendly error text

**UIError** (ui/UIError.js)
- UI-layer failures
- Component-specific errors

### ✅ Error Utilities (100% Complete)

**errorLogger.js** (211 lines) - Centralized logging
```javascript
logger.success(component, operation, details)
logger.error(component, operation, error, context)
logger.warn(component, message, context)
logger.info(component, message, context)
logger.debug(component, message, data)
```

**Features**:
- Timestamped structured logging
- Component/operation context
- Development-only logs (info/debug/success)
- Safe runtime checks for `__DEV__`
- Standardized error format

**Usage**: 236+ instances across all database/service modules

**errorHandler.js** - User-friendly error handling
```javascript
handleError(error, options)            // Global error handler
getUserFriendlyError(error)            // Convert to user message
withUIErrorHandling(fn)                // Higher-order error wrapper

showAlert.error(title, message)        // Error alerts
showAlert.success(title, message)      // Success alerts
showAlert.info(title, message)         // Info alerts
showAlert.confirm(title, msg, onConfirm, onCancel) // Confirmation
showAlert.confirmDelete(title, msg, onConfirm)     // Destructive confirm
```

**Usage**: 55/55 instances (100% migrated across all screens/components)

### Error Handling Pattern

```javascript
// Database Layer: Throw DatabaseError, no try-catch (errors bubble up)
async create(data) {
  if (!hasValue(data?.first_name)) {
    throw new DatabaseError('first_name is required', 'VALIDATION_ERROR');
  }
  // ... perform operation, let errors bubble
}

// Service Layer: Try-catch with logger.error
async someOperation() {
  try {
    const result = await databaseModule.operation();
    logger.success('ServiceName', 'someOperation');
    return result;
  } catch (error) {
    logger.error('ServiceName', 'someOperation', error);
    throw error; // Re-throw for UI layer
  }
}

// UI Layer: Try-catch with logger + showAlert
async handleSubmit() {
  try {
    await service.someOperation();
    showAlert.success('Success', 'Operation completed');
  } catch (error) {
    logger.error('ComponentName', 'handleSubmit', error);
    showAlert.error('Error', getUserFriendlyError(error));
  }
}
```

---

## Authentication & Security

### Authentication Flow

1. **App startup** → Check if PIN or biometric configured
2. **If configured** → Show `AuthLockScreen` with locked state
3. **User authenticates** → PIN entry or biometric prompt
4. **Validation** → `authService.authenticate()`
5. **Success** → Unlock app, hide lock screen
6. **Failure** → Show error, increment failed attempts, apply lockout if needed
7. **If not configured** → Show app unlocked

### PIN Security

- **Length**: 4-8 digits (configurable via `MIN_PIN_LENGTH`, `MAX_PIN_LENGTH`)
- **Storage**: Secure hash in expo-secure-store (key: `pin_hash`)
- **Hashing**: expo-crypto with salt
- **Validation**: Constant-time comparison to prevent timing attacks
- **Brute-force protection**: 3-tier lockout system
  - After 3 failed attempts: 30 second lockout
  - After 5 failed attempts: 5 minute lockout
  - After 10 failed attempts: 30 minute lockout

### Biometric Authentication

- **Support**: Fingerprint, Face ID, Face Recognition
- **Fallback**: PIN entry if biometric unavailable
- **Preference**: Stored in AsyncStorage (key: `biometric_enabled`)
- **Error handling**: Lockout, cancellation, system error codes
- **Security**: Uses expo-local-authentication's secure enclave

### Auto-Lock

- **Configurable timeout**: Default 5 minutes (stored in settings)
- **Trigger**: App goes to background + timeout expires
- **Behavior**: Shows lock screen overlay on top of current screen
- **Settings**: Managed via SettingsScreen with database persistence

### AuthContext API

```javascript
const {
  isLocked,              // boolean - Current lock state
  initializing,          // boolean - Still loading auth state
  authenticate,          // (options?) => Promise<boolean>
  lock,                  // () => void
  unlock,                // () => void
  refresh                // () => Promise<void>
} = useAuth();
```

**Usage**: Consumed by `AuthGate` component, `SettingsScreen`, `PinSetupScreen`

---

## Configuration

### Expo Configuration (app.json)

```json
{
  "expo": {
    "name": "test-fresh",
    "slug": "test-fresh",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "icon": "./assets/icon.png",
    "plugins": [
      "expo-secure-store",
      "expo-localization",
      "expo-sqlite"
    ],
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "ios": {
      "supportsTablet": true
    }
  }
}
```

### Package Scripts

```bash
npm start              # Expo development server
npm run android        # Run on Android device/emulator
npm run ios            # Run on iOS simulator
npm run web            # Run in web browser
npm test               # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

### Babel Configuration (babel.config.js)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

Uses `babel-preset-expo` for Expo-optimized transpilation with React Native support.

### Jest Configuration (jest.setup.js + package.json)

**jest.setup.js**:
- Mocks `expo-localization` to return `en-US` locale
- Suppresses console output during tests (optional)

**package.json jest config**:
```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": ["node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|...)"],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "collectCoverageFrom": ["src/**/*.{js,jsx}", "!src/**/*.test.{js,jsx}", "!src/**/__tests__/**"],
    "testMatch": ["**/__tests__/**/*.test.js", "**/?(*.)+(spec|test).js"]
  }
}
```

---

## Testing

### Test Framework

- **Jest** 29.7.0 - Testing framework
- **@testing-library/react-native** 12.9.0 - Component testing utilities
- **jest-expo** 54.0.3 - Expo-specific Jest preset
- **react-test-renderer** 19.1.0 - React component renderer

### Test Files

```
src/
  utils/__tests__/
    └── dateUtils.test.js        # Date utility tests
  services/__mocks__/            # Service mocks
  services/backup/__mocks__/     # Backup module mocks
```

### Coverage Configuration

- **Include**: `src/**/*.{js,jsx}`
- **Exclude**:
  - Test files: `src/**/*.test.{js,jsx}`
  - Test directories: `src/**/__tests__/**`

### Test Pattern Example

```javascript
import { parseLocalDate, formatDateSmart } from '../dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD to local Date', () => {
      const date = parseLocalDate('2025-11-07');
      expect(date).toEqual(new Date(2025, 10, 7)); // Month is 0-indexed
    });

    it('returns null for invalid date string', () => {
      expect(parseLocalDate('invalid')).toBeNull();
    });
  });

  describe('formatDateSmart', () => {
    it('formats today as "Today"', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(formatDateSmart(today)).toBe('Today');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for TDD
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Code Patterns & Conventions

### Pattern 1: Database Module Factory

```javascript
import { is, hasValue } from '../utils/validators';
import { buildInsert, buildUpdateSet, pick } from './sqlHelpers';
import { logger } from '../errors/utils/errorLogger';
import { DatabaseError } from '../errors/database/DatabaseError';

export function createXyzDB({ execute, batch, transaction }) {
  // Validate dependencies at module initialization
  if (!is.function(execute)) {
    throw new DatabaseError('execute is required', 'MODULE_INIT_ERROR');
  }

  return {
    create,
    getById,
    getAll,
    update,
    delete: deleteById
  };
}
```

**Benefits**:
- Dependency injection for testability
- Explicit dependencies
- Mockability
- Consistent API across all modules

### Pattern 2: TanStack Query Hooks

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import database from '../database';

// Query keys for cache management
export const contactKeys = {
  all: ['contacts'],
  lists: () => [...contactKeys.all, 'list'],
  list: (filters) => [...contactKeys.lists(), filters],
  details: () => [...contactKeys.all, 'detail'],
  detail: (id) => [...contactKeys.details(), id],
};

// Fetch hook with caching
export function useContacts(options = {}) {
  return useQuery({
    queryKey: contactKeys.list(options),
    queryFn: () => database.contacts.getAll(options),
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes (formerly cacheTime)
    ...options,
  });
}

// Mutation hook with cache invalidation
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => database.contacts.create(data),
    onSuccess: (newContact) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: contactKeys.all });

      // Optional: optimistically update cache
      queryClient.setQueryData(
        contactKeys.detail(newContact.id),
        newContact
      );
    },
    onError: (error) => {
      logger.error('useCreateContact', 'mutation', error);
    },
  });
}
```

**Benefits**:
- Automatic caching and background refetching
- Consistent cache invalidation
- Loading/error states handled automatically
- Optimistic updates support

### Pattern 3: Error Handling with Logging

```javascript
import { logger } from '../errors/utils/errorLogger';
import { DatabaseError } from '../errors/database/DatabaseError';

async create(data) {
  try {
    // Perform operation
    const result = await execute(sql, values);

    // Log success in development
    logger.success('ContactsDB', 'create', { id: result.insertId });

    return result;
  } catch (error) {
    // Log error with context
    logger.error('ContactsDB', 'create', error, { data });

    // Transform to typed error
    if (error.message.includes('FOREIGN KEY')) {
      throw new DatabaseError('Related record not found', 'FOREIGN_KEY_VIOLATION', error);
    }

    throw new DatabaseError('Failed to create contact', 'INSERT_FAILED', error);
  }
}
```

### Pattern 4: Input Validation

```javascript
import { is, hasValue, validateRequired } from '../utils/validators';
import { safeTrim } from '../utils/stringHelpers';

async function handleSubmit(formData) {
  // Batch validation
  const { valid, errors } = validateRequired(formData, [
    { field: 'first_name', label: 'First name' },
    { field: 'email', label: 'Email address' }
  ]);

  if (!valid) {
    showAlert.error('Validation Error', errors.first_name || errors.email);
    return;
  }

  // Type validation
  if (formData.age && !is.number(formData.age)) {
    showAlert.error('Validation Error', 'Age must be a number');
    return;
  }

  // Normalize strings
  const normalized = {
    ...formData,
    first_name: safeTrim(formData.first_name),
    email: safeTrim(formData.email).toLowerCase()
  };

  // Proceed with submission
  await submitData(normalized);
}
```

### Pattern 5: Optimistic Updates with Rollback

```javascript
import { useState, useCallback } from 'react';
import { logger } from '../errors/utils/errorLogger';

const setMapping = useCallback(async (leftAction, rightAction) => {
  // Save previous state
  const prevLeft = leftSwipeAction;
  const prevRight = rightSwipeAction;

  // Optimistic update
  setLeftSwipeAction(leftAction);
  setRightSwipeAction(rightAction);

  try {
    // Persist to database
    await database.settings.set('left_swipe_action', leftAction);
    await database.settings.set('right_swipe_action', rightAction);

    logger.success('Settings', 'setMapping');
  } catch (error) {
    // Rollback on failure
    logger.error('Settings', 'setMapping', error);
    setLeftSwipeAction(prevLeft);
    setRightSwipeAction(prevRight);

    showAlert.error('Error', 'Failed to save swipe actions');
    throw error;
  }
}, [leftSwipeAction, rightSwipeAction]);
```

### Naming Conventions

- **Components**: `PascalCase` (ContactCard, AddEventModal)
- **Functions**: `camelCase` (getContactDisplayName, handleSubmit)
- **Constants**: `UPPER_SNAKE_CASE` (MIN_PIN_LENGTH, ALLOWED_FIELDS)
- **Files**:
  - Components: `PascalCase.js`
  - Utilities/modules: `camelCase.js`
- **Database modules**: `camelCase` with implied "DB" suffix (contactsDB usage)
- **Hooks**: `use` prefix (useContacts, useAuth)
- **Context**: `Context` suffix (AuthContext, SettingsContext)

---

## Internationalization

### Supported Languages (5)

1. **English** (en) - 9.2 KB - Default
2. **Spanish** (es) - 9.8 KB
3. **French** (fr) - 10.3 KB
4. **German** (de) - 10.2 KB
5. **Chinese Simplified** (zh-Hans) - 9 KB

### Translation Files

Located in `src/locales/` (JSON format):
```
locales/
├── en.json       # English (default)
├── es.json       # Spanish
├── fr.json       # French
├── de.json       # German
└── zh-Hans.json  # Chinese Simplified
```

### i18n Setup (src/i18n/index.js)

```javascript
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPrimaryLocale } from '../utils/dateUtils';

// Import translation files
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import zh from '../locales/zh-Hans.json';

// Detect device language
const deviceLang = getPrimaryLocale().split('-')[0]; // "en-US" -> "en"

i18next.use(initReactI18next).init({
  resources: { en, es, fr, de, zh },
  lng: deviceLang,
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'de', 'fr', 'zh'],
  interpolation: {
    escapeValue: false // React already escapes
  }
});

export default i18next;
```

### Usage in Components

```javascript
import { useTranslation } from 'react-i18next';

export default function MyComponent() {
  const { t, i18n } = useTranslation();

  // Simple translation
  const title = t('navigation.contacts');

  // Translation with interpolation
  const greeting = t('screens.welcome', { name: user.name });

  // Change language
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View>
      <Text>{title}</Text>
      <Text>{greeting}</Text>
    </View>
  );
}
```

### Translation Key Structure

```
translation.json:
{
  "navigation": {
    "contacts": "Contacts",
    "interactions": "Interactions",
    "events": "Events",
    "settings": "Settings"
  },
  "screens": {
    "contacts": {
      "title": "Contacts",
      "searchPlaceholder": "Search contacts...",
      "noResults": "No contacts found"
    }
  },
  "components": {
    "contactCard": {
      "noPhone": "No phone",
      "favorite": "Favorite"
    }
  },
  "errors": {
    "generic": "Something went wrong",
    "network": "Network error"
  },
  "validation": {
    "required": "{{field}} is required",
    "invalidEmail": "Invalid email address"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "categories": {
    "work": "Work",
    "personal": "Personal",
    "family": "Family"
  },
  "settings": {
    "theme": "Theme",
    "language": "Language",
    "security": "Security"
  }
}
```

---

## Development Status

### Current Phase: Helper Functions Implementation

**Overall Progress**: **8/12 categories complete (67%)**
**Instances Addressed**: **535+ / 586+ (91%)**

### ✅ Completed Categories (8/12)

#### 1. Error Handling & Logging ✅
- **File**: `errors/utils/errorLogger.js` (211 lines)
- **Functions**: `logger.error()`, `logger.success()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- **Instances**: 236+ migrated
- **Files**: All database modules (21), all services (8), infrastructure
- **Impact**: Standardized error logging with timestamps, component/operation context

#### 2. Alert Dialog Helpers ✅
- **File**: `errors/utils/errorHandler.js`
- **Functions**: `showAlert.error()`, `showAlert.success()`, `showAlert.info()`, `showAlert.confirm()`, `showAlert.confirmDelete()`
- **Instances**: 55/55 (100%)
- **Files**: All screens (6), all components (8)
- **Impact**: Consistent user-facing alerts, eliminated all direct `Alert.alert()` calls

#### 3. String Manipulation ✅
- **File**: `utils/stringHelpers.js` (4.8 KB)
- **Functions**: 7 helpers (safeTrim, normalizeTrimLowercase, hasContent, filterNonEmpty, filterNonEmptyStrings, capitalize, truncate)
- **Instances**: 43/43 (100%)
- **Files**: 15 files migrated
- **Impact**: Zero remaining manual `.trim()` operations, consistent string handling

#### 4. SQL Building ✅
- **File**: `database/sqlHelpers.js`
- **Functions**: 4 core helpers (placeholders, pick, buildUpdateSet, buildInsert)
- **Instances**: 40+/40+ (100%)
- **Files**: 8 database modules
- **Impact**: Eliminated duplicate SQL building code, consistent query construction

#### 5. Validation Helpers ✅
- **File**: `utils/validators.js` (4 KB)
- **Functions**: 15+ validators (is.*, isValidEmail, isValidPhone, isPositiveInteger, isNonNegativeInteger, validateRequired, hasValue)
- **Instances**: 116+/116+ (100%)
- **Files**: 23 files (19 DB, 2 services, 2 utils)
- **Impact**: Zero remaining typeof/Array.isArray patterns, type-safe validation

#### 6. Contact Helpers ✅
- **File**: `utils/contactHelpers.js`
- **Functions**: 4 helpers (getContactDisplayName, getInitials, normalizePhoneNumber, formatPhoneNumber)
- **Instances**: 16/16 (100%)
- **Files**: 11 files migrated (7 components, 2 screens, 1 service, 1 database)
- **Enhancements**:
  - getInitials() with Unicode support (multi-byte characters, emoji)
  - formatPhoneNumber() with international number preservation
  - Screen wrappers preserve '+' prefix for tel: URLs
- **Impact**: Zero remaining duplicate contact formatting code

#### 7. TanStack Query Helpers ✅
- **File**: `hooks/queries/queryHelpers.js` (131 lines)
- **Functions**: 2 helpers (invalidateQueries, createMutationHandlers)
- **Instances**: 27/27 (100%)
- **Files**: 4 query hook files (useContactQueries, useEventQueries, useInteractionQueries, useNoteQueries)
- **Features**:
  - invalidateQueries() - Parallel invalidation of multiple query keys
  - createMutationHandlers() - Standardized onSuccess/onError with automatic invalidation
  - Supports custom success/error callbacks
  - Consistent error logging with context for all mutations
- **Impact**: Eliminated 27 duplicate query invalidation patterns, centralized mutation logic

#### 8. File & Format Helpers ✅
- **File**: `utils/fileHelpers.js` (2.7 KB)
- **Functions**: 3 helpers (getFileExtension, isImageFile, formatFileSize)
- **Instances**: 2/2 (100%)
- **Files**: 1 file migrated (fileService.js)
- **Features**:
  - getFileExtension() - Safe file extension extraction with validation
  - isImageFile() - Image type detection by extension (jpg, png, gif, webp, heic, heif, avif)
  - formatFileSize() - Human-readable byte formatting with robust validation (Bytes, KB, MB, GB, TB)
- **Impact**: Eliminated duplicate file extension extraction patterns, consistent file handling

#### 9. Permission Request Helpers ✅
- **File**: `utils/permissionHelpers.js` (3.2 KB)
- **Functions**: 2 helpers (requestPermission, checkPermission)
- **Instances**: 2/2 (100%)
- **Files**: 2 UI files migrated (ContactDetailScreen.js, AddContactModal.js)
- **Features**:
  - requestPermission() - Request permission with user feedback and error handling
  - checkPermission() - Check permission status without requesting
- **Impact**: Consistent permission UX, centralized error handling, DRY principle
- **Note**: Service files (notificationService, contactSyncService) already have proper abstraction

### ⏳ Remaining Categories (2/12)

1. **Array Utilities** (4+ instances)
   - chunk, unique, uniqueBy

2. **Component Patterns** (10+ instances)
   - useAsyncOperation, loading state management

### Code Quality Metrics

| Metric | Value |
|--------|-------|
| Source Files | 79 JS files |
| Total Size | 994 KB (710,042 bytes) |
| Database Modules | 21 core + 9 migrations |
| Service Modules | 8 services |
| Components | 8 UI components |
| Screens | 6 screens |
| Utility Modules | 6 helpers (validators, stringHelpers, contactHelpers, fileHelpers, permissionHelpers, dateUtils) |
| Query Helpers | 1 helper (queryHelpers) |
| Error Classes | 5 error types |
| Helper Functions | 49+ functions across 8 utilities |
| Duplicate Patterns Identified | 591+ |
| Patterns Eliminated | 537+ (91%) |
| Code Reduction | ~400 lines |
| Test Coverage | dateUtils tested, expanding |

### Next Steps (Priority Order)

**Week 2: Contact & Query Utilities**
1. Contact formatting helpers (display name, initials, phone normalization)
2. TanStack Query helpers (invalidation patterns)

**Week 3: File & Array Utilities**
3. File handling helpers (extension, MIME type, size formatting)
4. Array utilities (chunk, unique, uniqueBy)

**Week 4: Component Patterns**
5. Permission request helpers
6. Async operation hooks
7. Loading state patterns

---

## Quick Start

### Development Setup

```bash
# Clone repository
git clone https://github.com/Masked-Kunsiquat/crm-orbit2.git
cd crm-orbit/test-fresh

# Install dependencies
npm install

# Start development server
npm start

# Run on device
npm run android  # Android
npm run ios      # iOS
```

### Creating a Contact (with TanStack Query)

```javascript
import { useCreateContactWithDetails } from '../hooks/queries/useContactQueries';

function MyComponent() {
  const createContact = useCreateContactWithDetails();

  const handleCreateContact = async () => {
    try {
      await createContact.mutateAsync({
        first_name: 'John',
        last_name: 'Doe',
        company_id: 1,
        contact_info: [
          { type: 'phone', value: '555-1234', label: 'Mobile', is_primary: true },
          { type: 'email', value: 'john@example.com', label: 'Work', is_primary: true }
        ]
      });

      showAlert.success('Success', 'Contact created!');
    } catch (error) {
      logger.error('MyComponent', 'handleCreateContact', error);
      showAlert.error('Error', getUserFriendlyError(error));
    }
  };

  return (
    <Button
      onPress={handleCreateContact}
      loading={createContact.isPending}
    >
      Create Contact
    </Button>
  );
}
```

### Querying Contacts with Relations

```javascript
import { useContactsWithInfo } from '../hooks/queries/useContactQueries';

function ContactsList() {
  const { data: contacts, isLoading, error, refetch } = useContactsWithInfo();

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error loading contacts</Text>;

  return (
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <ContactCard
          contact={item}
          phones={item.phones}      // Included via join
          emails={item.emails}      // Included via join
          categories={item.categories} // Included via join
        />
      )}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

### Error Handling Pattern

```javascript
import { logger } from '../errors/utils/errorLogger';
import { showAlert } from '../errors/utils/errorHandler';
import { ServiceError } from '../errors/services/ServiceError';

async function myServiceOperation(data) {
  try {
    const result = await database.contacts.create(data);
    logger.success('MyService', 'myServiceOperation', { id: result.id });
    return result;
  } catch (error) {
    logger.error('MyService', 'myServiceOperation', error, { data });
    throw new ServiceError('MyService', 'myServiceOperation', error, 'OPERATION_FAILED');
  }
}

// In component
async function handleSubmit() {
  try {
    await myServiceOperation(formData);
    showAlert.success('Success', 'Operation completed');
  } catch (error) {
    showAlert.error('Error', getUserFriendlyError(error));
  }
}
```

### Validation Example

```javascript
import { validateRequired, isValidEmail, hasValue } from '../utils/validators';
import { safeTrim } from '../utils/stringHelpers';
import { showAlert } from '../errors/utils/errorHandler';

async function handleContactSubmit(formData) {
  // Batch required field validation
  const { valid, errors } = validateRequired(formData, [
    { field: 'first_name', label: 'First name' },
    { field: 'email', label: 'Email' }
  ]);

  if (!valid) {
    showAlert.error('Validation Error', Object.values(errors)[0]);
    return;
  }

  // Format validation
  const email = safeTrim(formData.email);
  if (hasValue(email) && !isValidEmail(email)) {
    showAlert.error('Validation Error', 'Invalid email address');
    return;
  }

  // Proceed with submission
  const normalized = {
    ...formData,
    first_name: safeTrim(formData.first_name),
    last_name: safeTrim(formData.last_name),
    email: email.toLowerCase()
  };

  await createContact(normalized);
}
```

---

## Conclusion

Expo CRM is a production-ready React Native application with:

✅ **Clean Architecture**
- Layered design with clear separation of concerns
- Modular database layer with factory pattern
- Service-oriented business logic
- Component-based UI with React Native Paper

✅ **Strong Error Handling**
- Typed error hierarchy (AppError, DatabaseError, ServiceError, etc.)
- Centralized logging with `errorLogger.js` (236+ usages)
- User-friendly alerts with `errorHandler.js` (55+ usages)
- Consistent error propagation across layers

✅ **Comprehensive Validation**
- Runtime type checking with `validators.js` (116+ usages)
- String manipulation with `stringHelpers.js` (43+ usages)
- SQL building with `sqlHelpers.js` (40+ usages)
- Format validation (email, phone, dates)

✅ **Active Improvement**
- Systematic helper function implementation (5/12 categories complete)
- 82% reduction in duplicate code patterns (490+ instances eliminated)
- Documented migration with AUDIT-RESULTS.md
- Continuous refactoring for maintainability

✅ **User Features**
- Multi-language support (5 languages)
- Dark mode with system detection
- Offline-first with SQLite storage
- Secure PIN + biometric authentication
- Contact sync with device contacts
- Backup/restore functionality

✅ **Developer Experience**
- Consistent code patterns and conventions
- Reusable utilities and helpers
- TanStack Query for data management
- Jest testing framework setup
- Comprehensive documentation

**The application is actively maintained with ongoing code quality improvements and systematic refactoring to eliminate duplicate patterns and improve maintainability.**

---

**Version**: 1.1
**Updated**: November 7, 2025
**Maintained By**: CRM Orbit Team
**Repository**: https://github.com/Masked-Kunsiquat/crm-orbit2

