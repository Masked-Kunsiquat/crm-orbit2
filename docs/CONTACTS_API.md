# Contacts API Documentation

Documentation for the existing contacts database module for UI development.

## Import

```javascript
import { createContactsDB } from '../database/contacts';
// Then initialize with database context
const contactsAPI = createContactsDB(execute, batch, transaction);
```

## Data Structure

### Contact Object
```javascript
{
  id: number,                    // Auto-generated primary key
  first_name: string,            // Required
  last_name: string | null,      // Optional
  middle_name: string | null,    // Optional
  display_name: string,          // Auto-computed from names
  avatar_uri: string | null,     // Optional avatar image path
  company_id: number | null,     // Foreign key to companies table
  job_title: string | null,      // Optional job title
  is_favorite: boolean,          // Default false
  last_interaction_at: string | null, // ISO datetime or null
  created_at: string,            // Auto-generated ISO datetime
  updated_at: string             // Auto-updated ISO datetime
}
```

### Contact Input (for create/update)
```javascript
{
  first_name: string,            // Required - will be trimmed
  last_name?: string,            // Optional
  middle_name?: string,          // Optional
  avatar_uri?: string,           // Optional
  company_id?: number,           // Optional
  job_title?: string,            // Optional
  is_favorite?: boolean          // Optional, defaults to false
}
```

## API Methods

### Create Contact
```javascript
const newContact = await contactsAPI.create({
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com", // Note: emails are handled separately via contactsInfo
  company_id: 1,
  is_favorite: false
});
```

### Get Contact by ID
```javascript
const contact = await contactsAPI.getById(contactId);
// Returns contact object or null if not found
```

### Get All Contacts
```javascript
const contacts = await contactsAPI.getAll({
  limit: 50,           // Default 100
  offset: 0,           // Default 0
  orderBy: 'last_name', // Default 'last_name' | 'first_name' | 'created_at' | 'updated_at' | 'last_interaction_at'
  orderDir: 'ASC',     // Default 'ASC' | 'DESC'
  favorites: true,     // Optional: filter by favorite status
  companyId: 5         // Optional: filter by company
});
```

### Update Contact
```javascript
const updatedContact = await contactsAPI.update(contactId, {
  first_name: "Jane",
  last_name: "Smith",
  is_favorite: true
});
```

### Delete Contact
```javascript
const success = await contactsAPI.remove(contactId);
// Returns boolean indicating success
```

### Search Contacts
```javascript
const results = await contactsAPI.findByName("John");
// Searches first_name, last_name, and display_name
// Returns array of matching contacts
```

### Toggle Favorite
```javascript
const updatedContact = await contactsAPI.toggleFavorite(contactId);
// Toggles is_favorite status and returns updated contact
```

### Update Last Interaction
```javascript
await contactsAPI.updateLastInteraction(contactId);
// Sets last_interaction_at to current timestamp
```

## Usage Examples for UI Components

### Contact List Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';

function ContactList() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      try {
        const db = await initDatabase();
        const contactsAPI = db.contacts; // Assuming database exports modules
        const contactsList = await contactsAPI.getAll({
          limit: 100,
          orderBy: 'last_name'
        });
        setContacts(contactsList);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, []);

  // Render contacts...
}
```

### Create Contact Form
```javascript
async function handleCreateContact(formData) {
  try {
    const db = await initDatabase();
    const newContact = await db.contacts.create({
      first_name: formData.firstName,
      last_name: formData.lastName,
      company_id: formData.companyId || null,
      is_favorite: formData.isFavorite || false
    });

    // Navigate to contact details or update UI
    console.log('Contact created:', newContact);
  } catch (error) {
    console.error('Failed to create contact:', error);
    // Show error message to user
  }
}
```

### Search Functionality
```javascript
async function handleSearch(searchTerm) {
  try {
    const db = await initDatabase();
    const results = await db.contacts.findByName(searchTerm);
    setSearchResults(results);
  } catch (error) {
    console.error('Search failed:', error);
  }
}
```

## Error Handling

All methods may throw `DatabaseError` with the following structure:
```javascript
{
  message: string,     // Human-readable error message
  code: string,        // Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
  originalError: Error // Original underlying error
}
```

Common error codes:
- `NOT_FOUND` - Contact not found by ID
- `VALIDATION_ERROR` - Invalid input data
- `DATABASE_ERROR` - General database operation error

## Notes for UI Development

1. **Display Names**: The `display_name` field is auto-computed from first/middle/last names
2. **Favorites**: Use `toggleFavorite()` for favorite buttons in UI
3. **Company Integration**: `company_id` links to the companies table
4. **Contact Info**: Email/phone numbers are stored separately in the `contactsInfo` table
5. **Search**: Use `findByName()` for search functionality - it searches across all name fields
6. **Pagination**: Use `limit` and `offset` for implementing pagination in contact lists
7. **Sorting**: Multiple sort options available via `orderBy` and `orderDir` parameters