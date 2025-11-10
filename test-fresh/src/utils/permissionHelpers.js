/**
 * Permission Request Helper Utilities
 *
 * Centralized utilities for handling permission requests with consistent
 * error messaging and user feedback.
 */

import { showAlert } from '../errors/utils/errorHandler';
import { logger } from '../errors';

/**
 * Request a permission and show user-friendly error if denied
 *
 * Handles the common pattern of requesting a permission, checking the status,
 * and showing an alert if the permission was not granted.
 *
 * @param {Function} requestFn - Async function that returns { status } (e.g., ImagePicker.requestMediaLibraryPermissionsAsync)
 * @param {string} permissionName - Human-readable name of the permission (e.g., 'Media library')
 * @param {string} [customMessage] - Optional custom message to show if permission denied
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 * @example
 * const granted = await requestPermission(
 *   ImagePicker.requestMediaLibraryPermissionsAsync,
 *   'Media library',
 *   'Media library permission is required to select a photo.'
 * );
 * if (!granted) return;
 */
export async function requestPermission(requestFn, permissionName, customMessage) {
  try {
    const { status } = await requestFn();

    if (status !== 'granted') {
      const message = customMessage || `${permissionName} permission is required to use this feature.`;
      showAlert.error('Permission required', message);
      logger.warn('PermissionHelpers', 'requestPermission', {
        permissionName,
        status,
        granted: false
      });
      return false;
    }

    logger.success('PermissionHelpers', 'requestPermission', {
      permissionName,
      status,
      granted: true
    });
    return true;
  } catch (error) {
    logger.error('PermissionHelpers', 'requestPermission', error, { permissionName });
    showAlert.error('Error', `Failed to request ${permissionName} permission.`);
    return false;
  }
}

/**
 * Check if a permission is already granted without requesting
 *
 * @param {Function} checkFn - Async function that returns { status } (e.g., Contacts.getPermissionsAsync)
 * @param {string} permissionName - Human-readable name of the permission
 * @returns {Promise<boolean>} True if permission already granted, false otherwise
 * @example
 * const hasPermission = await checkPermission(
 *   Contacts.getPermissionsAsync,
 *   'Contacts'
 * );
 */
export async function checkPermission(checkFn, permissionName) {
  try {
    const { status } = await checkFn();
    const granted = status === 'granted';

    logger.success('PermissionHelpers', 'checkPermission', {
      permissionName,
      status,
      granted
    });

    return granted;
  } catch (error) {
    logger.error('PermissionHelpers', 'checkPermission', error, { permissionName });
    return false;
  }
}
