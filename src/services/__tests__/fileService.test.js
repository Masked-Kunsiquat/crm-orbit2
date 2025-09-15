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
jest.mock('../errors', () => ({
  ServiceError: class ServiceError extends Error {
    constructor(service, operation, originalError) {
      super(`${service}.${operation} failed: ${originalError?.message || originalError}`);
      this.service = service;
      this.operation = operation;
      this.originalError = originalError;
    }
  },
}), { virtual: true });

// Database mock is provided via moduleNameMapper to
// src/services/__tests__/__mocks__/database.js

// Avoid importing Expo modules at top-level because we reset module registry; re-require them per test
// Helper to import fileService with DB mocked
const freshFileService = () => {
  jest.resetModules();
  // database mock is mapped in jest.config.js; ensure other mocks stay active
  // errors and expo modules are already mocked at top
  // Re-require after mocks are in place in isolated module scope
  let fileService;
  jest.isolateModules(() => {
    fileService = require('../fileService').fileService;
  });
  return fileService;
};

describe('fileService', () => {
  // Access the mocked DB provided by moduleNameMapper
  const db = require('../database');
  beforeEach(() => {
    jest.clearAllMocks();
    // reset defaults on fresh instances where applicable in each test
  });

  describe('saveFile', () => {
    test('saves a document file and creates DB record (no thumbnail)', async () => {
      const fileService = freshFileService();
      const uri = 'file:///input/report.pdf';
      const originalName = 'report.pdf';
      const entityType = 'note';
      const entityId = 5;

      // Access current mock instances
      const FS = require('expo-file-system');
      const Image = require('expo-image-manipulator');
      const db = require('../database');

      // Set defaults for this test
      FS.getInfoAsync.mockResolvedValue({ exists: true, size: 2048 });
      db.attachments.create.mockImplementation(async (data) => ({ id: 1, ...data }));

      const attachment = await fileService.saveFile(uri, originalName, entityType, entityId);

      // directory should be documents due to default mime type
      const expectedDir = `${FS.documentDirectory}attachments/documents`;

      expect(FS.makeDirectoryAsync).toHaveBeenCalledWith(expectedDir, { intermediates: true });
      expect(FS.copyAsync).toHaveBeenCalledWith({ from: uri, to: expect.stringContaining(`${FS.documentDirectory}attachments/documents/`) });
      expect(Image.manipulateAsync).not.toHaveBeenCalled(); // not an image per current implementation

      // DB record creation
      expect(db.attachments.create).toHaveBeenCalledWith(expect.objectContaining({
        entity_type: entityType,
        entity_id: entityId,
        original_name: originalName,
        file_type: 'document',
        thumbnail_path: null,
      }));

      expect(attachment).toEqual(expect.objectContaining({ id: 1, original_name: originalName }));
    });

    test('throws ServiceError and wraps underlying error on failure', async () => {
      const fileService = freshFileService();
      const FS = require('expo-file-system');
      const db = require('../database');
      FS.getInfoAsync.mockRejectedValueOnce(new Error('FS failure'));

      await expect(fileService.saveFile('file:///x', 'x.txt', 'note', 1)).rejects.toMatchObject({
        service: 'fileService',
        operation: 'saveFile',
      });
    });
  });

  describe('generateThumbnail', () => {
    test('generates a JPEG thumbnail file and returns its path', async () => {
      const fileService = freshFileService();
      const FS = require('expo-file-system');
      const Image = require('expo-image-manipulator');
      const path = await fileService.generateThumbnail('file:///mock/image.jpg', 'uuid-1234');

      const thumbDir = `${FS.documentDirectory}attachments/images/thumbnails`;
      const expectedThumb = `${thumbDir}/uuid-1234_thumb.jpg`;

      expect(FS.makeDirectoryAsync).toHaveBeenCalledWith(thumbDir, { intermediates: true });
      expect(Image.manipulateAsync).toHaveBeenCalled();
      expect(FS.moveAsync).toHaveBeenCalledWith({ from: 'file:///temp/thumb.jpg', to: expectedThumb });
      expect(path).toBe(expectedThumb);
    });
  });

  describe('deleteFile', () => {
    test('deletes file and thumbnail, then removes DB record', async () => {
      const fileService = freshFileService();
      const db = require('../database');
      const FS = require('expo-file-system');
      db.attachments.getById.mockResolvedValueOnce({
        id: 9,
        file_path: `${FS.documentDirectory}attachments/documents/uuid-1234.pdf`,
        thumbnail_path: `${FS.documentDirectory}attachments/images/thumbnails/uuid-1234_thumb.jpg`,
      });

      await fileService.deleteFile(9);

      expect(FS.deleteAsync).toHaveBeenCalledWith(expect.stringContaining('attachments/documents/uuid-1234.pdf'), { idempotent: true });
      expect(FS.deleteAsync).toHaveBeenCalledWith(expect.stringContaining('attachments/images/thumbnails/uuid-1234_thumb.jpg'), { idempotent: true });
      expect(db.attachments.delete).toHaveBeenCalledWith(9);
    });

    test('returns early with warning if DB record not found', async () => {
      const fileService = freshFileService();
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
      const fileService = freshFileService();
      const db = require('../database');
      db.attachments.getById.mockResolvedValueOnce({ file_path: '/path/a' });
      await expect(fileService.getFileUri(1)).resolves.toBe('/path/a');

      db.attachments.getById.mockResolvedValueOnce(null);
      await expect(fileService.getFileUri(2)).resolves.toBeNull();
    });

    test('getThumbnailUri returns path or null', async () => {
      const fileService = freshFileService();
      const db = require('../database');
      db.attachments.getById.mockResolvedValueOnce({ thumbnail_path: '/path/t' });
      await expect(fileService.getThumbnailUri(1)).resolves.toBe('/path/t');

      db.attachments.getById.mockResolvedValueOnce(null);
      await expect(fileService.getThumbnailUri(2)).resolves.toBeNull();
    });
  });

  describe('cleanOrphanedFiles', () => {
    test('deletes non-referenced files from top-level directory and sums DB cleanup', async () => {
      const fileService = freshFileService();
      const FS = require('expo-file-system');
      const db = require('../database');
      const attachmentsDir = `${FS.documentDirectory}attachments`;
      const keep = 'keep.pdf';
      const remove = 'remove.pdf';

      // DB has one file to keep
      db.attachments.getAll.mockResolvedValueOnce([
        { file_path: `${attachmentsDir}/${keep}`, thumbnail_path: null },
      ]);

      // FileSystem has one keep and one orphan
      FS.readDirectoryAsync.mockResolvedValueOnce([keep, remove]);

      // DB cleanup says it removed 2 stale records
      db.attachments.cleanupOrphaned.mockResolvedValueOnce({ success: true, deletedCount: 2 });

      const deleted = await fileService.cleanOrphanedFiles();

      expect(FS.deleteAsync).toHaveBeenCalledWith(`${attachmentsDir}/${remove}`, { idempotent: true });
      expect(deleted).toBe(1 + 2); // 1 FS orphan + 2 DB orphans
    });
  });

  describe('calculateStorageUsed', () => {
    test('returns value from DB', async () => {
      const fileService = freshFileService();
      const db = require('../database');
      db.attachments.getTotalSize.mockResolvedValueOnce(12345);
      await expect(fileService.calculateStorageUsed()).resolves.toBe(12345);
    });
  });

  describe('validation helpers', () => {
    test('validateFileSize respects max', () => {
      const fileService = freshFileService();
      expect(fileService.validateFileSize(10 * 1024 * 1024)).toBe(true);
      expect(fileService.validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    test('validateFileType allows known types', () => {
      const fileService = freshFileService();
      expect(fileService.validateFileType('image/jpeg')).toBe(true);
      expect(fileService.validateFileType('application/pdf')).toBe(true);
      expect(fileService.validateFileType('application/octet-stream')).toBe(false);
    });
  });

  describe('batch operations', () => {
    test('saveMultipleFiles aggregates results', async () => {
      const fileService = freshFileService();
      const spy = jest.spyOn(fileService, 'saveFile').mockImplementation(async (uri, name, type, id) => ({ id: id, file_name: name }));
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
      const fileService = freshFileService();
      const spy = jest.spyOn(fileService, 'deleteFile').mockResolvedValue();
      await fileService.deleteMultipleFiles([11, 22, 33]);
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenNthCalledWith(1, 11);
      expect(spy).toHaveBeenNthCalledWith(2, 22);
      expect(spy).toHaveBeenNthCalledWith(3, 33);
    });
  });
});
