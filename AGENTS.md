# CRM App Development Agent Instructions

## Project Overview
Build an offline-first CRM mobile application using Expo/React Native for Android. Focus on robust backend architecture first, then UI development.

## Technology Stack
- **Framework**: Expo (React Native)
- **UI Library**: UI Kitten
- **Database**: SQLite (expo-sqlite)
- **Authentication**: Expo Local Authentication
- **Notifications**: Expo Notifications
- **File System**: Expo FileSystem
- **Storage**: AsyncStorage for settings

## Project Structure
```
src/
├── components/           # Reusable UI components
├── screens/             # Screen components
├── database/            # Database layer (modular)
│   ├── index.js        # Database orchestrator
│   ├── contacts.js     # Contact operations
│   ├── events.js       # Events operations
│   ├── interactions.js # Interaction operations
│   ├── notes.js        # Notes operations
│   ├── categories.js   # Categories operations
│   ├── attachments.js  # Attachments operations
│   ├── companies.js    # Companies operations
│   ├── settings.js     # Settings & preferences
│   └── migrations/     # Database migrations
├── services/           # Business logic services
│   ├── fileService.js  # File management
│   ├── authService.js  # Local authentication
│   ├── notificationService.js # Push notifications
│   └── backupService.js # Data backup/restore
├── utils/              # Utility functions
├── constants/          # App constants
├── contexts/           # React contexts
└── hooks/              # Custom hooks
```

## Global Naming Conventions

### Files and Directories
- **camelCase**: JavaScript files (`contactService.js`)
- **PascalCase**: React components (`ContactCard.js`)
- **kebab-case**: Directories (`contact-management/`)
- **UPPER_SNAKE_CASE**: Constants (`API_ENDPOINTS.js`)

### Database
- **snake_case**: Table and column names (`contact_info`, `first_name`)
- **id**: Primary keys always named `id`
- **{table}_id**: Foreign keys (`contact_id`, `event_id`)

### Code
- **camelCase**: Variables and functions (`getUserById`)
- **PascalCase**: React components (`ContactList`)
- **UPPER_SNAKE_CASE**: Constants (`MAX_CONTACTS`)

## Development Phases

### Phase 1: Database Foundation (START HERE)
Build complete database layer with all modules and migration system.
See: `./src/database/AGENTS.md`

### Phase 2: Services Layer
Implement business logic services for file management, authentication, notifications, and backup.
See: `./src/services/AGENTS.md`

### Phase 3: UI Development
Create user interface with screens and components.
See: `./src/components/AGENTS.md`

## Key Implementation Requirements

### Error Handling
- Consistent error types across all modules
- Proper logging for debugging
- Graceful fallbacks for failed operations

### Performance Considerations
- Index frequently queried columns
- Use LIMIT/OFFSET for pagination
- Implement lazy loading for large datasets
- Cache frequently accessed data
- Optimize image thumbnails

### Testing Strategy
- Unit tests for each database module
- Integration tests for services
- Mock SQLite for testing
- Test migration system thoroughly

## Business Rules Overview

### Contacts
- First name is required, others optional
- Display name auto-computed from name fields
- Can belong to multiple categories
- Company relationship is optional

### Categories
- System categories cannot be deleted
- Each contact can have multiple categories
- Categories have colors and icons for UI

### Attachments
- Universal system works with any entity
- Auto-generate thumbnails for images
- Validate file types and sizes
- Clean up orphaned files

### Events
- Birthday events auto-recur yearly
- Support multiple reminders per event
- Reminder scheduling via Expo Notifications

### Settings
- Hierarchical organization (category.setting_key)
- Type-safe value storage
- Default system settings

## Module Communication

Each layer should communicate through well-defined interfaces:
- Database modules expose consistent CRUD APIs
- Services layer handles business logic and orchestration
- Components consume services and manage UI state
- No direct database access from components

## Development Guidelines

1. **Start with Phase 1** - Complete database foundation
2. **Module Size** - Keep modules ~150-200 lines max
3. **Test Coverage** - Write tests alongside implementation
4. **Documentation** - Document complex business logic
5. **Code Review** - Each module should be reviewable in isolation