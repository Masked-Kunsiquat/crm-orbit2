# UI Components Layer Agent Instructions

## Overview
The UI layer provides the user interface using React Native, Expo, and UI Kitten. Build after completing database and services layers.

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
import { View, StyleSheet } from 'react-native';
import { Layout, Text, useTheme } from '@ui-kitten/components';

const ComponentName = ({ prop1, prop2, onAction }) => {
  const theme = useTheme();
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Load data or setup
  }, []);
  
  return (
    <Layout style={styles.container}>
      {/* Component content */}
    </Layout>
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