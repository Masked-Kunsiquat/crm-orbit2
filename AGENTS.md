# CRM App Development Agent Instructions

## Project Overview
Build an offline-first CRM mobile application using Expo/React Native. Prioritize the database and services layers, then complete UI components using React Native Paper.

## Technology Stack
- Framework: Expo (React Native)
- UI Library: React Native Paper
- Navigation: React Navigation + react-native-gesture-handler
- Animations: react-native-reanimated (Babel plugin: react-native-worklets/plugin)
- Database: SQLite (expo-sqlite)
- Authentication: Expo Local Authentication + SecureStore
- Notifications: Expo Notifications
- File System: Expo FileSystem
- Storage: AsyncStorage for settings

## Project Structure
```
src/
- components/           # Reusable UI components (Paper)
- screens/              # Screen components
- navigation/           # Navigation setup
- services/             # Business logic services
- services/__tests__/   # Service tests
- database/             # Database layer (modular)
  - migrations/         # Database migrations
- constants/            # App constants
```

## Development Phases

### Phase 1: Database Foundation (COMPLETE)
Database layer with all modules and migration system is complete and tested. See: `./src/database/AGENTS.md`

Completed modules include: contacts, contactsInfo, events, eventsRecurring, eventsReminders, interactions, interactionsStats, interactionsSearch, categories, categoriesRelations, companies, attachments, notes, settings, settingsHelpers.

### Phase 2: Services Layer (COMPLETE)
✅ Auth service: PIN + biometric auth, auto-lock timer, brute-force lockout, comprehensive testing
✅ File service: Attachment management, MIME detection, thumbnail generation, modern format support
✅ Notification service: Event reminders, quiet hours, recurring events, template system, batch operations
🚧 Backup service: Not implemented (optional for MVP)

Services layer provides production-ready authentication, file management, and notification scheduling. See: `./src/services/AGENTS.md`

### Phase 3: UI Development (STARTED)
✅ Authentication UI: AuthGate, PinSetupModal, AuthSection with biometric controls
✅ Settings UI: Complete settings screen with theme switching, auth management, and danger zone
✅ Theme system: System/Light/Dark mode support with React Native Paper + Navigation integration
✅ Navigation: MainNavigator with proper theming integration
🚧 Contact management UI: Not implemented
🚧 Event management UI: Not implemented

Core UI infrastructure and authentication flow complete. See: `./src/components/AGENTS.md`

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
- Service tests (e.g., authService)
- Mock Expo modules for testing
- Test migration system thoroughly

## Module Communication

Each layer should communicate through well-defined interfaces:
- Database modules expose consistent CRUD APIs
- Services layer handles business logic and orchestration
- Components consume services and manage UI state
- No direct database access from components

## Development Guidelines

1. Start with Phase 1 — Complete
2. Phase 2 — Implement remaining services
3. Phase 3 — Finish UI with Paper components
4. Keep modules small and focused (~150–200 LOC)
5. Maintain tests and documentation alongside implementation

