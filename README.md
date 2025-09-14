[![CodeQL](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql)
[![Database Tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Masked-Kunsiquat/6939328496751d752fecb83a9cd612ab/raw/expo-crm-database-tests.json)](https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/test-badge.yml)

# CRM Orbit

An offline-first mobile Customer Relationship Management (CRM) application built with Expo and React Native. Designed for contact management, event tracking, and interaction logging with complete offline functionality.

## Features

- **Contact Management**: Store and organize contacts with comprehensive information
- **Event Scheduling**: Track birthdays, meetings, and custom events with reminders
- **Interaction Logging**: Record calls, texts, meetings, and other interactions
- **Category System**: Organize contacts with customizable categories
- **Company Management**: Associate contacts with companies and organizations
- **Note Taking**: Create general notes or contact-specific notes with search functionality
- **Offline-First Architecture**: Full functionality without internet connection
- **Data Persistence**: Local SQLite database with migration system

## Technology Stack

- **Frontend**: Expo SDK 52, React Native, React Native Paper
- **Database**: SQLite with expo-sqlite
- **Testing**: Jest with sql.js for in-memory database testing
- **Architecture**: Modular layered design with strict separation of concerns

## Project Structure

```
src/
├── database/           # SQLite database layer
│   ├── migrations/     # Schema migrations and versioning
│   ├── __tests__/      # Comprehensive database tests
│   └── *.js           # Database modules for each entity
├── services/          # Business logic layer (planned)
└── components/        # React Native UI components (planned)
```

## Database Architecture

The application uses a modular database architecture with the following implemented modules:

### Core Modules
- **contacts**: Contact management with display name computation
- **contactsInfo**: Contact information (phone, email, address) management
- **categories**: Category system with contact associations
- **categoriesRelations**: Contact-category relationship management
- **companies**: Company management with contact relationships
- **events**: Event scheduling with recurring support
- **eventsRecurring**: Recurring event and birthday calculations
- **eventsReminders**: Event reminder management
- **interactions**: Contact interaction logging and tracking
- **interactionsStats**: Interaction analytics and statistics
- **interactionsSearch**: Advanced interaction search and filtering
- **notes**: Note management for contacts and general notes
- **attachments**: Universal attachment system for all entities

### Database Features
- Foreign key constraints with cascading deletes
- Automatic timestamp management (created_at, updated_at)
- Transaction support for atomic operations
- Migration system for schema evolution
- Comprehensive indexing for query performance

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

### Database Testing
- **254 tests** across 9 test suites
- In-memory SQLite testing with sql.js
- Complete coverage of CRUD operations, business logic, and error handling
- Integration testing between database modules

## Development Status

**Phase 1: Database Foundation** - COMPLETED
- All core database modules implemented and tested
- Migration system with schema versioning
- Comprehensive test coverage (254 passing tests)

**Phase 2: Services Layer** - PLANNED
- File management services
- Authentication and security
- Notification system
- Backup and sync services

**Phase 3: UI Development** - PLANNED
- Contact management screens
- Event and interaction interfaces
- Category and company management
- Search and filtering capabilities

## Architecture Principles

- **Offline-First**: All functionality works without internet connection
- **Modular Design**: Clear separation between database, services, and UI layers
- **Test-Driven**: Comprehensive testing at every layer
- **Performance-Focused**: Optimized queries with proper indexing
- **Type-Safe**: Consistent error handling with typed database errors
- **Migration-Safe**: Schema evolution through versioned migrations

## License

This project is proprietary software. All rights reserved.
