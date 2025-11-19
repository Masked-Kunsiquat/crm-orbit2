# Helper Functions Cheatsheet

**Quick reference guide for all utility functions and helpers in the Expo CRM codebase**

Last Updated: November 10, 2025
Status: 11/11 Categories Complete (551+ patterns eliminated)

---

## Table of Contents

1. [Validation Helpers](#validation-helpers)
2. [String Helpers](#string-helpers)
3. [Contact Helpers](#contact-helpers)
4. [Array Helpers](#array-helpers)
5. [File Helpers](#file-helpers)
6. [Date Utilities](#date-utilities)
7. [SQL Building Helpers](#sql-building-helpers)
8. [Error Logging](#error-logging)
9. [Alert Dialogs](#alert-dialogs)
10. [Permission Helpers](#permission-helpers)
11. [TanStack Query Helpers](#tanstack-query-helpers)
12. [Async Operation Hooks](#async-operation-hooks)

---

## Validation Helpers

**Import:** `import { is, hasValue, validateRequired, isValidEmail, isValidPhone } from '../utils/validators';`

### Type Checking (`is.*` namespace)

```javascript
// Primitives
is.string(val)           // typeof val === 'string'
is.number(val)           // typeof val === 'number' && !isNaN(val)
is.integer(val)          // Number.isInteger(val)
is.boolean(val)          // typeof val === 'boolean'

// Complex Types
is.array(val)            // Array.isArray(val)
is.object(val)           // Non-null object, not array
is.date(val)             // Valid Date instance
is.function(val)         // typeof val === 'function'

// Nullish Checks
is.null(val)             // val === null
is.undefined(val)        // val === undefined
is.nullish(val)          // val == null
is.empty(val)            // Empty string/array/object or nullish
```

### Format Validation

```javascript
isValidEmail('user@example.com')        // Email regex validation → true/false
isValidPhone('555-123-4567')            // 10 or 11 digit validation → true/false
isPositiveInteger(5)                    // Integer >= 1 → true/false
isNonNegativeInteger(0)                 // Integer >= 0 → true/false
```

### Data Validation

```javascript
// Check if value exists and is non-empty
hasValue(value)                         // Type-aware non-empty check

// Batch required field validation
const { valid, errors } = validateRequired(formData, [
  { field: 'first_name', label: 'First name' },
  { field: 'email', label: 'Email address' }
]);

if (!valid) {
  showAlert.error('Validation Error', Object.values(errors)[0]);
  return;
}
```

### Common Patterns

```javascript
// Database parameter validation
if (!is.array(items)) {
  throw new DatabaseError('Items must be an array', 'VALIDATION_ERROR');
}

// Form validation
if (!hasValue(formData.firstName)) {
  showAlert.error('First name is required');
  return;
}
```

---

## String Helpers

**Import:** `import { safeTrim, normalizeTrimLowercase, hasContent, filterNonEmpty, capitalize, truncate } from '../utils/stringHelpers';`

### Basic Operations

```javascript
safeTrim(value)                          // Null-safe trim: String(value || '').trim()
normalizeTrimLowercase(value)            // Trim + lowercase
hasContent(value)                        // Non-empty after trim → true/false
capitalize(value)                        // First letter uppercase
truncate(value, 50, '...')              // Smart truncation with suffix
```

### Array Filtering

```javascript
// Filter objects by field content
filterNonEmpty(phones, 'value')          // Returns objects where item.value has content

// Filter array of strings
filterNonEmptyStrings(['', 'hello', null, 'world'])  // → ['hello', 'world']
```

### Common Patterns

```javascript
// Form input normalization
const normalized = {
  first_name: safeTrim(formData.first_name),
  email: normalizeTrimLowercase(formData.email)
};

// Filter valid phone/email entries
const validPhones = filterNonEmpty(phones);    // phones is array of {value, label}
const validEmails = filterNonEmpty(emails);

// Display name construction
const nameParts = filterNonEmptyStrings([
  contact.first_name,
  contact.middle_name,
  contact.last_name
]);
const displayName = nameParts.join(' ');
```

---

## Contact Helpers

**Import:** `import { getContactDisplayName, getInitials, normalizePhoneNumber, formatPhoneNumber } from '../utils/contactHelpers';`

### Display Name

```javascript
getContactDisplayName(contact, 'Unknown Contact')
// Priority: display_name → "first middle last" → fallback
// Returns: string

// Example
const name = getContactDisplayName(contact);  // "John Doe"
```

### Initials

```javascript
getInitials(firstName, lastName, '?')
// Handles multi-byte Unicode characters (emoji, surrogate pairs)
// Returns: string (e.g., "JD" or "?")

// Example
const initials = getInitials(contact.first_name, contact.last_name);  // "JD"
```

### Phone Number Formatting

```javascript
normalizePhoneNumber(phone)
// Strips all non-digit characters
// Returns: string of digits only

formatPhoneNumber(phone)
// 10-digit: (555) 123-4567
// 11-digit: +1 (555) 123-4567
// Unknown: returns as-is
// Returns: formatted string

// Examples
normalizePhoneNumber('(555) 123-4567')     // → "5551234567"
formatPhoneNumber('5551234567')            // → "(555) 123-4567"
formatPhoneNumber('15551234567')           // → "+1 (555) 123-4567"
```

### Common Patterns

```javascript
// Display contact in UI
<Text>{getContactDisplayName(contact)}</Text>
<Avatar label={getInitials(contact.first_name, contact.last_name)} />

// Compare phone numbers
if (normalizePhoneNumber(phone1) === normalizePhoneNumber(phone2)) {
  // Phones match
}

// Screen-specific wrapper for tel: links (preserve '+')
const normalizeForTel = (phone) => {
  const str = String(phone || '');
  if (str.startsWith('+')) {
    return '+' + normalizePhoneNumber(str.slice(1));
  }
  return normalizePhoneNumber(str);
};
```

---

## Array Helpers

**Import:** `import { chunk, unique, uniqueBy } from '../utils/arrayHelpers';`

### Chunking (Batch Processing)

```javascript
chunk(array, size)
// Split array into smaller chunks
// Validates: array is array, size is positive integer
// Returns: Array<Array>

// Example: SQLite parameter limit
const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const batches = chunk(ids, 3);  // [[1,2,3], [4,5,6], [7,8,9], [10]]

for (const batch of batches) {
  const placeholders = batch.map(() => '?').join(', ');
  await execute(`SELECT * FROM table WHERE id IN (${placeholders})`, batch);
}
```

### Deduplication

```javascript
unique(array)
// Remove duplicates from primitive array
// Uses Set for O(n) performance
// Returns: Array with unique values

uniqueBy(array, key)
// Remove duplicates from object array
// key: string (property name) or function (extractor)
// Returns: Array with unique objects (first occurrence kept)

// Examples
unique([1, 2, 2, 3, 1])                              // → [1, 2, 3]
unique(['a', 'b', 'a'])                              // → ['a', 'b']

uniqueBy([{id: 1}, {id: 2}, {id: 1}], 'id')         // → [{id: 1}, {id: 2}]
uniqueBy(items, item => item.user.id)                // Function extractor
```

### Common Patterns

```javascript
// SQLite parameter limit handling
const CHUNK_SIZE = 500;  // SQLite limit is 999, use 500 for safety
const chunks = chunk(contactIds, CHUNK_SIZE);
for (const idChunk of chunks) {
  await processChunk(idChunk);
}

// Batch processing for performance
const batches = chunk(deviceContacts, 50);
for (const batch of batches) {
  await importBatch(batch);
}

// Extract unique contact IDs from events
const contactIds = unique(events.map(e => e.contact_id));

// Deduplicate category IDs
const uniqueCategoryIds = unique(categoryIds);

// Remove duplicate objects by property
const uniqueContacts = uniqueBy(contacts, 'email');
```

---

## File Helpers

**Import:** `import { getFileExtension, isImageFile, formatFileSize } from '../utils/fileHelpers';`

### File Extensions

```javascript
getFileExtension(filename)
// Extract file extension (lowercase)
// Returns: string (e.g., "jpg", "pdf", "") or '' if invalid

// Examples
getFileExtension('photo.JPG')           // → "jpg"
getFileExtension('document.pdf')        // → "pdf"
getFileExtension('noext')               // → ""
```

### Image Detection

```javascript
isImageFile(filename)
// Check if file is an image by extension
// Supported: jpg, jpeg, png, gif, webp, heic, heif, avif
// Returns: boolean

// Example
if (isImageFile(filename)) {
  await generateThumbnail(file);
}
```

### File Size Formatting

```javascript
formatFileSize(bytes, decimals = 2)
// Format bytes to human-readable size
// Handles: 0, null, undefined, negative numbers
// Returns: string (e.g., "1.5 MB", "512 Bytes")

// Examples
formatFileSize(0)                       // → "0 Bytes"
formatFileSize(1024)                    // → "1 KB"
formatFileSize(1536, 1)                 // → "1.5 KB"
formatFileSize(5242880)                 // → "5 MB"
```

### Common Patterns

```javascript
// MIME type detection
const ext = getFileExtension(filename);
const mimeType = mimeTypeMap[ext] || 'application/octet-stream';

// File validation
if (!isImageFile(filename)) {
  throw new Error('Only image files are supported');
}

// Display file size in UI
<Text>{formatFileSize(attachment.file_size)}</Text>
```

---

## Date Utilities

**Import:** `import { parseLocalDate, formatDateSmart, isFuture, isToday, compareDates } from '../utils/dateUtils';`

### Parsing & Formatting

```javascript
parseLocalDate('2025-11-10')
// YYYY-MM-DD string → local Date object (no UTC issues)
// Returns: Date | null

formatDateToString(date)
// Date object → YYYY-MM-DD string
// Returns: string

formatDateSmart(dateString, locale = 'en-US')
// Smart formatting: "Today", "Yesterday", or formatted date
// Returns: string
```

### Date Comparison

```javascript
isToday(dateString)                     // Check if date is today → boolean
isFuture(dateString)                    // Check if date is in future → boolean
isPast(dateString)                      // Check if date is in past → boolean
compareDates(date1, date2)              // Compare dates → -1, 0, or 1
```

### Date Arithmetic

```javascript
addDays(dateString, days)               // Add days to date → YYYY-MM-DD string
subtractDays(dateString, days)          // Subtract days → YYYY-MM-DD string
```

### Common Patterns

```javascript
// Display event date
const eventDate = formatDateSmart(event.event_date);  // "Today" or "Nov 10, 2025"

// Filter upcoming events
const upcomingEvents = events.filter(e => isFuture(e.event_date));

// Sort events by date
events.sort((a, b) => compareDates(a.event_date, b.event_date));

// Calculate reminder date
const reminderDate = subtractDays(event.event_date, 1);  // 1 day before
```

---

## SQL Building Helpers

**Import:** `import { placeholders, pick, buildUpdateSet, buildInsert } from '../database/sqlHelpers';`

### Placeholders

```javascript
placeholders(count)
// Generate "?, ?, ?" for N parameters
// Validates: count is positive integer
// Returns: string

// Example
placeholders(3)                         // → "?, ?, ?"

const sql = `SELECT * FROM contacts WHERE id IN (${placeholders(ids.length)})`;
await execute(sql, ids);
```

### Field Picking

```javascript
pick(obj, fields)
// Extract allowed fields from object
// Filters out undefined values
// Returns: object with only allowed fields

// Example
const ALLOWED_FIELDS = ['first_name', 'last_name', 'email'];
const allowed = pick(formData, ALLOWED_FIELDS);
```

### UPDATE Statements

```javascript
buildUpdateSet(data)
// Generate SET clause for UPDATE
// Returns: { sql: string, values: array }

// Example
const data = { first_name: 'John', last_name: 'Doe' };
const { sql, values } = buildUpdateSet(data);
// sql: "first_name = ?, last_name = ?"
// values: ['John', 'Doe']

await execute(`UPDATE contacts SET ${sql} WHERE id = ?`, [...values, contactId]);
```

### INSERT Statements

```javascript
buildInsert(table, data)
// Generate complete INSERT statement
// Returns: { sql: string, values: array }

// Example
const data = { first_name: 'John', last_name: 'Doe' };
const { sql, values } = buildInsert('contacts', data);
// sql: "INSERT INTO contacts (first_name, last_name) VALUES (?, ?)"
// values: ['John', 'Doe']

const result = await execute(sql, values);
```

### Common Patterns

```javascript
// Database module create()
async create(data) {
  const allowed = pick(data, ALLOWED_FIELDS);
  const { sql, values } = buildInsert('table_name', allowed);
  const result = await execute(sql, values);
  return this.getById(result.insertId);
}

// Database module update()
async update(id, data) {
  const allowed = pick(data, UPDATABLE_FIELDS);
  const { sql, values } = buildUpdateSet(allowed);
  if (!sql) {
    throw new DatabaseError('No fields to update', 'VALIDATION_ERROR');
  }
  await execute(`UPDATE table_name SET ${sql} WHERE id = ?`, [...values, id]);
  return this.getById(id);
}
```

---

## Error Logging

**Import:** `import { logger } from '../errors/utils/errorLogger';`

### Methods

```javascript
logger.error(component, operation, error, context = {})
// Log errors with full context
// Always logs (production + development)

logger.warn(component, message, context = {})
// Log warnings
// Always logs

logger.success(component, operation, details = {})
// Log successful operations
// Development only

logger.info(component, message, context = {})
// Log informational messages
// Development only

logger.debug(component, message, data = {})
// Log debug information
// Development only
```

### Common Patterns

```javascript
// Database layer - let errors bubble
async create(data) {
  if (!hasValue(data?.first_name)) {
    throw new DatabaseError('first_name is required', 'VALIDATION_ERROR');
  }
  const result = await execute(sql, values);
  logger.success('ContactsDB', 'create', { id: result.insertId });
  return result;
}

// Service layer - catch, log, re-throw
async someOperation(input) {
  try {
    const result = await database.contacts.create(input);
    logger.success('MyService', 'someOperation', { id: result.id });
    return result;
  } catch (error) {
    logger.error('MyService', 'someOperation', error, { input });
    throw error;  // Re-throw for UI layer
  }
}

// UI layer - catch, log, show alert
async handleSubmit() {
  try {
    await service.someOperation(formData);
    showAlert.success('Success', 'Operation completed');
  } catch (error) {
    logger.error('ComponentName', 'handleSubmit', error);
    showAlert.error('Error', getUserFriendlyError(error));
  }
}
```

---

## Alert Dialogs

**Import:** `import { showAlert } from '../errors/utils/errorHandler';`

### Methods

```javascript
showAlert.error(message, title = 'Error')
// Show error alert
// Auto-swaps parameters if needed

showAlert.success(message, title = 'Success')
// Show success alert

showAlert.info(message, title = 'Info')
// Show info alert

showAlert.confirm(title, message, onConfirm, onCancel = null)
// Show confirmation dialog with OK/Cancel

showAlert.confirmDelete(title, message, onConfirm)
// Show destructive confirmation (red Delete button)
```

### Common Patterns

```javascript
// Simple alerts
showAlert.success('Contact created successfully!');
showAlert.error('Failed to save contact');
showAlert.info('Please select a contact first');

// Confirmation dialogs
showAlert.confirm(
  'Delete Contact',
  'Are you sure you want to delete this contact?',
  async () => {
    await deleteContact(contact.id);
    showAlert.success('Contact deleted');
  }
);

// Destructive confirmation
showAlert.confirmDelete(
  'Delete Contact',
  `Delete ${contact.first_name}? This cannot be undone.`,
  () => handleDelete()
);

// Validation errors
if (!hasContent(firstName)) {
  showAlert.error('First name is required');
  return;
}

// With validation helper
const { valid, errors } = validateRequired(formData, rules);
if (!valid) {
  showAlert.error(Object.values(errors)[0]);
  return;
}
```

---

## Permission Helpers

**Import:** `import { requestPermission, checkPermission } from '../utils/permissionHelpers';`

### Request Permission

```javascript
requestPermission(requestFn, permissionName, customMessage)
// Request permission with user feedback
// Returns: Promise<boolean>

// Example
const granted = await requestPermission(
  ImagePicker.requestMediaLibraryPermissionsAsync,
  'Media library',
  'Media library permission is required to select a photo.'
);

if (!granted) return;  // User denied, alert already shown
```

### Check Permission

```javascript
checkPermission(checkFn, permissionName)
// Check permission status without requesting
// Returns: Promise<boolean>

// Example
const hasPermission = await checkPermission(
  Contacts.getPermissionsAsync,
  'Contacts'
);

if (hasPermission) {
  // Proceed with operation
} else {
  // Request permission
}
```

### Common Patterns

```javascript
// Image picker permission
const handleSelectPhoto = async () => {
  const granted = await requestPermission(
    ImagePicker.requestMediaLibraryPermissionsAsync,
    'Media library'
  );
  if (!granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({...});
};

// Contacts permission
const handleImportContacts = async () => {
  const granted = await requestPermission(
    Contacts.requestPermissionsAsync,
    'Contacts',
    'Contacts permission is required to import from your device.'
  );
  if (!granted) return;

  await importContacts();
};
```

---

## TanStack Query Helpers

**Import:** `import { invalidateQueries, createMutationHandlers } from '../hooks/queries/queryHelpers';`

### Invalidate Queries

```javascript
invalidateQueries(queryClient, ...queryKeys)
// Invalidate multiple query keys in parallel
// Returns: Promise<void>

// Example
await invalidateQueries(
  queryClient,
  contactKeys.all,
  contactKeys.lists(),
  eventKeys.all
);
```

### Mutation Handlers

```javascript
createMutationHandlers(queryClient, keysToInvalidate, options = {})
// Create standardized onSuccess/onError handlers
// Automatically invalidates queries and logs errors
// Returns: { onSuccess, onError }

// Options:
// - onSuccess: custom success callback
// - onError: custom error callback
// - successMessage: log message
// - context: component name for logging

// Example 1: Simple invalidation
const { onSuccess, onError } = createMutationHandlers(
  queryClient,
  [contactKeys.all, contactKeys.lists()]
);

return useMutation({
  mutationFn: (data) => database.contacts.create(data),
  onSuccess,
  onError
});

// Example 2: With custom success handler
const { onSuccess, onError } = createMutationHandlers(
  queryClient,
  contactKeys.all,
  {
    onSuccess: (newContact) => {
      // Custom logic after invalidation
      queryClient.setQueryData(contactKeys.detail(newContact.id), newContact);
    },
    context: 'useCreateContact'
  }
);
```

### Common Patterns

```javascript
// Create mutation
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => database.contacts.create(data),
    ...createMutationHandlers(queryClient, contactKeys.all)
  });
}

// Update mutation with multiple invalidations
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => database.contacts.update(id, data),
    ...createMutationHandlers(
      queryClient,
      [contactKeys.all, contactKeys.lists(), contactKeys.details()],
      {
        onSuccess: (updatedContact) => {
          // Optimistically update detail cache
          queryClient.setQueryData(
            contactKeys.detail(updatedContact.id),
            updatedContact
          );
        }
      }
    )
  });
}

// Delete mutation
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => database.contacts.delete(id),
    ...createMutationHandlers(
      queryClient,
      contactKeys.all,
      { successMessage: 'Contact deleted' }
    )
  });
}
```

---

## Async Operation Hooks

**Import:** `import { useAsyncOperation, useAsyncLoading } from '../hooks/useAsyncOperation';`

### useAsyncOperation (Full Handler)

```javascript
useAsyncOperation(asyncFn, options = {})
// Full async handler with loading, error state, and callbacks
// Returns: { execute, loading, error, reset }

// Options:
// - component: component name for logging
// - operation: operation name for logging
// - onSuccess: callback after success
// - onError: callback on error

// Example
const { execute, loading, error, reset } = useAsyncOperation(
  async (data) => await service.saveData(data),
  {
    component: 'MyComponent',
    operation: 'saveData',
    onSuccess: (result) => showAlert.success('Saved!'),
    onError: (err) => showAlert.error(err.message)
  }
);

const handleSubmit = async () => {
  const result = await execute(formData);
  if (result) {
    // Success
  }
};
```

### useAsyncLoading (Simplified)

```javascript
useAsyncLoading(asyncFn)
// Simplified loading-only variant (no error state)
// Returns: { execute, loading }

// Example 1: Avatar loading
const { execute: loadAvatar, loading } = useAsyncLoading(
  async (attachmentId) => {
    const uri = await fileService.getFileUri(attachmentId);
    return uri;
  }
);

// Example 2: Form submission
const { execute: saveContact, loading: saving } = useAsyncLoading(async () => {
  await dbTransaction(async (tx) => {
    await contactsDB.update(contact.id, data, tx);
    await contactsInfoDB.replaceContactInfo(contact.id, infoItems, tx);
  });
});

const handleSave = async () => {
  try {
    await saveContact();
    showAlert.success('Contact saved');
  } catch (error) {
    logger.error('EditContactModal', 'handleSave', error);
    showAlert.error('Failed to save contact');
  }
};
```

### Common Patterns

```javascript
// PIN setup with error handling
const { execute: save, loading: busy } = useAsyncLoading(async () => {
  setError('');
  try {
    await authService.setPIN(pin);
    navigation.goBack();
  } catch (e) {
    setError(e?.message || 'Failed to set PIN');
  }
});

<Button onPress={save} disabled={!canSave || busy} loading={busy}>
  Save PIN
</Button>

// Authentication with multiple async operations
const { execute: onBiometric, loading: biometricBusy } = useAsyncLoading(async () => {
  setError('');
  const result = await authenticate({ promptMessage: 'Unlock CRM' });
  if (!result?.success) {
    setError(result?.error || 'Authentication failed');
  }
});

const { execute: onSubmitPin, loading: pinBusy } = useAsyncLoading(async () => {
  if (!canSubmit) return;
  setError('');
  const result = await authenticateWithPIN(pin);
  if (!result?.success) {
    setError(result?.error || 'Invalid PIN');
  }
});

const busy = biometricBusy || pinBusy;
```

---

## Quick Migration Guide

### Before → After Examples

#### 1. Type Validation
```javascript
// Before
if (typeof value === 'string' && value.length > 0) { }
if (Array.isArray(items)) { }

// After
import { is, hasValue } from '../utils/validators';
if (is.string(value) && hasValue(value)) { }
if (is.array(items)) { }
```

#### 2. String Manipulation
```javascript
// Before
const cleaned = (firstName || '').trim();
const email = (formData.email || '').trim().toLowerCase();

// After
import { safeTrim, normalizeTrimLowercase } from '../utils/stringHelpers';
const cleaned = safeTrim(firstName);
const email = normalizeTrimLowercase(formData.email);
```

#### 3. SQL Building
```javascript
// Before
const keys = Object.keys(data);
const sql = keys.map(k => `${k} = ?`).join(', ');
const values = keys.map(k => data[k]);
await execute(`UPDATE contacts SET ${sql} WHERE id = ?`, [...values, id]);

// After
import { buildUpdateSet } from '../database/sqlHelpers';
const { sql, values } = buildUpdateSet(data);
await execute(`UPDATE contacts SET ${sql} WHERE id = ?`, [...values, id]);
```

#### 4. Array Deduplication
```javascript
// Before
const unique = [...new Set(categoryIds)];
const uniqueIds = Array.from(new Set(contactIds));

// After
import { unique } from '../utils/arrayHelpers';
const uniqueCategoryIds = unique(categoryIds);
const uniqueIds = unique(contactIds);
```

#### 5. Alert Dialogs
```javascript
// Before
Alert.alert('Error', 'Something went wrong');
Alert.alert('Confirm', 'Are you sure?', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK', onPress: handleConfirm }
]);

// After
import { showAlert } from '../errors/utils/errorHandler';
showAlert.error('Something went wrong');
showAlert.confirm('Confirm', 'Are you sure?', handleConfirm);
```

#### 6. Loading State
```javascript
// Before
const [loading, setLoading] = useState(false);
const handleSubmit = async () => {
  setLoading(true);
  try {
    await operation();
  } finally {
    setLoading(false);
  }
};

// After
import { useAsyncLoading } from '../hooks/useAsyncOperation';
const { execute: handleSubmit, loading } = useAsyncLoading(async () => {
  await operation();
});
```

---

## Common Use Cases

### Form Validation & Submission

```javascript
import { validateRequired, hasValue } from '../utils/validators';
import { safeTrim, normalizeTrimLowercase, filterNonEmpty } from '../utils/stringHelpers';
import { showAlert } from '../errors/utils/errorHandler';
import { logger } from '../errors/utils/errorLogger';

const handleSubmit = async () => {
  // 1. Validate required fields
  const { valid, errors } = validateRequired(formData, [
    { field: 'first_name', label: 'First name' },
    { field: 'email', label: 'Email' }
  ]);

  if (!valid) {
    showAlert.error(Object.values(errors)[0]);
    return;
  }

  // 2. Filter empty entries
  const validPhones = filterNonEmpty(phones, 'value');
  const validEmails = filterNonEmpty(emails, 'value');

  // 3. Normalize data
  const normalized = {
    first_name: safeTrim(formData.first_name),
    last_name: safeTrim(formData.last_name),
    email: normalizeTrimLowercase(formData.email)
  };

  // 4. Submit with error handling
  try {
    await createContact(normalized);
    showAlert.success('Contact created!');
  } catch (error) {
    logger.error('ContactForm', 'handleSubmit', error);
    showAlert.error('Failed to create contact');
  }
};
```

### Database CRUD Operations

```javascript
import { is, hasValue } from '../utils/validators';
import { buildInsert, buildUpdateSet, pick, placeholders } from '../database/sqlHelpers';
import { logger } from '../errors/utils/errorLogger';
import { DatabaseError } from '../errors/database/DatabaseError';

const ALLOWED_FIELDS = ['first_name', 'last_name', 'email'];
const UPDATABLE_FIELDS = ['first_name', 'last_name', 'email'];

async create(data) {
  // 1. Validate required fields
  if (!hasValue(data?.first_name)) {
    throw new DatabaseError('first_name is required', 'VALIDATION_ERROR');
  }

  // 2. Pick allowed fields and build SQL
  const allowed = pick(data, ALLOWED_FIELDS);
  const { sql, values } = buildInsert('contacts', allowed);

  // 3. Execute
  const result = await execute(sql, values);
  logger.success('ContactsDB', 'create', { id: result.insertId });

  return this.getById(result.insertId);
}

async update(id, data) {
  // 1. Pick and build SQL
  const allowed = pick(data, UPDATABLE_FIELDS);
  const { sql, values } = buildUpdateSet(allowed);

  if (!sql) {
    throw new DatabaseError('No fields to update', 'VALIDATION_ERROR');
  }

  // 2. Execute
  await execute(`UPDATE contacts SET ${sql} WHERE id = ?`, [...values, id]);
  logger.success('ContactsDB', 'update', { id });

  return this.getById(id);
}
```

### TanStack Query Mutations

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMutationHandlers } from '../hooks/queries/queryHelpers';
import database from '../database';

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => database.contacts.create(data),
    ...createMutationHandlers(
      queryClient,
      [contactKeys.all, contactKeys.lists()],
      {
        onSuccess: (newContact) => {
          queryClient.setQueryData(contactKeys.detail(newContact.id), newContact);
        },
        context: 'useCreateContact'
      }
    )
  });
}
```

---

## Performance Tips

1. **Use `unique()` instead of manual Set operations** - More readable and validated
2. **Use `chunk()` for SQLite operations** - Prevents parameter limit errors (999 max)
3. **Use `buildUpdateSet()` for dynamic updates** - Cleaner than manual string building
4. **Use `filterNonEmpty()` before DB operations** - Avoid inserting empty values
5. **Use `createMutationHandlers()` for TanStack Query** - Automatic invalidation and logging
6. **Use `useAsyncLoading()` for simple loading states** - Automatic cleanup
7. **Use `logger` in all try-catch blocks** - Consistent error tracking

---

## Testing Helpers

All helper functions have comprehensive unit tests:

- **arrayHelpers**: 38 tests (100% coverage)
- **dateUtils**: Comprehensive test suite
- Other helpers: Add tests as needed

Run tests:
```bash
npm test                    # All tests
npm test arrayHelpers       # Specific helper
npm run test:coverage       # Coverage report
```

---

## Additional Resources

- **Full Documentation**: `docs/AUDIT-RESULTS.md`
- **Technical Docs**: `CLAUDE.md`
- **Implementation Examples**: Check migrated files for real-world usage
- **Error Patterns**: See Error Handling section in `CLAUDE.md`

---

**Last Updated**: November 10, 2025
**Total Helpers**: 54+ functions across 11 modules
**Patterns Eliminated**: 551+ duplicate patterns (93% of identified)
