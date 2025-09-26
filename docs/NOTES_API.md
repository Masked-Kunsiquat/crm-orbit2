# Notes API Documentation

Documentation for the notes database module for UI development.

## Import

```javascript
import { createNotesDB } from '../database/notes';
// Then initialize with database context
const notesAPI = createNotesDB({ execute, batch, transaction });
```

## Data Structure

### Note Object
```javascript
{
  id: number,                    // Auto-generated primary key
  contact_id: number | null,     // Foreign key to contacts table (null for general notes)
  title: string | null,          // Optional note title
  content: string,               // Required note content
  is_pinned: boolean,            // Pin status, default false
  created_at: string,            // Auto-generated ISO datetime
  updated_at: string             // Auto-updated ISO datetime
}
```

### Note Input (for create/update)
```javascript
{
  contact_id?: number | null,    // Optional - null for general notes
  title?: string,                // Optional note title
  content: string,               // Required - note content
  is_pinned?: boolean            // Optional, defaults to false
}
```

## API Methods

### Create Note
```javascript
// Create a general note (not linked to any contact)
const generalNote = await notesAPI.create({
  title: "Meeting Ideas",
  content: "Discuss Q4 objectives and team restructuring",
  is_pinned: true
});

// Create a contact-specific note
const contactNote = await notesAPI.create({
  contact_id: 5,
  title: "Follow-up",
  content: "Call back next week about project proposal"
});

// Create a note with just content (minimal requirement)
const simpleNote = await notesAPI.create({
  content: "Quick reminder to buy coffee for the office"
});
```

### Get Note by ID
```javascript
const note = await notesAPI.getById(noteId);
// Returns note object or null if not found
```

### Get All Notes
```javascript
const notes = await notesAPI.getAll({
  limit: 50,              // Default 100
  offset: 0,              // Default 0
  orderBy: 'created_at',  // Default 'created_at' | 'title' | 'content' | 'updated_at'
  orderDir: 'DESC',       // Default 'DESC' | 'ASC'
  contactId: 5,           // Optional: filter by specific contact
  contactId: null,        // Optional: filter for general notes only
  pinned: true            // Optional: filter by pinned status
});

// Notes are automatically sorted with pinned notes first, then by specified order
```

### Update Note
```javascript
const updatedNote = await notesAPI.update(noteId, {
  title: "Updated Title",
  content: "Updated content with new information",
  is_pinned: false
});

// Empty updates return the note unchanged
const unchanged = await notesAPI.update(noteId, {});
```

### Delete Note
```javascript
const deletedCount = await notesAPI.delete(noteId);
// Returns number of rows affected (0 or 1)
```

### Get Notes by Contact
```javascript
const contactNotes = await notesAPI.getByContact(contactId);
// Returns all notes for a specific contact, ordered by pinned status then creation date
// Pinned notes appear first
```

### Get General Notes
```javascript
const generalNotes = await notesAPI.getGeneralNotes({
  limit: 50,              // Default 100
  offset: 0,              // Default 0
  orderBy: 'created_at',  // Default 'created_at' | 'title' | 'content' | 'updated_at'
  orderDir: 'DESC'        // Default 'DESC' | 'ASC'
});
// Returns notes not linked to any contact (contact_id IS NULL)
// Pinned notes appear first automatically
```

### Get Pinned Notes
```javascript
// Get all pinned notes
const allPinnedNotes = await notesAPI.getPinned({
  limit: 20,
  offset: 0
});

// Get pinned notes for a specific contact
const pinnedContactNotes = await notesAPI.getPinned({
  contactId: 5,
  limit: 10
});

// Get pinned general notes only
const pinnedGeneralNotes = await notesAPI.getPinned({
  contactId: null,
  limit: 10
});
```

### Search Notes
```javascript
// Search all notes
const searchResults = await notesAPI.search("meeting", {
  limit: 50,
  offset: 0
});

// Search notes for a specific contact
const contactSearchResults = await notesAPI.search("follow-up", {
  contactId: 5,
  limit: 20
});

// Search general notes only
const generalSearchResults = await notesAPI.search("reminder", {
  contactId: null,
  limit: 20
});

// Search results are ordered by:
// 1. Pinned status (pinned first)
// 2. Title matches (title matches before content matches)
// 3. Creation date (newest first)
```

### Toggle Pin Status
```javascript
const updatedNote = await notesAPI.togglePin(noteId);
// Toggles is_pinned status and returns updated note
// If pinned, becomes unpinned; if unpinned, becomes pinned
```

### Bulk Delete Notes
```javascript
const deletedCount = await notesAPI.bulkDelete([noteId1, noteId2, noteId3]);
// Returns total number of notes deleted

// Safe with empty arrays
const safeDelete = await notesAPI.bulkDelete([]);
// Returns 0
```

## Usage Examples for UI Components

### Notes List Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';

function NotesList({ contactId = null }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotes() {
      try {
        const db = await initDatabase();
        const notesAPI = db.notes; // Assuming database exports modules

        let notesList;
        if (contactId) {
          // Load notes for specific contact
          notesList = await notesAPI.getByContact(contactId);
        } else {
          // Load general notes
          notesList = await notesAPI.getGeneralNotes({
            limit: 100,
            orderBy: 'updated_at',
            orderDir: 'DESC'
          });
        }

        setNotes(notesList);
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
  }, [contactId]);

  // Render notes with pinned notes highlighted...
}
```

### Create Note Form
```javascript
async function handleCreateNote(formData, contactId = null) {
  try {
    const db = await initDatabase();
    const newNote = await db.notes.create({
      contact_id: contactId,
      title: formData.title || null,
      content: formData.content,
      is_pinned: formData.isPinned || false
    });

    console.log('Note created:', newNote);
    // Update UI or navigate to note detail
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      console.error('Contact not found:', error.message);
    } else if (error.code === 'VALIDATION_ERROR') {
      console.error('Invalid note data:', error.message);
    } else {
      console.error('Failed to create note:', error);
    }
  }
}
```

### Note Search Component
```javascript
function NoteSearch({ contactId = undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const db = await initDatabase();
      const results = await db.notes.search(term, {
        contactId: contactId, // undefined searches all, null searches general notes
        limit: 50
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Render search input and results...
}
```

### Pinned Notes Dashboard
```javascript
function PinnedNotesDashboard() {
  const [pinnedNotes, setPinnedNotes] = useState([]);

  useEffect(() => {
    async function loadPinnedNotes() {
      try {
        const db = await initDatabase();
        const pinned = await db.notes.getPinned({
          limit: 20 // Show top 20 pinned notes
        });
        setPinnedNotes(pinned);
      } catch (error) {
        console.error('Failed to load pinned notes:', error);
      }
    }

    loadPinnedNotes();
  }, []);

  const handleTogglePin = async (noteId) => {
    try {
      const db = await initDatabase();
      const updatedNote = await db.notes.togglePin(noteId);

      // Update local state
      setPinnedNotes(prev =>
        updatedNote.is_pinned
          ? [...prev, updatedNote]
          : prev.filter(note => note.id !== noteId)
      );
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  // Render pinned notes grid...
}
```

### Note Management with Bulk Operations
```javascript
function NoteManager() {
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [notes, setNotes] = useState([]);

  const handleBulkDelete = async () => {
    if (selectedNotes.length === 0) return;

    try {
      const db = await initDatabase();
      const deletedCount = await db.notes.bulkDelete(selectedNotes);

      console.log(`Deleted ${deletedCount} notes`);

      // Update local state
      setNotes(prev => prev.filter(note => !selectedNotes.includes(note.id)));
      setSelectedNotes([]);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  // Render note list with selection checkboxes and bulk actions...
}
```

### Contact Notes Tab
```javascript
function ContactNotesTab({ contactId }) {
  const [notes, setNotes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadContactNotes = async () => {
    try {
      const db = await initDatabase();
      const contactNotes = await db.notes.getByContact(contactId);
      setNotes(contactNotes);
    } catch (error) {
      console.error('Failed to load contact notes:', error);
    }
  };

  useEffect(() => {
    loadContactNotes();
  }, [contactId]);

  const handleNoteCreated = async (noteData) => {
    try {
      const db = await initDatabase();
      const newNote = await db.notes.create({
        ...noteData,
        contact_id: contactId
      });

      setNotes(prev => [newNote, ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Render contact-specific notes interface...
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
- `NOT_FOUND` - Contact not found when creating note with contact_id
- `VALIDATION_ERROR` - Missing required content field
- `INSERT_FAILED` - Failed to create note in database
- `MODULE_INIT_ERROR` - Missing required database helpers

### Error Handling Examples
```javascript
try {
  const note = await notesAPI.create({
    contact_id: 999, // Non-existent contact
    content: "Test note"
  });
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    // Handle contact not found
    showError('Selected contact no longer exists');
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation errors
    showError('Note content is required');
  } else {
    // Handle other database errors
    showError('Failed to save note');
  }
}
```

## Notes for UI Development

1. **General vs Contact Notes**: Notes can be general (contact_id = null) or linked to specific contacts
2. **Pinned Notes**: Always appear first in all listing operations, use for important reminders
3. **Search Functionality**: Searches both title and content fields with title matches prioritized
4. **Automatic Timestamps**: created_at and updated_at are managed automatically by the database
5. **Cascade Deletion**: Notes are automatically deleted when their associated contact is deleted
6. **Content Requirement**: Content field is required - title is optional
7. **Boolean Handling**: is_pinned is automatically converted between boolean and integer for database storage
8. **Sorting Priority**: All list operations sort by pinned status first, then by specified order
9. **Foreign Key Validation**: Creating notes with invalid contact_id will throw NOT_FOUND error
10. **Bulk Operations**: Use bulkDelete for efficient multiple note deletion
11. **Empty Updates**: Updating with empty data safely returns the unchanged note
12. **Search Performance**: Search is optimized with proper indexing on contact_id and is_pinned fields