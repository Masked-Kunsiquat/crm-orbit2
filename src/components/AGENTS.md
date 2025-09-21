# UI Components Layer Agent Instructions

## Overview
The UI layer provides the user interface using React Native, Expo, and React Native Paper.

**STATUS: 🚧 INFRASTRUCTURE COMPLETE - Core UI framework ready**
**Prerequisites:**
- ✅ Database layer (complete)
- ✅ Services layer (complete)
**Completed:** Authentication UI, Settings, Theme system, Navigation
**Next Steps:** Implement contact and event management interfaces

## UI Architecture

### Component Structure
```
components/
├── common/              # Shared components
│   ├── Avatar.js
│   ├── SearchBar.js
│   ├── EmptyState.js
│   └── LoadingSpinner.js
├── contacts/           # Contact-related components
│   ├── ContactCard.js
│   ├── ContactList.js
│   ├── ContactForm.js
│   └── ContactInfo.js
├── events/            # Event components
│   ├── EventCard.js
│   ├── EventList.js
│   └── EventForm.js
└── layout/            # Layout components
    ├── AppHeader.js
    ├── TabBar.js
    └── DrawerMenu.js

screens/
├── contacts/
│   ├── ContactListScreen.js
│   ├── ContactDetailScreen.js
│   ├── ContactEditScreen.js
│   └── ContactSearchScreen.js
├── events/
│   ├── EventListScreen.js
│   ├── EventDetailScreen.js
│   └── EventEditScreen.js
├── settings/
│   ├── SettingsScreen.js
│   ├── BackupScreen.js
│   └── SecurityScreen.js
└── MainNavigator.js
```

## Component Development Guidelines

### Base Component Pattern
```javascript
import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

const ComponentName = ({ prop1, prop2, onAction }) => {
  const theme = useTheme();
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Load data or setup
  }, []);
  
  return (
    <Surface style={styles.container}>
      {/* Component content */}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  }
});

export default ComponentName;
```

## Core Components

### 1. Contact Components

#### ContactCard.js
```javascript
// Props
{
  contact: Object,
  onPress: Function,
  onLongPress: Function,
  showLastInteraction: Boolean,
  showCategories: Boolean
}

// Features
- Avatar display with fallback initials
- Name and company display
- Favorite indicator
- Last interaction timestamp
- Category badges
- Swipe actions (call, message, delete)
```

#### ContactList.js
```javascript
// Props
{
  contacts: Array,
  onContactPress: Function,
  onRefresh: Function,
  searchEnabled: Boolean,
  groupBy: 'alphabetical' | 'category' | 'company'
}

// Features
- Sectioned list with headers
- Pull-to-refresh
- Search integration
- Empty state
- Infinite scroll
- Fast scroll indicator
```

#### ContactForm.js
```javascript
// Props
{
  contact: Object, // For editing
  onSave: Function,
  onCancel: Function
}

// Features
- Name fields (first, middle, last)
- Photo picker with camera option
- Company selector/creator
- Contact info management (dynamic fields)
- Category multi-select
- Validation
```

### 2. Event Components

#### EventCard.js
```javascript
// Props
{
  event: Object,
  contact: Object,
  onPress: Function,
  showReminder: Boolean
}

// Features
- Event type icon
- Date/time display
- Contact name and avatar
- Reminder indicator
- Recurring event badge
```

#### EventForm.js
```javascript
// Props
{
  event: Object,
  contactId: Number,
  onSave: Function
}

// Features
- Title input
- Event type selector
- Date/time picker
- Recurring options
- Multiple reminders
- Notes field
```

### 3. Common Components

#### Avatar.js
```javascript
// Props
{
  uri: String,
  name: String,
  size: 'small' | 'medium' | 'large',
  showEditButton: Boolean,
  onEdit: Function
}

// Features
- Image display with loading state
- Initials fallback
- Edit overlay button
- Status indicator
```

#### SearchBar.js
```javascript
// Props
{
  placeholder: String,
  value: String,
  onChangeText: Function,
  onClear: Function,
  showFilter: Boolean,
  onFilter: Function
}

// Features
- Debounced input
- Clear button
- Filter button
- Voice input (optional)
```

## Screen Implementation

### 1. Contact List Screen
```javascript
const ContactListScreen = () => {
  // State Management
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Features
  - Tab navigation (All, Favorites, Recent)
  - Search with debouncing
  - Category filtering
  - Sort options (name, recent, company)
  - Bulk selection mode
  - FAB for adding contact
};
```

### 2. Contact Detail Screen
```javascript
const ContactDetailScreen = ({ route }) => {
  // Display Sections
  - Header with avatar and name
  - Quick actions (call, message, email)
  - Contact information cards
  - Recent interactions timeline
  - Upcoming events
  - Notes section
  - Attachments grid
  
  // Actions
  - Edit contact
  - Add interaction
  - Add event
  - Add note
  - Share contact
};
```

## ✅ IMPLEMENTATION STATUS

### Completed Components and Features

#### Authentication & Security - ✅ COMPLETE
- **AuthGate.js** - Complete authentication gate with biometric/PIN support
- **PinSetupModal.js** - PIN setup with strength validation and confirmation
- **AuthSection.js** - Settings section for authentication management
- **AppInitializer.js** - App initialization with service setup

#### Settings & Configuration - ✅ COMPLETE
- **SettingsScreen.js** - Complete settings interface with sections
- **ThemeSection.js** - Theme switching (System/Light/Dark) with instant preview
- **DangerZone.js** - Database reset functionality with confirmation

#### Navigation & Theme - ✅ COMPLETE
- **MainNavigator.js** - React Navigation setup with theme integration
- **ThemeContext.js** - Comprehensive theme system supporting system/light/dark modes
- **Theme Integration** - React Native Paper + React Navigation synchronized theming

### Implementation Status Summary

#### ✅ **COMPLETE** - Core Infrastructure (100%)
- Authentication flow and security
- Settings management interface
- Theme system with system detection
- Navigation structure
- App initialization and service integration

#### 🚧 **NOT IMPLEMENTED** - Business Logic UI (0%)
- Contact management components
- Event management components
- Interaction tracking interface
- Notes and attachment management
- Search and filtering interfaces

#### 📱 **READY FOR DEVELOPMENT** - Main App Features
All infrastructure is in place to build the core CRM functionality:
- Services layer provides data access
- Theme system ensures consistent styling
- Navigation framework ready for additional screens
- Authentication protects app access

### Next Priority: Business Logic UI Components
1. **Contact Management UI**:
   - ContactCard, ContactList, ContactForm components
   - ContactListScreen, ContactDetailScreen, ContactEditScreen
   - Avatar component with file service integration

2. **Event Management UI**:
   - EventCard, EventList, EventForm components
   - EventListScreen, EventDetailScreen, EventEditScreen
   - Reminder scheduling UI with notification service integration

3. **Common Components**:
   - SearchBar with debouncing
   - LoadingSpinner and EmptyState
   - Universal attachment viewer

## Next Steps

1. ✅ **Database Layer** - Complete
2. ✅ **Services Layer** - Complete
3. 🚧 **UI Layer** - Infrastructure complete, business logic UI ready for development

**All Dependencies Met:** Services layer provides complete data access, file management, authentication, and notifications. UI layer can now proceed with business logic implementation.

## Development Readiness

### ✅ **Ready to Implement Immediately**
- All core services available for UI integration
- Authentication system fully functional
- Theme system ensures consistent styling
- Navigation framework ready for additional screens
- File service ready for avatar/attachment handling
- Notification service ready for reminder management

### 🎯 **Recommended Development Order**
1. Common components (Avatar, SearchBar, etc.)
2. Contact management (highest priority CRM feature)
3. Event management (reminders and scheduling)
4. Interaction tracking
5. Notes and attachments

## Theming

### Summary
- Uses a central `ThemeProvider` to support System/Light/Dark modes and keep React Native Paper and React Navigation in sync.
- Default follows system appearance; user preference persists and applies instantly.

### Key Files
- `crm-orbit/src/contexts/ThemeContext.js:1` — Provides `ThemeProvider` and `useAppTheme` (exposes `mode`, `setMode`, `isDark`, `paperTheme`, `navigationTheme`).
- `crm-orbit/App.js:1` — Wraps app with `ThemeProvider` and sets `StatusBar` style from theme.
- `crm-orbit/src/navigation/MainNavigator.js:1` — Injects `navigationTheme` into `NavigationContainer`.
- `crm-orbit/src/components/settings/ThemeSection.js:1` — Settings UI to select System/Light/Dark.
- `crm-orbit/src/screens/SettingsScreen.js:1` — Renders `ThemeSection` at top of Settings.
- `crm-orbit/app.json:1` — `userInterfaceStyle: "automatic"` to enable system theme switching.

### Behavior
- Default mode: `system` (mirrors OS). Users can switch to `light` or `dark` from Settings → Appearance.
- Persistence: Stored in `AsyncStorage` under key `display.theme`.
- Android UI: Background color synced via `expo-system-ui` for proper edge‑to‑edge.
- Libraries: Paper MD3 (`MD3LightTheme`/`MD3DarkTheme`) merged with a matching React Navigation theme.

### Component Guidelines
- Use Paper’s `useTheme()` for colors, spacing, and elevation — avoid hard‑coded colors.
  - Common tokens: `theme.colors.background`, `surface`, `onSurface`, `primary`, `secondary`, `outlineVariant`, `elevation.levelX`.
- Prefer Paper components (`Surface`, `Card`, `Button`, etc.) to inherit proper theming automatically.
- Navigation and headers pick up colors from `navigationTheme`; avoid overriding with constants.

### Example (Themed Component)
```js
import { Surface, Text, useTheme } from 'react-native-paper';

function ExampleCard() {
  const theme = useTheme();
  return (
    <Surface style={{
      padding: 16,
      backgroundColor: theme.colors.surface,
      elevation: 1,
    }}>
      <Text style={{ color: theme.colors.onSurface }}>Hello, theme!</Text>
    </Surface>
  );
}
```

### Settings UX
- Path: Settings → Appearance
- Options: System, Light, Dark
- Applies immediately; persists across app restarts.

### Notes / Future Enhancements
- DB settings: `src/database/settingsHelpers.js:1` defines `'display.theme'` default; current implementation uses `AsyncStorage`. We can migrate to `settingsDB` later for unified storage if desired.
- Custom palette: If needed, extend `paperTheme.colors` in `ThemeContext` to add brand colors; keep Nav theme in sync.
- Status bar: Managed at `App.js` via `isDark` from `useAppTheme()`.
