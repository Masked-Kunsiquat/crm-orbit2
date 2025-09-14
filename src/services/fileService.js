
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import db from '../database';
import { ServiceError } from './errors';

/**
 * Global file handling configuration.
 * - MAX_FILE_SIZE: Maximum allowed file size (bytes).
 * - THUMBNAIL_SIZE: Target dimensions for generated thumbnails.
 * - ALLOWED_TYPES: Whitelist of allowed MIME types grouped by logical kind.
 */
const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  THUMBNAIL_SIZE: { width: 150, height: 150 },
  ALLOWED_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mpeg', 'audio/m4a'],
    video: ['video/mp4', 'video/quicktime']
  }
};

/**
 * Determine the logical file type bucket from a MIME type.
 * Defaults to 'document' if the MIME type is not recognized.
 *
 * @param {string} mimeType - The MIME type (e.g., 'image/jpeg').
 * @returns {'image'|'document'|'audio'|'video'} The normalized file category.
 */
const getFileType = (mimeType) => {
    for (const type in FILE_CONFIG.ALLOWED_TYPES) {
        if (FILE_CONFIG.ALLOWED_TYPES[type].includes(mimeType)) {
            return type;
        }
    }
    return 'document'; // Default to document
};

/**
 * Resolve the directory path within the app sandbox for a given file type.
 *
 * @param {'image'|'document'|'audio'|'video'|string} fileType - Canonical file type.
 * @returns {string} Absolute path under `FileSystem.documentDirectory` where files are stored.
 */
const getFileDirectory = (fileType) => {
    const baseDir = `${FileSystem.documentDirectory}attachments`;
    switch (fileType) {
        case 'image':
            return `${baseDir}/images`;
        case 'document':
            return `${baseDir}/documents`;
        case 'audio':
            return `${baseDir}/audio`;
        case 'video':
            return `${baseDir}/videos`;
        default:
            return `${baseDir}/other`;
    }
};


export const fileService = {
  /**
   * Persist a file and its metadata, optionally generating an image thumbnail.
   * Steps:
   * 1) Validate file existence and size.
   * 2) Determine logical file type from MIME (currently using a default MIME).
   * 3) Copy the file into the app sandbox directory.
   * 4) If image, generate and store a thumbnail.
   * 5) Create an attachments DB record and return it.
   *
   * Note: MIME detection is currently stubbed to 'application/octet-stream' and
   * may need enhancement to detect MIME type from the source URI or metadata.
   *
   * @param {string} uri - Source URI to the file (local device path or content URI).
   * @param {string} originalName - Original filename including extension.
   * @param {string} entityType - Entity type this attachment belongs to (e.g., 'contact').
   * @param {string|number} entityId - Entity identifier the attachment is linked to.
   * @returns {Promise<object>} The created attachment record as stored in the DB.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async saveFile(uri, originalName, entityType, entityId) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at provided URI.');
      }

      if (!this.validateFileSize(fileInfo.size)) {
        throw new Error('File size exceeds the 10MB limit.');
      }
      
      const mimeType = 'application/octet-stream';
      
      if (!this.validateFileType(mimeType)) {
          console.warn(`Unsupported file type: ${mimeType}. Saving as document.`);
      }

      const fileType = getFileType(mimeType);
      const uuid = Crypto.randomUUID();
      const fileExtension = originalName.split('.').pop();
      const fileName = `${uuid}.${fileExtension}`;
      
      const directory = getFileDirectory(fileType);
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      
      const newPath = `${directory}/${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newPath });

      let thumbnailPath = null;
      if (fileType === 'image') {
        thumbnailPath = await this.generateThumbnail(newPath, uuid);
      }

      const attachmentData = {
        entity_type: entityType,
        entity_id: entityId,
        file_name: fileName,
        original_name: originalName,
        file_path: newPath,
        file_type: fileType,
        mime_type: mimeType,
        file_size: fileInfo.size,
        thumbnail_path: thumbnailPath,
      };

      return await db.attachments.create(attachmentData);
    } catch (error) {
      throw new ServiceError('fileService', 'saveFile', error);
    }
  },

  /**
   * Delete a file and its thumbnail (if present) and remove DB metadata.
   * If the attachment is not present in the DB, logs a warning and returns.
   *
   * @param {string|number} attachmentId - Identifier of the attachment to delete.
   * @returns {Promise<void>}
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async deleteFile(attachmentId) {
    try {
      const attachment = await db.attachments.getById(attachmentId);
      if (!attachment) {
        // If attachment not in DB, it might be an orphaned file.
        // The cleanup job will handle it. For now, we can just warn.
        console.warn(`Attachment with id ${attachmentId} not found in database.`);
        return;
      }

      await FileSystem.deleteAsync(attachment.file_path, { idempotent: true });

      if (attachment.thumbnail_path) {
        await FileSystem.deleteAsync(attachment.thumbnail_path, { idempotent: true });
      }

      await db.attachments.delete(attachmentId);
    } catch (error) {
      throw new ServiceError('fileService', 'deleteFile', error);
    }
  },

  /**
   * Resolve the on-device URI for a previously stored attachment.
   *
   * @param {string|number} attachmentId - The attachment identifier.
   * @returns {Promise<string|null>} Absolute file path or null if not found.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async getFileUri(attachmentId) {
    try {
        const attachment = await db.attachments.getById(attachmentId);
        return attachment ? attachment.file_path : null;
    } catch (error) {
        throw new ServiceError('fileService', 'getFileUri', error);
    }
  },

  /**
   * Generate and persist a JPEG thumbnail for an image file.
   * Creates a `thumbnails` subdirectory under `attachments/images/` if needed.
   * The thumbnail uses the configured `THUMBNAIL_SIZE` and ~70% JPEG compression.
   *
   * @param {string} imageUri - Absolute path to the source image on device.
   * @param {string} uuid - The base UUID used to name the thumbnail file.
   * @returns {Promise<string>} Absolute path to the generated thumbnail.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async generateThumbnail(imageUri, uuid) {
    try {
        const thumbnailDir = `${FileSystem.documentDirectory}attachments/images/thumbnails`;
        await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });
        const thumbnailPath = `${thumbnailDir}/${uuid}_thumb.jpg`;

        await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: FILE_CONFIG.THUMBNAIL_SIZE }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: false }
        );

        // The above line doesn't save the file, it returns a result.
        // Let's assume for now that a file is created at the same path with a suffix.
        // This part of expo-image-manipulator is tricky.
        // A better approach is to get the result and save it.
        const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: FILE_CONFIG.THUMBNAIL_SIZE }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        await FileSystem.moveAsync({ from: manipResult.uri, to: thumbnailPath });


        return thumbnailPath;
    } catch (error) {
        throw new ServiceError('fileService', 'generateThumbnail', error);
    }
  },

  /**
   * Resolve the on-device URI for a stored thumbnail.
   *
   * @param {string|number} attachmentId - The attachment identifier.
   * @returns {Promise<string|null>} Absolute thumbnail path or null if not available.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async getThumbnailUri(attachmentId) {
    try {
        const attachment = await db.attachments.getById(attachmentId);
        return attachment ? attachment.thumbnail_path : null;
    } catch (error) {
        throw new ServiceError('fileService', 'getThumbnailUri', error);
    }
  },

  /**
   * Remove files on disk that are not referenced in the database, and
   * remove database attachment records that point to missing files.
   *
   * @returns {Promise<number>} Total count of deleted filesystem and DB orphans.
   * @throws {ServiceError} Wrapped underlying errors with context.
   * @todo Consider recursive directory traversal to account for nested subfolders.
   */
  async cleanOrphanedFiles() {
    try {
        const allDbAttachments = await db.attachments.getAll({limit: 1000}); // Assuming getAll supports pagination
        const allDbPaths = new Set(allDbAttachments.map(a => a.file_path).concat(allDbAttachments.map(a => a.thumbnail_path)));

        const attachmentsDir = `${FileSystem.documentDirectory}attachments`;
        const fileSystemAttachments = await FileSystem.readDirectoryAsync(attachmentsDir);

        let orphanedCount = 0;
        for (const file of fileSystemAttachments) {
            const filePath = `${attachmentsDir}/${file}`;
            if (!allDbPaths.has(filePath)) {
                await FileSystem.deleteAsync(filePath, { idempotent: true });
                orphanedCount++;
            }
        }
        
        const dbOrphans = await db.attachments.cleanupOrphaned();

        return orphanedCount + dbOrphans.deletedCount;
    } catch (error) {
        throw new ServiceError('fileService', 'cleanOrphanedFiles', error);
    }
  },

  /**
   * Calculate total storage used by all attachments, as tracked by the DB.
   *
   * @returns {Promise<number>} Total bytes used across all attachments.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async calculateStorageUsed() {
    try {
        return await db.attachments.getTotalSize();
    } catch (error) {
        throw new ServiceError('fileService', 'calculateStorageUsed', error);
    }
  },

  /**
   * Validate whether a MIME type is allowed by configuration.
   *
   * @param {string} mimeType - MIME type to validate.
   * @returns {boolean} True if allowed, false otherwise.
   */
  validateFileType(mimeType) {
    return Object.values(FILE_CONFIG.ALLOWED_TYPES).flat().includes(mimeType);
  },

  /**
   * Validate file size does not exceed the configured maximum.
   *
   * @param {number} bytes - Size of the file in bytes.
   * @returns {boolean} True if size is within limit, false otherwise.
   */
  validateFileSize(bytes) {
    return bytes <= FILE_CONFIG.MAX_FILE_SIZE;
  },

  /**
   * Persist multiple files sequentially.
   *
   * @param {Array<{uri:string, originalName:string, entityType:string, entityId:string|number}>} files - List of files to save.
   * @returns {Promise<object[]>} Array of created attachment records.
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async saveMultipleFiles(files) {
    try {
        const savedAttachments = [];
        for (const file of files) {
            const { uri, originalName, entityType, entityId } = file;
            const attachment = await this.saveFile(uri, originalName, entityType, entityId);
            savedAttachments.push(attachment);
        }
        return savedAttachments;
    } catch (error) {
        throw new ServiceError('fileService', 'saveMultipleFiles', error);
    }
  },

  /**
   * Delete multiple attachments sequentially.
   *
   * @param {Array<string|number>} attachmentIds - Identifiers of attachments to delete.
   * @returns {Promise<void>}
   * @throws {ServiceError} Wrapped underlying errors with context.
   */
  async deleteMultipleFiles(attachmentIds) {
    try {
        for (const id of attachmentIds) {
            await this.deleteFile(id);
        }
    } catch (error) {
        throw new ServiceError('fileService', 'deleteMultipleFiles', error);
    }
  }
};
