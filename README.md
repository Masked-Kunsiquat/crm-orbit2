# Welcome to CRM Orbit!

<table>
  <thead>
    <tr>
      <th colspan="4" align="center">Testing</th>
    </tr>
  </thead>
  <tbody>
    <tr align="center">
      <td>
        <a href="https://hosted.weblate.org/engage/crm-orbit/">
          <img alt="Translation status" src="https://hosted.weblate.org/widget/crm-orbit/mobile-app/svg-badge.svg" />
        </a>
      </td>
      <td>
        <a href="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql">
          <img alt="CodeQL" src="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/github-code-scanning/codeql/badge.svg" />
        </a>
      </td>
      <td>
        <a href="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/dependabot/dependabot-updates">
          <img alt="Dependabot Updates" src="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/dependabot/dependabot-updates/badge.svg" />
        </a>
      </td>
      <td>
        <a href="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/eslint.yml">
          <img alt="ESLint" src="https://github.com/Masked-Kunsiquat/crm-orbit2/actions/workflows/eslint.yml/badge.svg" />
        </a>
      </td>
      <td>
        <a href="https://app.codacy.com/gh/Masked-Kunsiquat/crm-orbit2/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade">
          <img alt="Codacy Grade" src="https://app.codacy.com/project/badge/Grade/55db8c1a95f74f078cafef5ede9701ff" />
        </a>
      </td>
      <td>
        <a href="https://app.codacy.com/gh/Masked-Kunsiquat/crm-orbit2/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage">
          <img alt="Codacy Coverage" src="https://app.codacy.com/project/badge/Coverage/55db8c1a95f74f078cafef5ede9701ff" />
        </a>
      </td>
    </tr>
  </tbody>
</table>

# Overview

CRM Orbit is a mobile-first CRM application built with React Native and Expo. It provides essential customer relationship management features in a native mobile app with offline-first capabilities. The project is in active development, and your feedback and contributions are welcome.

## Core features

- **Contact & organization management** – Store and manage details about people, accounts, and organizations with support for multiple contact methods (phones, emails).

- **Interactive timeline** – Track all activities, notes, and interactions with automatic timestamping and detailed change history.

- **Notes & interactions** – Create detailed notes and log interactions with contacts, accounts, and organizations.

- **Native device integration** – Quick actions to call, text, email contacts, and navigate to addresses using native device apps.

- **Multilingual UI** – Thanks to the Weblate integration, the interface is translatable into multiple languages.

- **Offline-first** – Built on SQLite with local-first architecture for reliable offline access.

- **Healthy codebase** – Automated CodeQL scanning, Dependabot updates, and ESLint rules help maintain quality.

## Technology stack

- **React Native** with Expo for cross-platform mobile development
- **TypeScript** for type safety
- **SQLite** (expo-sqlite) for local data storage
- **Zustand** for state management
- **React Navigation** for navigation
- **i18n** for internationalization

## Getting started

1. Clone the repository: `git clone https://github.com/Masked-Kunsiquat/crm-orbit2.git` and change into the project directory.

2. Navigate to the app directory: `cd CRMOrbit`

3. Install dependencies: `npm install` (or `yarn install`) to install the required packages.

4. Run the development server: `npx expo start`

5. Access the app:
   - Scan the QR code with the Expo Go app (iOS/Android)
   - Press `a` to open in Android emulator
   - Press `i` to open in iOS simulator
   - Press `w` to open in web browser

For production builds, use:
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

## Project structure

```
CRMOrbit/
├── domains/          # Domain logic and utilities
├── i18n/            # Internationalization files
├── views/           # React components and screens
│   ├── components/  # Reusable UI components
│   ├── navigation/  # Navigation configuration
│   ├── screens/     # Screen components
│   └── store/       # Zustand state management
└── app.json         # Expo configuration
```

# Contributing

We encourage contributions of all kinds—whether it's reporting issues, improving translations, adding new features or refining existing ones. Please open an issue or pull request on GitHub and follow the existing coding standards. Make sure to run `npm run lint` and the test suite before submitting changes.

# License

CRM Orbit is released under the MIT License. See the LICENSE file for more details.
