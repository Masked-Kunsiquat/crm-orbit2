# Expo CRM

A modern, mobile-first Customer Relationship Management (CRM) application built with React Native and Expo. This application provides comprehensive contact management, interaction tracking, event scheduling, and analytics capabilities for mobile devices.

## Features

- **Contact Management** - Store and organize contacts with detailed information including phone numbers, emails, addresses, and custom fields
- **Company Management** - Track companies with industry categorization, logo attachments, and contact associations
- **Interaction Tracking** - Log calls, emails, meetings, and other interactions with automatic timestamp tracking
- **Event Scheduling** - Create and manage events with reminder notifications
- **Notes & Attachments** - Add rich notes and file attachments to contacts, companies, and interactions
- **Categories & Tags** - Organize contacts with customizable categories and system-defined tags
- **Search & Filtering** - Powerful search across contacts, companies, and interactions
- **Internationalization** - Multi-language support with i18next (English, Spanish, French, German, Chinese)
  - Help translate: [![Translation status](https://hosted.weblate.org/widget/crm-orbit/mobile-app/svg-badge.svg)](https://hosted.weblate.org/engage/crm-orbit/)
- **Dark Mode** - System-aware dark mode support
- **Security** - PIN-based authentication with local biometric support
- **Offline-First** - SQLite-based local storage with full offline capability

## Technology Stack

- **React Native** 0.81.5
- **Expo** 54.0.22
- **React Navigation** 7.x - Native stack navigation
- **React Native Paper** 5.x - Material Design 3 UI components
- **TanStack Query** 5.x - Data fetching and caching
- **expo-sqlite** 16.x - Local SQLite database
- **i18next** - Internationalization framework
- **expo-local-authentication** - Biometric authentication

## Project Structure

```
crm-orbit/test-fresh/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── database/         # Database modules and helpers
│   ├── services/         # Business logic and data services
│   ├── utils/            # Utility helper functions
│   ├── context/          # React context providers
│   ├── providers/        # Third-party provider wrappers
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Internationalization configuration
│   ├── locales/          # Translation files
│   ├── constants/        # App constants
│   └── errors/           # Error handling utilities
├── App.js                # Application entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (iOS/Android) or an emulator

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Masked-Kunsiquat/crm-orbit2.git
cd crm-orbit/test-fresh
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run i18n:check` - Check translation coverage across all languages

## Database Architecture

The application uses a modular database architecture with SQLite for local storage:

- **Contacts** - Core contact information with computed display names
- **Companies** - Company records with logo support and contact relationships
- **ContactInfo** - Phone numbers, emails, and addresses for contacts
- **Interactions** - Activity logs for calls, emails, meetings, etc.
- **Events** - Calendar events with reminder support
- **Notes** - Rich text notes attached to any entity
- **Attachments** - File attachments with base64 storage
- **Categories** - User-defined and system categories
- **Tags** - Flexible tagging system

Each database module follows a consistent factory pattern with execute/batch/transaction helpers, providing a clean API for CRUD operations.

## Development Status

This project is actively undergoing code quality improvements and refactoring:

- **Phase 1 Complete**: Error handling and logging utilities
- **Phase 2 Complete**: Alert dialog helpers
- **Phase 3 Complete**: String manipulation helpers
- **Phase 4 Complete**: SQL building helpers

See [AUDIT-RESULTS.md](./docs/AUDIT-RESULTS.md) for detailed progress on helper function implementation (4/12 categories complete).

## Testing

The project uses Jest and React Native Testing Library for unit and integration testing:

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

Test files follow the pattern `*.test.js` and are located in `__tests__` directories or alongside source files.

## Internationalization

The app supports multiple languages through i18next:

- English (en)
- Spanish (es)
- French (fr)
- German (de)

Translation files are located in `src/locales/`. To add a new language:

1. Create a new JSON file in `src/locales/`
2. Add the language to `src/i18n/index.js`
3. Update the language selector in Settings screen

## Security & Privacy

- All data is stored locally on the device using SQLite
- No cloud synchronization or external data transmission
- PIN-based authentication with optional biometric support
- Secure storage for sensitive credentials using expo-secure-store

## Contributing

Contributions are welcome! Here's how you can help:

### Translations

We use [Weblate](https://hosted.weblate.org/engage/crm-orbit/) for managing translations. You can contribute translations without any technical knowledge:

[![Translation status](https://hosted.weblate.org/widget/crm-orbit/mobile-app/multi-auto.svg)](https://hosted.weblate.org/engage/crm-orbit/)

**Supported languages**: English, Spanish, French, German, Chinese (Simplified)

**Want to add a new language?** Open an issue or start translating on Weblate!

### Code Contributions

For bugs or feature requests, please open an issue in the repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with Expo and React Native ecosystem tools.
