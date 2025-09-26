# Attachments API Documentation

Documentation for the attachments database module for UI development. The attachments system provides universal file attachment functionality that can link files to any entity type in the CRM (contacts, events, interactions, notes, or companies).

## Import

```javascript
import { createAttachmentsDB } from '../database/attachments';
// Then initialize with database context
const attachmentsAPI = createAttachmentsDB({ execute, batch, transaction });
```

## Data Structure

### Attachment Object
```javascript
{
  id: number,                    // Auto-generated primary key
  entity_type: string,           // Required - 'contact' | 'interaction' | 'event' | 'note'
  entity_id: number,             // Required - Foreign key to the entity
  file_name: string,             // Required - System filename (stored on disk)
  original_name: string,         // Required - Original user filename
  file_path: string,             // Required - Full path to file on filesystem
  file_type: string,             // Required - 'image' | 'document' | 'audio' | 'video'
  mime_type: string | null,      // Optional - MIME type (e.g., 'image/jpeg', 'application/pdf')
  file_size: number | null,      // Optional - File size in bytes
  thumbnail_path: string | null, // Optional - Path to thumbnail (for images/videos)
  description: string | null,    // Optional - User description/notes
  created_at: string             // Auto-generated ISO datetime
}
```

### Attachment Input (for create/update)
```javascript
{
  entity_type: string,           // Required - 'contact' | 'interaction' | 'event' | 'note'
  entity_id: number,             // Required - ID of the entity to attach to
  file_name: string,             // Required - System filename
  original_name: string,         // Required - Original user filename
  file_path: string,             // Required - Full path to stored file
  file_type: string,             // Required - 'image' | 'document' | 'audio' | 'video'
  mime_type?: string,            // Optional - MIME type
  file_size?: number,            // Optional - File size in bytes (must be >= 0)
  thumbnail_path?: string,       // Optional - Path to thumbnail
  description?: string           // Optional - User description
}
```

## API Methods

### Create Attachment
```javascript
const newAttachment = await attachmentsAPI.create({
  entity_type: "contact",
  entity_id: 123,
  file_name: "photo_20240315_123456.jpg",
  original_name: "family_photo.jpg",
  file_path: "/path/to/stored/photo_20240315_123456.jpg",
  file_type: "image",
  mime_type: "image/jpeg",
  file_size: 2048576,
  thumbnail_path: "/path/to/thumbnails/photo_20240315_123456_thumb.jpg",
  description: "Family vacation photo"
});
```

### Get Attachment by ID
```javascript
const attachment = await attachmentsAPI.getById(attachmentId);
// Returns attachment object or null if not found
```

### Get All Attachments
```javascript
const attachments = await attachmentsAPI.getAll({
  limit: 50,               // Default 10, max 100
  offset: 0,               // Default 0
  sortBy: 'created_at',    // 'id' | 'entity_type' | 'file_name' | 'original_name' | 'file_type' | 'file_size' | 'created_at'
  sortOrder: 'DESC'        // 'ASC' | 'DESC'
});
```

### Update Attachment
```javascript
const updatedAttachment = await attachmentsAPI.update(attachmentId, {
  description: "Updated description",
  file_size: 2100000,
  thumbnail_path: "/path/to/new/thumbnail.jpg"
});
```

### Delete Attachment
```javascript
const result = await attachmentsAPI.delete(attachmentId);
// Returns: { success: true, deletedId: attachmentId }
// Throws DatabaseError with code 'NOT_FOUND' if attachment doesn't exist
```

### Get Attachments by Entity
```javascript
// Get all attachments for a specific contact
const contactAttachments = await attachmentsAPI.getByEntity("contact", 123);

// Get all attachments for a specific event
const eventAttachments = await attachmentsAPI.getByEntity("event", 456);
// Returns array of attachments ordered by created_at DESC
```

### Delete All Attachments by Entity
```javascript
const result = await attachmentsAPI.deleteByEntity("contact", 123);
// Returns: {
//   success: true,
//   deletedCount: 5,
//   entityType: "contact",
//   entityId: 123
// }
```

### Get Attachments by File Type
```javascript
const imageAttachments = await attachmentsAPI.getByFileType("image", {
  limit: 20,
  offset: 0,
  sortBy: 'created_at',
  sortOrder: 'DESC'
});

const documentAttachments = await attachmentsAPI.getByFileType("document");
```

### Get Total Storage Size
```javascript
// Get total size of all attachments
const totalSize = await attachmentsAPI.getTotalSize();

// Get total size for specific entity type
const contactsSize = await attachmentsAPI.getTotalSize("contact");

// Get total size for specific entity
const entitySize = await attachmentsAPI.getTotalSize("contact", 123);
// Returns size in bytes
```

### Update File Path
```javascript
// Update file path and optionally thumbnail path (useful for file migrations)
const updatedAttachment = await attachmentsAPI.updateFilePath(
  attachmentId,
  "/new/path/to/file.jpg",
  "/new/path/to/thumbnail.jpg" // Optional thumbnail path
);
```

### Get Orphaned Attachments
```javascript
// Find attachments whose entities have been deleted
const orphanedAttachments = await attachmentsAPI.getOrphaned();
// Returns attachments where the referenced entity no longer exists
```

### Cleanup Orphaned Attachments
```javascript
// Remove orphaned attachments from database
const result = await attachmentsAPI.cleanupOrphaned();
// Returns: { success: true, deletedCount: 3 }
```

## Usage Examples for UI Components

### File Upload Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

function FileUploadComponent({ entityType, entityId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload() {
    try {
      setUploading(true);

      // Pick file from device
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const systemFileName = `${entityType}_${entityId}_${timestamp}.${extension}`;

      // Define storage path
      const storagePath = `${FileSystem.documentDirectory}attachments/${systemFileName}`;

      // Copy file to permanent storage
      await FileSystem.copyAsync({
        from: file.uri,
        to: storagePath
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(storagePath);

      // Determine file type
      const fileType = getFileTypeFromMime(file.mimeType);

      // Create attachment record
      const db = await initDatabase();
      const newAttachment = await db.attachments.create({
        entity_type: entityType,
        entity_id: entityId,
        file_name: systemFileName,
        original_name: file.name,
        file_path: storagePath,
        file_type: fileType,
        mime_type: file.mimeType,
        file_size: fileInfo.size
      });

      onUploadComplete(newAttachment);
    } catch (error) {
      console.error('File upload failed:', error);
      // Show error message to user
    } finally {
      setUploading(false);
    }
  }

  function getFileTypeFromMime(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // Render upload button...
}
```

### Attachment List Component
```javascript
function AttachmentList({ entityType, entityId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  async function loadAttachments() {
    try {
      const db = await initDatabase();
      const entityAttachments = await db.attachments.getByEntity(entityType, entityId);
      setAttachments(entityAttachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    try {
      const db = await initDatabase();
      await db.attachments.delete(attachmentId);

      // Remove from local state
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));

      // Optionally delete the actual file
      // await FileSystem.deleteAsync(attachment.file_path);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      {attachments.map(attachment => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onDelete={() => handleDeleteAttachment(attachment.id)}
        />
      ))}
    </View>
  );
}
```

### Attachment Gallery Component
```javascript
function AttachmentGallery({ entityType, entityId }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    loadImages();
  }, [entityType, entityId]);

  async function loadImages() {
    try {
      const db = await initDatabase();
      const imageAttachments = await db.attachments.getByEntity(entityType, entityId);

      // Filter to only images
      const imageFiles = imageAttachments.filter(att => att.file_type === 'image');
      setImages(imageFiles);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }

  return (
    <ScrollView horizontal>
      {images.map(image => (
        <TouchableOpacity key={image.id} onPress={() => openImageViewer(image)}>
          <Image
            source={{ uri: image.thumbnail_path || image.file_path }}
            style={{ width: 100, height: 100, margin: 5 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
```

### File Manager Component
```javascript
function FileManager() {
  const [attachments, setAttachments] = useState([]);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    loadAttachments();
    loadTotalSize();
  }, [selectedFileType]);

  async function loadAttachments() {
    try {
      const db = await initDatabase();

      let attachmentList;
      if (selectedFileType) {
        attachmentList = await db.attachments.getByFileType(selectedFileType, {
          limit: 100,
          sortBy: 'file_size',
          sortOrder: 'DESC'
        });
      } else {
        attachmentList = await db.attachments.getAll({
          limit: 100,
          sortBy: 'created_at',
          sortOrder: 'DESC'
        });
      }

      setAttachments(attachmentList);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  }

  async function loadTotalSize() {
    try {
      const db = await initDatabase();
      const size = selectedFileType
        ? await db.attachments.getTotalSize(selectedFileType)
        : await db.attachments.getTotalSize();
      setTotalSize(size);
    } catch (error) {
      console.error('Failed to load total size:', error);
    }
  }

  async function cleanupOrphans() {
    try {
      const db = await initDatabase();
      const result = await db.attachments.cleanupOrphaned();
      alert(`Cleaned up ${result.deletedCount} orphaned attachments`);
      loadAttachments();
      loadTotalSize();
    } catch (error) {
      console.error('Failed to cleanup orphans:', error);
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Render file manager UI...
}
```

### Contact Profile with Attachments
```javascript
function ContactProfile({ contactId }) {
  const [contact, setContact] = useState(null);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    loadContactData();
  }, [contactId]);

  async function loadContactData() {
    try {
      const db = await initDatabase();

      const [contactData, contactAttachments] = await Promise.all([
        db.contacts.getById(contactId),
        db.attachments.getByEntity('contact', contactId)
      ]);

      setContact(contactData);
      setAttachments(contactAttachments);
    } catch (error) {
      console.error('Failed to load contact data:', error);
    }
  }

  async function handleAttachmentUpload(newAttachment) {
    setAttachments(prev => [newAttachment, ...prev]);
  }

  return (
    <ScrollView>
      {contact && (
        <>
          <ContactHeader contact={contact} />

          <Section title="Attachments">
            <FileUploadComponent
              entityType="contact"
              entityId={contactId}
              onUploadComplete={handleAttachmentUpload}
            />
            <AttachmentList
              entityType="contact"
              entityId={contactId}
            />
          </Section>
        </>
      )}
    </ScrollView>
  );
}
```

### Attachment Search Component
```javascript
function AttachmentSearch() {
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('all');

  async function performSearch() {
    try {
      const db = await initDatabase();

      let results = [];
      switch (searchType) {
        case 'images':
          results = await db.attachments.getByFileType('image');
          break;
        case 'documents':
          results = await db.attachments.getByFileType('document');
          break;
        case 'orphaned':
          results = await db.attachments.getOrphaned();
          break;
        default:
          results = await db.attachments.getAll({ limit: 100 });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  // Render search interface...
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
- `NOT_FOUND` - Attachment not found by ID
- `VALIDATION_ERROR` - Invalid input data (missing required fields, invalid entity types, etc.)
- `CREATE_FAILED` - Failed to create attachment
- `UPDATE_FAILED` - Failed to update attachment
- `DELETE_FAILED` - Failed to delete attachment
- `GET_FAILED` - Failed to retrieve attachment(s)

### Validation Rules
- `entity_type` must be one of: 'contact', 'interaction', 'event', 'note'
- `entity_id` must be a positive integer
- `file_type` must be one of: 'image', 'document', 'audio', 'video'
- `file_size` must be a non-negative number if provided
- `limit` for pagination must be between 1 and 100
- `offset` for pagination must be >= 0

## Universal Attachment System

The attachments system is designed to be universal - any entity in the CRM can have attachments:

### Supported Entity Types
- **contact** - Personal photos, documents, business cards
- **interaction** - Meeting notes, recordings, documents shared
- **event** - Invitations, photos, related documents
- **note** - Supporting files, images, audio recordings

### Entity Relationships
Attachments use a polymorphic relationship pattern:
- `entity_type` specifies which table the attachment belongs to
- `entity_id` specifies the specific record in that table
- Foreign key relationships are enforced at the application level

### File Types and MIME Types
The system categorizes files into broad types for easier management:
- **image**: JPEG, PNG, GIF, WebP, HEIC, etc.
- **document**: PDF, DOC, XLS, TXT, etc.
- **audio**: MP3, WAV, M4A, etc.
- **video**: MP4, MOV, AVI, etc.

### Storage Considerations
- Files are stored on the device filesystem
- `file_path` contains the full path to the stored file
- `thumbnail_path` contains path to generated thumbnail (for images/videos)
- Original filename is preserved in `original_name` for user display
- System generates unique `file_name` to avoid conflicts

## Integration Notes

### File Service Integration
The attachments module works closely with the file service:
```javascript
import { fileService } from '../services/fileService';

// File service handles the physical file operations
const savedFile = await fileService.saveFile(fileUri, entityType, entityId);

// Attachments module handles the database records
const attachment = await attachmentsAPI.create({
  entity_type: entityType,
  entity_id: entityId,
  file_name: savedFile.fileName,
  original_name: savedFile.originalName,
  file_path: savedFile.filePath,
  file_type: savedFile.fileType,
  mime_type: savedFile.mimeType,
  file_size: savedFile.fileSize,
  thumbnail_path: savedFile.thumbnailPath
});
```

### Entity Deletion Cleanup
When deleting entities, remember to clean up attachments:
```javascript
// When deleting a contact
await db.attachments.deleteByEntity('contact', contactId);
await db.contacts.delete(contactId);
```

### Backup and Export
Attachments are included in backup operations:
- Database records are exported in JSON/CSV format
- Physical files need separate backup handling
- Use `getAll()` with pagination for large attachment lists

## Notes for UI Development

1. **File Type Icons**: Use `file_type` field to show appropriate icons (image, document, audio, video)
2. **Thumbnails**: Check for `thumbnail_path` before falling back to `file_path` for images
3. **File Size Display**: Use `file_size` to show storage usage and implement size-based filtering
4. **Original Names**: Always display `original_name` to users, not the system `file_name`
5. **Universal Design**: Components should work with any `entity_type` for reusability
6. **Storage Management**: Implement cleanup features using `getOrphaned()` and `cleanupOrphaned()`
7. **Pagination**: Use pagination for attachment lists to handle large numbers of files
8. **MIME Type Handling**: Use `mime_type` for proper file handling and preview generation
9. **Error Recovery**: Handle missing files gracefully (file deleted but record remains)
10. **Performance**: Consider lazy loading for attachment lists and thumbnail generation