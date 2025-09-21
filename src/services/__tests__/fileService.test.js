// Unit tests for fileService behavior with mocked Expo modules and DB

// Mock Expo FileSystem
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock-docs/',
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 2048 })),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  moveAsync: jest.fn(async () => {}),
}));

// Prevent loading real expo-sqlite when database module is imported indirectly
jest.mock('expo-sqlite', () => ({}), { virtual: true });

// Mock Expo ImageManipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({ uri: 'file:///temp/thumb.jpg' })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-1234'),
}));

// Mock ServiceError class used by fileService
jest.mock(
  '../errors',
  () => ({
    ServiceError: class ServiceError extends Error {
      constructor(service, operation, originalError) {
        super(
          `${service}.${operation} failed: ${originalError?.message || originalError}`
        );
        this.service = service;
        this.operation = operation;
        this.originalError = originalError;
      }
    },
  }),
  { virtual: true }
);

// Database mock is provided via moduleNameMapper to
// src/services/__mocks__/database.js

// Avoid importing Expo modules at top-level because we reset module registry; re-require them per test
// Import fileService directly since mocks are configured at module level
const { fileService } = require('../fileService');

describe('fileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // reset defaults on fresh instances where applicable in each test
  });

  describe('saveFile', () => {
    test('saves an image file and persists thumbnail path', async () => {
      const FS = require('expo-file-system');
      const Image = require('expo-image-manipulator');
      const db = require('../database');

      // Mock file existence and size checks for both original and saved file
      FS.getInfoAsync.mockImplementation(async path => {
        if (path.includes('photo.jpg') || path.includes('uuid-1234.jpg')) {
          return { exists: true, size: 1024 };
        }
        return { exists: true, size: 1024 };
      });

      db.attachments.create.mockImplementation(async data => ({
        id: 2,
        ...data,
      }));

      const attachment = await fileService.saveFile(
        'file:///input/photo.jpg',
        'photo.jpg',
        'note',
        7
      );

      expect(Image.manipulateAsync).toHaveBeenCalled();
      expect(attachment).toEqual(expect.objectContaining({ id: 2 }));
      const expectedImgDir = `${FS.documentDirectory}attachments/images`;
      expect(FS.makeDirectoryAsync).toHaveBeenCalledWith(expectedImgDir, {
        intermediates: true,
      });
      expect(FS.copyAsync).toHaveBeenCalledWith({
        from: 'file:///input/photo.jpg',
        to: expect.stringContaining(`${expectedImgDir}/`),
      });
      expect(db.attachments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          original_name: 'photo.jpg',
          file_type: 'image',
          thumbnail_path: expect.stringContaining(
            '/attachments/images/thumbnails/uuid-1234_thumb.jpg'
          ),
        })
      );
    });

    test('saves a document file and creates DB record (no thumbnail)', async () => {
      const uri = 'file:///input/report.pdf';
      const originalName = 'report.pdf';
      const entityType = 'note';
      const entityId = 5;

      // Access current mock instances
      const FS = require('expo-file-system');
      const Image = require('expo-image-manipulator');
      const db = require('../database');

      // Mock file existence and size checks for both original and saved file
      FS.getInfoAsync.mockImplementation(async path => {
        if (path.includes('report.pdf') || path.includes('uuid-1234.pdf')) {
          return { exists: true, size: 2048 };
        }
        return { exists: true, size: 2048 };
      });

      db.attachments.create.mockImplementation(async data => ({
        id: 1,
        ...data,
      }));

      const attachment = await fileService.saveFile(
        uri,
        originalName,
        entityType,
        entityId
      );

      // directory should be documents due to PDF mime type
      const expectedDir = `${FS.documentDirectory}attachments/documents`;

      expect(FS.makeDirectoryAsync).toHaveBeenCalledWith(expectedDir, {
        intermediates: true,
      });
      expect(FS.copyAsync).toHaveBeenCalledWith({
        from: uri,
        to: expect.stringContaining(
          `${FS.documentDirectory}attachments/documents/`
        ),
      });
      expect(Image.manipulateAsync).not.toHaveBeenCalled(); // not an image

      // DB record creation
      expect(db.attachments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: entityType,
          entity_id: entityId,
          original_name: originalName,
          file_type: 'document',
          thumbnail_path: null,
        })
      );

      expect(attachment).toEqual(
        expect.objectContaining({ id: 1, original_name: originalName })
      );
    });

    test('throws ServiceError and wraps underlying error on failure', async () => {
      const FS = require('expo-file-system');
      const db = require('../database');
      FS.getInfoAsync.mockRejectedValueOnce(new Error('FS failure'));

      await expect(
        fileService.saveFile('file:///x', 'x.txt', 'note', 1)
      ).rejects.toMatchObject({
        service: 'fileService',
        operation: 'saveFile',
        message: expect.stringContaining('FS failure'),
      });
    });
  });

  describe('generateThumbnail', () => {
    test('generates a JPEG thumbnail file and returns its path', async () => {
      const FS = require('expo-file-system');
      const Image = require('expo-image-manipulator');
      const path = await fileService.generateThumbnail(
        'file:///mock/image.jpg',
        'uuid-1234'
      );

      const thumbDir = `${FS.documentDirectory}attachments/images/thumbnails`;
      const expectedThumb = `${thumbDir}/uuid-1234_thumb.jpg`;

      expect(FS.makeDirectoryAsync).toHaveBeenCalledWith(thumbDir, {
        intermediates: true,
      });
      expect(Image.manipulateAsync).toHaveBeenCalled();
      expect(FS.moveAsync).toHaveBeenCalledWith({
        from: 'file:///temp/thumb.jpg',
        to: expectedThumb,
      });
      expect(path).toBe(expectedThumb);
    });
  });

  describe('deleteFile', () => {
    test('deletes file and thumbnail, then removes DB record', async () => {
      const db = require('../database');
      const FS = require('expo-file-system');
      db.attachments.getById.mockResolvedValueOnce({
        id: 9,
        file_path: `${FS.documentDirectory}attachments/documents/uuid-1234.pdf`,
        thumbnail_path: `${FS.documentDirectory}attachments/images/thumbnails/uuid-1234_thumb.jpg`,
      });

      await fileService.deleteFile(9);

      expect(FS.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('attachments/documents/uuid-1234.pdf'),
        { idempotent: true }
      );
      expect(FS.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining(
          'attachments/images/thumbnails/uuid-1234_thumb.jpg'
        ),
        { idempotent: true }
      );
      expect(db.attachments.delete).toHaveBeenCalledWith(9);
    });

    test('returns early with warning if DB record not found', async () => {
      const db = require('../database');
      db.attachments.getById.mockResolvedValueOnce(null);

      await fileService.deleteFile(999);

      const FS = require('expo-file-system');
      expect(FS.deleteAsync).not.toHaveBeenCalled();
      expect(db.attachments.delete).not.toHaveBeenCalled();
    });
  });

  describe('getFileUri/getThumbnailUri', () => {
    test('getFileUri returns path or null', async () => {
      const db = require('../database');
      db.attachments.getById.mockResolvedValueOnce({ file_path: '/path/a' });
      await expect(fileService.getFileUri(1)).resolves.toBe('/path/a');

      db.attachments.getById.mockResolvedValueOnce(null);
      await expect(fileService.getFileUri(2)).resolves.toBeNull();
    });

    test('getThumbnailUri returns path or null', async () => {
      const db = require('../database');
      db.attachments.getById.mockResolvedValueOnce({
        thumbnail_path: '/path/t',
      });
      await expect(fileService.getThumbnailUri(1)).resolves.toBe('/path/t');

      db.attachments.getById.mockResolvedValueOnce(null);
      await expect(fileService.getThumbnailUri(2)).resolves.toBeNull();

      db.attachments.getById.mockResolvedValueOnce({ thumbnail_path: null });
      await expect(fileService.getThumbnailUri(3)).resolves.toBeNull();
    });
  });

  describe('cleanOrphanedFiles', () => {
    test('deletes non-referenced files and sums DB cleanup', async () => {
      const FS = require('expo-file-system');
      const db = require('../database');
      const attachmentsDir = `${FS.documentDirectory}attachments`;

      // DB has one file to keep
      db.attachments.getAll.mockResolvedValueOnce([
        { file_path: `${attachmentsDir}/keep.pdf`, thumbnail_path: null },
      ]);

      // Mock the recursive directory reading behavior
      // The implementation now uses listFilesRecursively instead of readDirectoryAsync
      // We need to mock the recursive behavior through getInfoAsync and readDirectoryAsync
      FS.readDirectoryAsync.mockImplementation(async path => {
        if (path === attachmentsDir) {
          return ['keep.pdf', 'remove.pdf'];
        }
        return [];
      });

      FS.getInfoAsync.mockImplementation(async path => {
        if (path.includes('remove.pdf')) {
          return { exists: true, isDirectory: false };
        }
        return { exists: true, isDirectory: false };
      });

      // DB cleanup says it removed 2 stale records
      db.attachments.cleanupOrphaned.mockResolvedValueOnce({
        success: true,
        deletedCount: 2,
      });

      const deleted = await fileService.cleanOrphanedFiles();

      expect(FS.deleteAsync).toHaveBeenCalledWith(
        `${attachmentsDir}/remove.pdf`,
        { idempotent: true }
      );
      expect(db.attachments.cleanupOrphaned).toHaveBeenCalled();
      expect(deleted).toBe(1 + 2); // 1 FS orphan + 2 DB orphans
    });

    test('recursively deletes orphaned files from nested subdirectories', async () => {
      const FS = require('expo-file-system');
      const db = require('../database');
      const attachmentsDir = `${FS.documentDirectory}attachments`;

      // DB has files in specific directories to keep
      db.attachments.getAll.mockResolvedValueOnce([
        {
          file_path: `${attachmentsDir}/images/keep.jpg`,
          thumbnail_path: null,
        },
        {
          file_path: `${attachmentsDir}/documents/keep.pdf`,
          thumbnail_path: null,
        },
      ]);

      // Mock recursive directory structure
      FS.readDirectoryAsync.mockImplementation(async path => {
        if (path === attachmentsDir) {
          return ['images', 'documents', 'orphan.txt'];
        }
        if (path === `${attachmentsDir}/images`) {
          return ['keep.jpg', 'orphan.jpg'];
        }
        if (path === `${attachmentsDir}/documents`) {
          return ['keep.pdf', 'orphan.pdf'];
        }
        return [];
      });

      // Mock file info checks
      FS.getInfoAsync.mockImplementation(async path => {
        if (path.includes('images') && !path.includes('.')) {
          return { exists: true, isDirectory: true };
        }
        if (path.includes('documents') && !path.includes('.')) {
          return { exists: true, isDirectory: true };
        }
        return { exists: true, isDirectory: false };
      });

      // DB cleanup says it removed 1 stale record
      db.attachments.cleanupOrphaned.mockResolvedValueOnce({
        success: true,
        deletedCount: 1,
      });

      const deleted = await fileService.cleanOrphanedFiles();

      // Should delete orphaned files from multiple directories
      expect(typeof deleted).toBe('number');
      expect(deleted).toBeGreaterThanOrEqual(1); // At least the DB cleanup count
      const calls = require('expo-file-system').deleteAsync.mock.calls.map(
        ([p]) => p
      );
      expect(calls.some(p => p.endsWith('/images/orphan.jpg'))).toBe(true);
      expect(calls.some(p => p.endsWith('/documents/orphan.pdf'))).toBe(true);
      expect(calls.some(p => p.endsWith('/orphan.txt'))).toBe(true);
    });
  });

  describe('calculateStorageUsed', () => {
    test('returns value from DB', async () => {
      const db = require('../database');
      db.attachments.getTotalSize.mockResolvedValueOnce(12345);
      await expect(fileService.calculateStorageUsed()).resolves.toBe(12345);
      expect(db.attachments.getTotalSize).toHaveBeenCalled();
    });
  });

  describe('validation helpers', () => {
    test('validateFileSize respects max', () => {
      expect(fileService.validateFileSize(10 * 1024 * 1024)).toBe(true);
      expect(fileService.validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    test('validateFileType allows known types', () => {
      expect(fileService.validateFileType('image/jpeg')).toBe(true);
      expect(fileService.validateFileType('image/webp')).toBe(true);
      expect(fileService.validateFileType('image/heic')).toBe(true);
      expect(fileService.validateFileType('application/pdf')).toBe(true);
      expect(fileService.validateFileType('audio/mpeg')).toBe(true);
      expect(fileService.validateFileType('video/mp4')).toBe(true);
      expect(fileService.validateFileType('application/octet-stream')).toBe(
        false
      );
    });
  });

  describe('batch operations', () => {
    test('saveMultipleFiles aggregates results', async () => {
      const spy = jest
        .spyOn(fileService, 'saveFile')
        .mockImplementation(async (uri, name, type, id) => ({
          id: id,
          file_name: name,
        }));
      const files = [
        { uri: 'a', originalName: 'a.txt', entityType: 'note', entityId: 1 },
        { uri: 'b', originalName: 'b.txt', entityType: 'note', entityId: 2 },
      ];

      const results = await fileService.saveMultipleFiles(files);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, file_name: 'a.txt' });
    });

    test('deleteMultipleFiles calls delete per id', async () => {
      const spy = jest.spyOn(fileService, 'deleteFile').mockResolvedValue();
      await fileService.deleteMultipleFiles([11, 22, 33]);
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenNthCalledWith(1, 11);
      expect(spy).toHaveBeenNthCalledWith(2, 22);
      expect(spy).toHaveBeenNthCalledWith(3, 33);
    });
  });
});
