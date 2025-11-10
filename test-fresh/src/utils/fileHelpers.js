/**
 * File & Format Helper Utilities
 *
 * Centralized utilities for file operations and formatting
 * to reduce code duplication and ensure consistent file handling.
 */

/**
 * Extract the file extension from a filename
 *
 * @param {string} filename - The filename including extension
 * @returns {string} The lowercase file extension without the dot, or empty string if no extension
 * @example
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('image.JPEG') // 'jpeg'
 * getFileExtension('noextension') // ''
 * getFileExtension(null) // ''
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Check if a file is an image based on its filename extension
 *
 * Supports common image formats including HEIC/HEIF (iOS), WebP, and AVIF.
 *
 * @param {string} filename - The filename to check
 * @returns {boolean} True if the file extension indicates an image format
 * @example
 * isImageFile('photo.jpg') // true
 * isImageFile('document.pdf') // false
 * isImageFile('image.HEIC') // true
 * isImageFile('image.avif') // true
 */
export function isImageFile(filename) {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'].includes(ext);
}

/**
 * Format a byte size into a human-readable string
 *
 * @param {number} bytes - The number of bytes to format
 * @param {number} [decimals=2] - Number of decimal places to show
 * @returns {string} Formatted size string (e.g., "1.5 MB")
 * @example
 * formatFileSize(0) // '0 Bytes'
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1536, 1) // '1.5 KB'
 * formatFileSize(5242880) // '5 MB'
 * formatFileSize(null) // 'Unknown'
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return 'Unknown';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
