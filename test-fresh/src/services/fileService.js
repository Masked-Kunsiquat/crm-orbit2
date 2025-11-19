import { File, Directory, Paths } from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import db from '../database';
import { ServiceError, logger } from '../errors';
import { is } from '../utils/validators';
import { getFileExtension } from '../utils/fileHelpers';

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
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      'image/webp',
      'image/avif',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    audio: ['audio/mpeg', 'audio/m4a'],
    video: ['video/mp4', 'video/quicktime'],
  },
};

/**
 * Determine the logical file type bucket from a MIME type.
 * Defaults to 'document' if the MIME type is not recognized.
 *
 * @param {string} mimeType - The MIME type (e.g., 'image/jpeg').
 * @returns {'image'|'document'|'audio'|'video'} The normalized file category.
 */
const getFileType = mimeType => {
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
const getFileDirectory = fileType => {
  const baseDir = `${documentDirectory}attachments`;
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

/**
 * Normalize a URI and check if it is contained within the application's
 * sandboxed documentDirectory. Uses URL parsing to remove dot segments and
 * then performs a prefix check against the normalized documentDirectory.
 *
 * @param {string} uri - Absolute URI to validate (e.g., file:///... ).
 * @returns {boolean} True if the uri is within documentDirectory; otherwise false.
 */
function isPathInsideDocumentDirectory(uri) {
  if (!uri || !is.string(uri)) return false;
  try {
    const docHref = new URL(documentDirectory).href;
    const targetHref = new URL(uri).href;
    return targetHref.startsWith(docHref);
  } catch (_e) {
    // Fallback: plain string prefix check if URL parsing fails
    return uri.startsWith(documentDirectory);
  }
}

/**
 * Detect MIME type from filename extension.
 *
 * @param {string} name - The filename including extension.
 * @returns {string|null} The detected MIME type or null if unknown.
 */
function detectMimeTypeFromName(name) {
  const ext = getFileExtension(name);
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mp3: 'audio/mpeg',
    m4a: 'audio/m4a',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return map[ext] || null;
}

/**
 * Recursively list all files in a directory, skipping subdirectories.
 *
 * @param {string} dir - Directory path to scan recursively.
 * @returns {Promise<string[]>} Array of absolute file paths.
 */
const listFilesRecursively = async dir => {
  const files = [];
  try {
    const directory = new Directory(dir);
    if (!directory.exists) {
      return files;
    }
    const entries = directory.list();
    for (const entry of entries) {
      if (entry instanceof Directory) {
        const subFiles = await listFilesRecursively(entry.uri);
        files.push(...subFiles);
      } else {
        files.push(entry.uri);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read, return empty array
    logger.warn('FileService', `Could not read directory ${dir}`, { error: error.message });
  }
  return files;
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
    let destFile = null;
    let thumbnailFile = null;

    try {
      const sourceFile = new File(uri);
      if (!sourceFile.exists) {
        throw new Error('File does not exist at provided URI.');
      }

      if (!this.validateFileSize(sourceFile.size)) {
        throw new Error(
          `File size exceeds the ${FILE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`
        );
      }

      let mimeType =
        detectMimeTypeFromName(originalName) ?? 'application/octet-stream';
      if (!this.validateFileType(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const fileType = getFileType(mimeType);
      const uuid = Crypto.randomUUID();
      let fileExtension = getFileExtension(originalName);

      // Only convert iOS-specific formats (HEIC/HEIF) to JPEG for compatibility
      // Preserve other formats (PNG transparency, GIF animation, etc.)
      const shouldConvertToJpeg = fileType === 'image' &&
        (mimeType.includes('heic') || mimeType.includes('heif'));

      if (shouldConvertToJpeg) {
        fileExtension = 'jpg';
        mimeType = 'image/jpeg';
      }

      const fileName = `${uuid}.${fileExtension}`;

      const directoryPath = getFileDirectory(fileType);
      const directory = new Directory(directoryPath);
      directory.create({ intermediates: true, idempotent: true });

      destFile = new File(directoryPath, fileName);

      // Resize and optionally convert images
      if (fileType === 'image') {
        try {
          const manipulateOptions = shouldConvertToJpeg
            ? { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            : { compress: 0.9, format: ImageManipulator.SaveFormat.PNG };

          const compressed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], // Max width 800px
            manipulateOptions
          );
          const compressedFile = new File(compressed.uri);
          compressedFile.move(destFile);
          logger.success('FileService', 'saveFile - processed image', {
            originalSize: sourceFile.size,
            processedSize: destFile.size,
            converted: shouldConvertToJpeg,
          });
        } catch (compressionError) {
          // Fallback to original if processing fails
          logger.warn('FileService', 'Image processing failed, using original', {
            error: compressionError.message,
          });
          sourceFile.copy(destFile);
        }
      } else {
        // Non-images: direct copy
        sourceFile.copy(destFile);
      }

      if (destFile.size > FILE_CONFIG.MAX_FILE_SIZE) {
        destFile.delete();
        throw new Error(
          `Saved file size (${(destFile.size / (1024 * 1024)).toFixed(2)}MB) exceeds the ${FILE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`
        );
      }

      let thumbnailPath = null;
      if (fileType === 'image') {
        thumbnailPath = await this.generateThumbnail(destFile.uri, uuid);
      }

      const attachmentData = {
        entity_type: entityType,
        entity_id: entityId,
        file_name: fileName,
        original_name: originalName,
        file_path: destFile.uri,
        file_type: fileType,
        mime_type: mimeType,
        // Fallback to sourceFile.size is logically unreachable after line 251 validation,
        // but provides defensive safety if File API behavior changes or returns undefined
        file_size: destFile.size ?? sourceFile.size,
        thumbnail_path: thumbnailPath,
      };

      return await db.attachments.create(attachmentData);
    } catch (error) {
      try {
        if (destFile && destFile.exists) {
          destFile.delete();
        }
        if (thumbnailFile && thumbnailFile.exists) {
          thumbnailFile.delete();
        }
      } catch (cleanupError) {
        logger.error('FileService', 'saveFile - cleanup', cleanupError);
      }
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
        logger.warn('FileService', `Attachment with id ${attachmentId} not found in database`);
        return;
      }

      if (isPathInsideDocumentDirectory(attachment.file_path)) {
        const file = new File(attachment.file_path);
        if (file.exists) {
          file.delete();
        }
      } else {
        logger.warn('FileService', 'Refusing to delete file outside app sandbox', {
          filePath: attachment.file_path
        });
      }

      if (attachment.thumbnail_path) {
        if (isPathInsideDocumentDirectory(attachment.thumbnail_path)) {
          const thumbnailFile = new File(attachment.thumbnail_path);
          if (thumbnailFile.exists) {
            thumbnailFile.delete();
          }
        } else {
          logger.warn('FileService', 'Refusing to delete thumbnail outside app sandbox', {
            thumbnailPath: attachment.thumbnail_path
          });
        }
      }

      await db.attachments.delete(attachmentId);
      logger.success('FileService', 'deleteFile', { attachmentId });
    } catch (error) {
      logger.error('FileService', 'deleteFile', error, { attachmentId });
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
      logger.error('FileService', 'getFileUri', error, { attachmentId });
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
      const thumbnailDir = `${documentDirectory}attachments/images/thumbnails`;
      const directory = new Directory(thumbnailDir);
      directory.create({ intermediates: true, idempotent: true });

      const thumbnailFile = new File(thumbnailDir, `${uuid}_thumb.jpg`);

      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: FILE_CONFIG.THUMBNAIL_SIZE }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const tempFile = new File(manipResult.uri);
      tempFile.move(thumbnailFile);

      logger.success('FileService', 'generateThumbnail', { uuid });
      return thumbnailFile.uri;
    } catch (error) {
      logger.error('FileService', 'generateThumbnail', error, { imageUri, uuid });
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
      logger.error('FileService', 'getThumbnailUri', error, { attachmentId });
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
      const allDbAttachments = await db.attachments.getAll({ limit: 1000 }); // Assuming getAll supports pagination
      const allDbPaths = new Set(
        allDbAttachments
          .map(a => a.file_path)
          .concat(allDbAttachments.map(a => a.thumbnail_path))
      );

      const attachmentsDir = `${documentDirectory}attachments`;
      const fileSystemAttachments = await listFilesRecursively(attachmentsDir);

      let orphanedCount = 0;
      for (const filePath of fileSystemAttachments) {
        if (!allDbPaths.has(filePath)) {
          const file = new File(filePath);
          if (file.exists) {
            file.delete();
            orphanedCount++;
          }
        }
      }

      const dbOrphans = await db.attachments.cleanupOrphaned();
      const deleted =
        dbOrphans && is.number(dbOrphans.deletedCount)
          ? dbOrphans.deletedCount
          : 0;

      const totalDeleted = orphanedCount + deleted;
      logger.success('FileService', 'cleanOrphanedFiles', {
        filesDeleted: orphanedCount,
        dbRecordsDeleted: deleted,
        totalDeleted
      });

      return totalDeleted;
    } catch (error) {
      logger.error('FileService', 'cleanOrphanedFiles', error);
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
      logger.error('FileService', 'calculateStorageUsed', error);
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
        const attachment = await this.saveFile(
          uri,
          originalName,
          entityType,
          entityId
        );
        savedAttachments.push(attachment);
      }
      logger.success('FileService', 'saveMultipleFiles', { fileCount: files.length });
      return savedAttachments;
    } catch (error) {
      logger.error('FileService', 'saveMultipleFiles', error, { fileCount: files.length });
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
      logger.success('FileService', 'deleteMultipleFiles', { fileCount: attachmentIds.length });
    } catch (error) {
      logger.error('FileService', 'deleteMultipleFiles', error, { fileCount: attachmentIds.length });
      throw new ServiceError('fileService', 'deleteMultipleFiles', error);
    }
  },
};
