[![CodeQL](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql)
[![Database Tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Masked-Kunsiquat/6939328496751d752fecb83a9cd612ab/raw/expo-crm-database-tests.json)](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/test-badge.yml)

# CRM Orbit

An offline-first mobile Customer Relationship Management (CRM) application built with Expo and React Native. It includes a robust SQLite data layer, authentication with PIN and biometrics, and a React Native Paper UI.

## Features

- Authentication & Security: App lock with PIN and biometrics, auto-lock timer, lockout after failed attempts
- Contact Management: Store and organize contacts with comprehensive information
- Event Scheduling: Track birthdays, meetings, and custom events with reminders
- Interaction Logging: Record calls, texts, meetings, and other interactions
- Category System: Organize contacts with customizable categories
- Company Management: Associate contacts with companies and organizations
- Note Taking: Create general notes or contact-specific notes with search functionality
- Offline-First Architecture: Full functionality without internet connection
- Data Persistence: Local SQLite database with migration system

## Technology Stack

- Frontend: Expo SDK 54, React Native 0.81, React Native Paper
- Navigation: React Navigation + react-native-gesture-handler
- Animations: react-native-reanimated (Babel plugin: `react-native-worklets/plugin`)
- Icons: @expo/vector-icons
- Database: SQLite with expo-sqlite (migrations, helpers, tests)
- Auth: expo-local-authentication + expo-secure-store
- Testing: Jest with sql.js for in-memory database testing
- Architecture: Modular layered design with strict separation of concerns

## Project Structure

```
src/
- components/           # UI components (React Native Paper)
- screens/              # App screens
- navigation/           # React Navigation
- services/             # Business logic (auth, database wrapper, etc.)
- services/__tests__/   # Service tests (e.g., authService)
- database/             # SQLite database layer
  - migrations/         # Schema migrations and versioning
  - __tests__/          # Database tests
- constants/            # App constants (e.g., auth constants)
```

## Database Architecture

Implemented modules include: contacts, contactsInfo, categories, categoriesRelations, companies, events, eventsRecurring, eventsReminders, interactions, interactionsStats, interactionsSearch, notes, attachments, and settings.

Database features: foreign keys, cascading deletes, timestamps, transactions, migrations, and performance indexes.

## Development

### Prerequisites
- Node.js 18 or higher
- Expo CLI
- iOS Simulator or Android Emulator (for mobile testing)

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platforms
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- database/__tests__
npm test -- --watch
```

## Current Status

- Phase 1: Database Foundation — COMPLETE
  - All core database modules implemented and tested
  - Migration system with schema versioning
  - Comprehensive test coverage (database)

- Phase 2: Services Layer — IN PROGRESS
  - Auth service implemented: PIN/biometric auth, auto-lock, lockout, listeners
  - Additional services planned (files, notifications, backup)

- Phase 3: UI — IN PROGRESS
  - App shell with React Native Paper + Safe Area
  - Navigation scaffold (tabs + stack) with @expo/vector-icons
  - Settings screen with authentication controls (PIN setup, biometric toggle, auto-lock)

## Architecture Principles

- Offline-First: All functionality works without internet connection
- Modular Design: Clear separation between database, services, and UI layers
- Test-Driven: Database and service tests
- Performance-Focused: Optimized queries with proper indexing
- Robust Security: Secure storage, brute-force protection, app lock
- Migration-Safe: Schema evolution through versioned migrations

## License

This project is proprietary software. All rights reserved.

