/**
 * Tests for permissionHelpers.js
 *
 * Tests the centralized permission request utilities that handle
 * permission requests with consistent error messaging and logging.
 */

import { requestPermission, checkPermission } from '../permissionHelpers';
import { showAlert } from '../../errors/utils/errorHandler';
import { logger } from '../../errors';

// Mock dependencies
jest.mock('../../errors/utils/errorHandler', () => ({
  showAlert: {
    error: jest.fn()
  }
}));

jest.mock('../../errors', () => ({
  logger: {
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('permissionHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================================================================
  // requestPermission() Tests
  // ===================================================================

  describe('requestPermission', () => {
    describe('granted status', () => {
      it('should return true when permission is granted', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await requestPermission(mockRequestFn, 'Media library');

        expect(result).toBe(true);
        expect(mockRequestFn).toHaveBeenCalledTimes(1);
      });

      it('should log success when permission is granted', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'granted' });
        await requestPermission(mockRequestFn, 'Contacts');

        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'requestPermission',
          {
            permissionName: 'Contacts',
            status: 'granted',
            granted: true
          }
        );
      });

      it('should not show alert when permission is granted', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'granted' });
        await requestPermission(mockRequestFn, 'Camera');

        expect(showAlert.error).not.toHaveBeenCalled();
      });
    });

    describe('denied status', () => {
      it('should return false when permission is denied', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        const result = await requestPermission(mockRequestFn, 'Location');

        expect(result).toBe(false);
      });

      it('should show default error message when denied without custom message', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await requestPermission(mockRequestFn, 'Notifications');

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Notifications permission is required to use this feature.'
        );
      });

      it('should show custom error message when provided', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        const customMessage = 'We need camera access to take profile photos.';

        await requestPermission(mockRequestFn, 'Camera', customMessage);

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          customMessage
        );
      });

      it('should log warning when permission is denied', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await requestPermission(mockRequestFn, 'Microphone');

        expect(logger.warn).toHaveBeenCalledWith(
          'PermissionHelpers',
          'requestPermission',
          {
            permissionName: 'Microphone',
            status: 'denied',
            granted: false
          }
        );
      });
    });

    describe('undetermined status', () => {
      it('should return false when status is undetermined', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'undetermined' });
        const result = await requestPermission(mockRequestFn, 'Calendar');

        expect(result).toBe(false);
      });

      it('should show error alert when status is undetermined', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'undetermined' });
        await requestPermission(mockRequestFn, 'Calendar');

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Calendar permission is required to use this feature.'
        );
      });

      it('should log warning when status is undetermined', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'undetermined' });
        await requestPermission(mockRequestFn, 'Reminders');

        expect(logger.warn).toHaveBeenCalledWith(
          'PermissionHelpers',
          'requestPermission',
          {
            permissionName: 'Reminders',
            status: 'undetermined',
            granted: false
          }
        );
      });
    });

    describe('restricted status (iOS)', () => {
      it('should return false when status is restricted', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'restricted' });
        const result = await requestPermission(mockRequestFn, 'Photos');

        expect(result).toBe(false);
      });

      it('should show error alert when status is restricted', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'restricted' });
        await requestPermission(mockRequestFn, 'Photos');

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Photos permission is required to use this feature.'
        );
      });
    });

    describe('error handling', () => {
      it('should return false when requestFn throws error', async () => {
        const mockRequestFn = jest.fn().mockRejectedValue(new Error('Permission system error'));
        const result = await requestPermission(mockRequestFn, 'Media library');

        expect(result).toBe(false);
      });

      it('should log error when requestFn throws', async () => {
        const mockError = new Error('System error');
        const mockRequestFn = jest.fn().mockRejectedValue(mockError);
        await requestPermission(mockRequestFn, 'Camera');

        expect(logger.error).toHaveBeenCalledWith(
          'PermissionHelpers',
          'requestPermission',
          mockError,
          { permissionName: 'Camera' }
        );
      });

      it('should show error alert when requestFn throws', async () => {
        const mockRequestFn = jest.fn().mockRejectedValue(new Error('Network error'));
        await requestPermission(mockRequestFn, 'Contacts');

        expect(showAlert.error).toHaveBeenCalledWith(
          'Error',
          'Failed to request Contacts permission.'
        );
      });

      it('should handle error with null response', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue(null);
        const result = await requestPermission(mockRequestFn, 'Location');

        // Accessing status on null will throw TypeError
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty permission name', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await requestPermission(mockRequestFn, '');

        expect(result).toBe(true);
        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'requestPermission',
          expect.objectContaining({
            permissionName: '',
            granted: true
          })
        );
      });

      it('should handle undefined custom message', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await requestPermission(mockRequestFn, 'Media library', undefined);

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Media library permission is required to use this feature.'
        );
      });

      it('should handle null custom message', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await requestPermission(mockRequestFn, 'Calendar', null);

        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Calendar permission is required to use this feature.'
        );
      });

      it('should handle empty string custom message', async () => {
        const mockRequestFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await requestPermission(mockRequestFn, 'Notifications', '');

        // Empty string is falsy, so should use default message
        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'Notifications permission is required to use this feature.'
        );
      });
    });

    describe('integration scenarios', () => {
      it('should handle typical ImagePicker flow', async () => {
        const mockImagePickerRequest = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await requestPermission(
          mockImagePickerRequest,
          'Media library',
          'Media library permission is required to select a photo.'
        );

        expect(result).toBe(true);
        expect(mockImagePickerRequest).toHaveBeenCalledTimes(1);
        expect(logger.success).toHaveBeenCalled();
      });

      it('should handle typical Contacts flow with denial', async () => {
        const mockContactsRequest = jest.fn().mockResolvedValue({ status: 'denied' });
        const result = await requestPermission(
          mockContactsRequest,
          'Contacts',
          'We need access to your contacts to import them.'
        );

        expect(result).toBe(false);
        expect(showAlert.error).toHaveBeenCalledWith(
          'Permission required',
          'We need access to your contacts to import them.'
        );
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should handle typical Location flow with system error', async () => {
        const mockLocationRequest = jest.fn().mockRejectedValue(
          new Error('Location services disabled')
        );
        const result = await requestPermission(
          mockLocationRequest,
          'Location'
        );

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
        expect(showAlert.error).toHaveBeenCalledWith(
          'Error',
          'Failed to request Location permission.'
        );
      });
    });
  });

  // ===================================================================
  // checkPermission() Tests
  // ===================================================================

  describe('checkPermission', () => {
    describe('granted status', () => {
      it('should return true when permission is already granted', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await checkPermission(mockCheckFn, 'Contacts');

        expect(result).toBe(true);
        expect(mockCheckFn).toHaveBeenCalledTimes(1);
      });

      it('should log success with granted true when permission is granted', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'granted' });
        await checkPermission(mockCheckFn, 'Camera');

        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Camera',
            status: 'granted',
            granted: true
          }
        );
      });
    });

    describe('denied status', () => {
      it('should return false when permission is denied', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
        const result = await checkPermission(mockCheckFn, 'Notifications');

        expect(result).toBe(false);
      });

      it('should log success with granted false when permission is denied', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await checkPermission(mockCheckFn, 'Location');

        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Location',
            status: 'denied',
            granted: false
          }
        );
      });

      it('should not show alert when permission is denied', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await checkPermission(mockCheckFn, 'Media library');

        // checkPermission does not show alerts, only logs
        expect(showAlert.error).not.toHaveBeenCalled();
      });
    });

    describe('undetermined status', () => {
      it('should return false when status is undetermined', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'undetermined' });
        const result = await checkPermission(mockCheckFn, 'Calendar');

        expect(result).toBe(false);
      });

      it('should log success with granted false when status is undetermined', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'undetermined' });
        await checkPermission(mockCheckFn, 'Reminders');

        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Reminders',
            status: 'undetermined',
            granted: false
          }
        );
      });
    });

    describe('restricted status (iOS)', () => {
      it('should return false when status is restricted', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'restricted' });
        const result = await checkPermission(mockCheckFn, 'Photos');

        expect(result).toBe(false);
      });

      it('should log success with granted false when status is restricted', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'restricted' });
        await checkPermission(mockCheckFn, 'Photos');

        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Photos',
            status: 'restricted',
            granted: false
          }
        );
      });
    });

    describe('error handling', () => {
      it('should return false when checkFn throws error', async () => {
        const mockCheckFn = jest.fn().mockRejectedValue(new Error('System error'));
        const result = await checkPermission(mockCheckFn, 'Camera');

        expect(result).toBe(false);
      });

      it('should log error when checkFn throws', async () => {
        const mockError = new Error('Permission check failed');
        const mockCheckFn = jest.fn().mockRejectedValue(mockError);
        await checkPermission(mockCheckFn, 'Contacts');

        expect(logger.error).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          mockError,
          { permissionName: 'Contacts' }
        );
      });

      it('should not show alert when checkFn throws', async () => {
        const mockCheckFn = jest.fn().mockRejectedValue(new Error('Error'));
        await checkPermission(mockCheckFn, 'Location');

        // checkPermission only logs errors, does not show alerts
        expect(showAlert.error).not.toHaveBeenCalled();
      });

      it('should handle error with null response', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue(null);
        const result = await checkPermission(mockCheckFn, 'Media library');

        // Accessing status on null will throw TypeError
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });

      it('should handle error with undefined response', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue(undefined);
        const result = await checkPermission(mockCheckFn, 'Notifications');

        // Accessing status on undefined will throw TypeError
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty permission name', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await checkPermission(mockCheckFn, '');

        expect(result).toBe(true);
        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          expect.objectContaining({
            permissionName: '',
            granted: true
          })
        );
      });

      it('should handle special characters in permission name', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await checkPermission(mockCheckFn, 'Media & Storage');

        expect(result).toBe(true);
        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          expect.objectContaining({
            permissionName: 'Media & Storage'
          })
        );
      });
    });

    describe('integration scenarios', () => {
      it('should handle typical Contacts.getPermissionsAsync flow', async () => {
        const mockContactsCheck = jest.fn().mockResolvedValue({ status: 'granted' });
        const result = await checkPermission(mockContactsCheck, 'Contacts');

        expect(result).toBe(true);
        expect(mockContactsCheck).toHaveBeenCalledTimes(1);
        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Contacts',
            status: 'granted',
            granted: true
          }
        );
      });

      it('should handle typical Camera.getCameraPermissionsAsync flow with denial', async () => {
        const mockCameraCheck = jest.fn().mockResolvedValue({ status: 'denied' });
        const result = await checkPermission(mockCameraCheck, 'Camera');

        expect(result).toBe(false);
        expect(logger.success).toHaveBeenCalledWith(
          'PermissionHelpers',
          'checkPermission',
          {
            permissionName: 'Camera',
            status: 'denied',
            granted: false
          }
        );
        expect(showAlert.error).not.toHaveBeenCalled();
      });

      it('should handle typical Location.getForegroundPermissionsAsync flow with error', async () => {
        const mockLocationCheck = jest.fn().mockRejectedValue(
          new Error('Location services unavailable')
        );
        const result = await checkPermission(mockLocationCheck, 'Location');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
        expect(showAlert.error).not.toHaveBeenCalled();
      });
    });

    describe('comparison with requestPermission', () => {
      it('should not show alerts unlike requestPermission', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await checkPermission(mockCheckFn, 'Camera');

        // checkPermission is silent (no alerts)
        expect(showAlert.error).not.toHaveBeenCalled();
      });

      it('should log success instead of warn on denied unlike requestPermission', async () => {
        const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
        await checkPermission(mockCheckFn, 'Media library');

        // checkPermission logs success with granted: false, not warn
        expect(logger.success).toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should not throw on error unlike some permission APIs', async () => {
        const mockCheckFn = jest.fn().mockRejectedValue(new Error('Error'));

        // Should not throw, just return false
        await expect(checkPermission(mockCheckFn, 'Contacts')).resolves.toBe(false);
      });
    });
  });

  // ===================================================================
  // Combined Workflow Tests
  // ===================================================================

  describe('combined workflows', () => {
    it('should work in check-then-request pattern', async () => {
      // First check if permission already granted
      const mockCheckFn = jest.fn().mockResolvedValue({ status: 'denied' });
      const hasPermission = await checkPermission(mockCheckFn, 'Camera');

      expect(hasPermission).toBe(false);

      // If not, request it
      const mockRequestFn = jest.fn().mockResolvedValue({ status: 'granted' });
      const granted = await requestPermission(mockRequestFn, 'Camera');

      expect(granted).toBe(true);
      expect(mockCheckFn).toHaveBeenCalledTimes(1);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should skip request if check shows already granted', async () => {
      // First check if permission already granted
      const mockCheckFn = jest.fn().mockResolvedValue({ status: 'granted' });
      const hasPermission = await checkPermission(mockCheckFn, 'Contacts');

      expect(hasPermission).toBe(true);

      // Should not need to request since already granted
      // This simulates the typical usage pattern
      expect(mockCheckFn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple permission checks in parallel', async () => {
      const mockCameraCheck = jest.fn().mockResolvedValue({ status: 'granted' });
      const mockContactsCheck = jest.fn().mockResolvedValue({ status: 'denied' });
      const mockLocationCheck = jest.fn().mockResolvedValue({ status: 'granted' });

      const [camera, contacts, location] = await Promise.all([
        checkPermission(mockCameraCheck, 'Camera'),
        checkPermission(mockContactsCheck, 'Contacts'),
        checkPermission(mockLocationCheck, 'Location')
      ]);

      expect(camera).toBe(true);
      expect(contacts).toBe(false);
      expect(location).toBe(true);
    });
  });
});
