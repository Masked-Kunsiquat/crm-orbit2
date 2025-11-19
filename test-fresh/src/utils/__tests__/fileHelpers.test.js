/**
 * File Helpers Unit Tests
 *
 * Comprehensive tests for file and format utilities
 * Tests cover: getFileExtension, isImageFile, formatFileSize
 */

import {
  getFileExtension,
  isImageFile,
  formatFileSize
} from '../fileHelpers';

describe('fileHelpers', () => {
  // ============================================================================
  // getFileExtension
  // ============================================================================

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.jpg')).toBe('jpg');
      expect(getFileExtension('archive.zip')).toBe('zip');
      expect(getFileExtension('data.json')).toBe('json');
    });

    it('should convert extension to lowercase', () => {
      expect(getFileExtension('IMAGE.JPEG')).toBe('jpeg');
      expect(getFileExtension('Document.PDF')).toBe('pdf');
      expect(getFileExtension('file.TXT')).toBe('txt');
      expect(getFileExtension('Photo.PNG')).toBe('png');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
      expect(getFileExtension('backup.2023.11.10.zip')).toBe('zip');
      expect(getFileExtension('file.name.with.dots.pdf')).toBe('pdf');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should handle filenames with path', () => {
      expect(getFileExtension('/path/to/file.pdf')).toBe('pdf');
      expect(getFileExtension('C:\\Users\\Documents\\file.docx')).toBe('docx');
      expect(getFileExtension('./relative/path/image.png')).toBe('png');
    });

    it('should handle empty strings', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('   ')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(getFileExtension(null)).toBe('');
      expect(getFileExtension(undefined)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(getFileExtension(123)).toBe('');
      expect(getFileExtension(true)).toBe('');
      expect(getFileExtension({})).toBe('');
      expect(getFileExtension([])).toBe('');
    });

    it('should handle filenames starting with dot (hidden files)', () => {
      // Note: Hidden files like .gitignore are treated as having an extension
      // '.gitignore' → ['', 'gitignore'] → pop() → 'gitignore'
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env')).toBe('env');
      expect(getFileExtension('.eslintrc.js')).toBe('js');
    });

    it('should handle filenames ending with dot', () => {
      expect(getFileExtension('filename.')).toBe('');
      expect(getFileExtension('file.name.')).toBe('');
    });

    it('should handle single character extensions', () => {
      expect(getFileExtension('file.c')).toBe('c');
      expect(getFileExtension('script.r')).toBe('r');
    });

    it('should handle very long extensions', () => {
      expect(getFileExtension('file.verylongextension')).toBe('verylongextension');
    });

    it('should handle Unicode characters in filename', () => {
      expect(getFileExtension('文件.pdf')).toBe('pdf');
      expect(getFileExtension('café.jpg')).toBe('jpg');
      expect(getFileExtension('😀.png')).toBe('png');
    });

    it('should handle only dot', () => {
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('..')).toBe('');
    });
  });

  // ============================================================================
  // isImageFile
  // ============================================================================

  describe('isImageFile', () => {
    it('should return true for common image formats', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('image.jpeg')).toBe(true);
      expect(isImageFile('screenshot.png')).toBe(true);
      expect(isImageFile('animation.gif')).toBe(true);
    });

    it('should return true for modern image formats', () => {
      expect(isImageFile('image.webp')).toBe(true);
      expect(isImageFile('image.avif')).toBe(true);
    });

    it('should return true for iOS formats', () => {
      expect(isImageFile('photo.heic')).toBe(true);
      expect(isImageFile('image.heif')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isImageFile('PHOTO.JPG')).toBe(true);
      expect(isImageFile('Image.JPEG')).toBe(true);
      expect(isImageFile('FILE.PNG')).toBe(true);
      expect(isImageFile('ANIMATION.GIF')).toBe(true);
      expect(isImageFile('IMAGE.WEBP')).toBe(true);
      expect(isImageFile('PHOTO.HEIC')).toBe(true);
      expect(isImageFile('IMAGE.HEIF')).toBe(true);
      expect(isImageFile('IMAGE.AVIF')).toBe(true);
    });

    it('should return false for non-image formats', () => {
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('data.json')).toBe(false);
      expect(isImageFile('archive.zip')).toBe(false);
      expect(isImageFile('video.mp4')).toBe(false);
      expect(isImageFile('audio.mp3')).toBe(false);
      expect(isImageFile('text.txt')).toBe(false);
      expect(isImageFile('code.js')).toBe(false);
    });

    it('should return false for files without extension', () => {
      expect(isImageFile('README')).toBe(false);
      expect(isImageFile('Makefile')).toBe(false);
      expect(isImageFile('noextension')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isImageFile('')).toBe(false);
      expect(isImageFile('   ')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isImageFile(null)).toBe(false);
      expect(isImageFile(undefined)).toBe(false);
    });

    it('should handle filenames with path', () => {
      expect(isImageFile('/path/to/photo.jpg')).toBe(true);
      expect(isImageFile('C:\\Users\\Pictures\\image.png')).toBe(true);
      expect(isImageFile('./relative/path/screenshot.gif')).toBe(true);
    });

    it('should handle filenames with multiple dots', () => {
      expect(isImageFile('photo.edited.final.jpg')).toBe(true);
      expect(isImageFile('backup.2023.11.10.png')).toBe(true);
    });

    it('should return false for similar but non-matching extensions', () => {
      expect(isImageFile('file.jpg2')).toBe(false);
      expect(isImageFile('file.jpeg2')).toBe(false);
      expect(isImageFile('file.pngs')).toBe(false);
      expect(isImageFile('file.giff')).toBe(false);
    });

    it('should handle Unicode filenames', () => {
      expect(isImageFile('照片.jpg')).toBe(true);
      expect(isImageFile('фото.png')).toBe(true);
      expect(isImageFile('😀.gif')).toBe(true);
    });
  });

  // ============================================================================
  // formatFileSize
  // ============================================================================

  describe('formatFileSize', () => {
    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes (< 1 KB)', () => {
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB'); // 1024 * 1024
      expect(formatFileSize(5242880)).toBe('5 MB'); // 5 * 1024 * 1024
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB'); // 1024^3
      expect(formatFileSize(5368709120)).toBe('5 GB'); // 5 * 1024^3
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB'); // 1024^4
      expect(formatFileSize(5497558138880)).toBe('5 TB'); // 5 * 1024^4
      expect(formatFileSize(1649267441664)).toBe('1.5 TB');
    });

    it('should handle very large values beyond TB', () => {
      // Values larger than TB should still use TB
      const veryLarge = 1024 ** 5; // 1 PB in bytes
      const result = formatFileSize(veryLarge);
      expect(result).toContain('TB'); // Should clamp to TB
      expect(result).toContain('1024'); // 1024 TB
    });

    it('should respect decimal places parameter', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB'); // Rounded up
      expect(formatFileSize(1536, 1)).toBe('1.5 KB');
      expect(formatFileSize(1536, 2)).toBe('1.5 KB');
      expect(formatFileSize(1536, 3)).toBe('1.5 KB');
    });

    it('should handle default decimals', () => {
      // Default is 2 decimal places
      expect(formatFileSize(1234567)).toBe('1.18 MB');
      expect(formatFileSize(123456789)).toBe('117.74 MB');
    });

    it('should handle negative decimal places', () => {
      // Negative decimals should be treated as 0
      expect(formatFileSize(1536, -1)).toBe('2 KB');
      expect(formatFileSize(1536, -5)).toBe('2 KB');
    });

    it('should return "Unknown" for null', () => {
      expect(formatFileSize(null)).toBe('Unknown');
    });

    it('should return "Unknown" for undefined', () => {
      expect(formatFileSize(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for negative numbers', () => {
      expect(formatFileSize(-1)).toBe('Unknown');
      expect(formatFileSize(-1024)).toBe('Unknown');
      expect(formatFileSize(-100)).toBe('Unknown');
    });

    it('should return "Unknown" for NaN', () => {
      expect(formatFileSize(NaN)).toBe('Unknown');
    });

    it('should return "Unknown" for Infinity', () => {
      expect(formatFileSize(Infinity)).toBe('Unknown');
      expect(formatFileSize(-Infinity)).toBe('Unknown');
    });

    it('should return "Unknown" for non-numeric strings', () => {
      expect(formatFileSize('not a number')).toBe('Unknown');
      expect(formatFileSize('1024')).toBe('Unknown');
    });

    it('should handle edge case of 1 byte', () => {
      expect(formatFileSize(1)).toBe('1 Bytes');
    });

    it('should handle boundary values', () => {
      // Just under 1 KB
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      // Exactly 1 KB
      expect(formatFileSize(1024)).toBe('1 KB');
      // Just under 1 MB
      expect(formatFileSize(1048575)).toBe('1024 KB');
      // Exactly 1 MB
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should handle decimal input for bytes', () => {
      expect(formatFileSize(1.5)).toBe('1.5 Bytes');
      expect(formatFileSize(100.7)).toBe('100.7 Bytes');
    });

    it('should format realistic file sizes', () => {
      // Small image
      expect(formatFileSize(50000)).toBe('48.83 KB');
      // Document
      expect(formatFileSize(250000)).toBe('244.14 KB');
      // Photo
      expect(formatFileSize(2500000)).toBe('2.38 MB');
      // Video
      expect(formatFileSize(250000000)).toBe('238.42 MB');
      // Large video/database
      expect(formatFileSize(5000000000)).toBe('4.66 GB');
    });

    it('should handle object and array inputs', () => {
      expect(formatFileSize({})).toBe('Unknown');
      expect(formatFileSize([])).toBe('Unknown');
      expect(formatFileSize([1024])).toBe('Unknown');
    });

    it('should handle boolean inputs', () => {
      expect(formatFileSize(true)).toBe('Unknown');
      expect(formatFileSize(false)).toBe('Unknown');
    });
  });
});
