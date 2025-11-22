/**
 * Error Handler Unit Tests
 *
 * Comprehensive tests for error handling utilities
 * Tests cover: getUserFriendlyError(), handleError(), withUIErrorHandling(),
 * showAlert helpers (error, success, info, confirm, confirmDelete)
 */

import { Alert } from 'react-native';
import {
  getUserFriendlyError,
  handleError,
  withUIErrorHandling,
  showAlert,
} from '../errorHandler';
import { logger } from '../errorLogger';
import { DatabaseError } from '../../database/DatabaseError';
import { ServiceError } from '../../services/ServiceError';
import { ValidationError } from '../../ui/ValidationError';
import { UIError } from '../../ui/UIError';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../errorLogger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ============================================================================
  // getUserFriendlyError()
  // ============================================================================

  describe('getUserFriendlyError', () => {
    it('should return validation error message', () => {
      const error = new ValidationError('name', 'Name is required');
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Validation Error',
        message: 'Name is required',
      });
    });

    it('should return not found message for DatabaseError.isNotFoundError', () => {
      const error = new DatabaseError('Record not found', 'RECORD_NOT_FOUND');
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Not Found',
        message: 'The requested item could not be found.',
      });
    });

    it('should return constraint error message for DatabaseError.isConstraintError', () => {
      const error = new DatabaseError(
        'Foreign key violation',
        'FOREIGN_KEY_VIOLATION'
      );
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Invalid Operation',
        message:
          'This operation violates data constraints. Please check your input.',
      });
    });

    it('should return generic database error for other DatabaseErrors', () => {
      const error = new DatabaseError('Query failed', 'QUERY_ERROR');
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Database Error',
        message: 'A database error occurred. Please try again.',
      });
    });

    it('should use getUserMessage for ServiceError', () => {
      const error = new ServiceError(
        'AuthService',
        'login',
        new Error('Invalid credentials'),
        'AUTH_FAILED'
      );
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Operation Failed',
        message: expect.any(String),
      });
    });

    it('should return error message for UIError', () => {
      const error = new UIError('TestComponent', 'Component render failed');
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Error',
        message: 'Component render failed',
      });
    });

    it('should return generic error for unknown error types', () => {
      const error = new Error('Unknown error');
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Error',
        message: 'Unknown error',
      });
    });

    it('should handle error without message', () => {
      const error = new Error();
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    });

    it('should handle null/undefined error', () => {
      const result = getUserFriendlyError(null);

      expect(result).toEqual({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    });

    it('should handle plain object error', () => {
      const error = { message: 'Custom error object' };
      const result = getUserFriendlyError(error);

      expect(result).toEqual({
        title: 'Error',
        message: 'Custom error object',
      });
    });

    it('should handle string error', () => {
      const result = getUserFriendlyError('Simple error string');

      expect(result).toEqual({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    });
  });

  // ============================================================================
  // handleError()
  // ============================================================================

  describe('handleError', () => {
    it('should log error with component and operation', () => {
      const error = new Error('Test error');
      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        showAlert: false,
      });

      expect(logger.error).toHaveBeenCalledWith(
        'TestComponent',
        'testOperation',
        error,
        {}
      );
    });

    it('should use default component and operation if not provided', () => {
      const error = new Error('Test error');
      handleError(error, { showAlert: false });

      expect(logger.error).toHaveBeenCalledWith(
        'Unknown',
        'operation',
        error,
        {}
      );
    });

    it('should show alert by default', () => {
      const error = new Error('Test error');
      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Test error', [
        { text: 'OK' },
      ]);
    });

    it('should not show alert when showAlert is false', () => {
      const error = new Error('Test error');
      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        showAlert: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should call custom onError handler', () => {
      const error = new Error('Test error');
      const onError = jest.fn();

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        showAlert: false,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should include context in log', () => {
      const error = new Error('Test error');
      const context = { userId: 123, action: 'create' };

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        showAlert: false,
        context,
      });

      expect(logger.error).toHaveBeenCalledWith(
        'TestComponent',
        'testOperation',
        error,
        context
      );
    });

    it('should use customTitle if provided in context', () => {
      const error = new Error('Test error');

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        context: {
          customTitle: 'Custom Title',
        },
      });

      expect(Alert.alert).toHaveBeenCalledWith('Custom Title', 'Test error', [
        { text: 'OK' },
      ]);
    });

    it('should use customMessage if provided in context', () => {
      const error = new Error('Test error');

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        context: {
          customMessage: 'Custom message for user',
        },
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Custom message for user',
        [{ text: 'OK' }]
      );
    });

    it('should use both customTitle and customMessage', () => {
      const error = new Error('Test error');

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
        context: {
          customTitle: 'Custom Title',
          customMessage: 'Custom Message',
        },
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Custom Title',
        'Custom Message',
        [{ text: 'OK' }]
      );
    });

    it('should show user-friendly message for DatabaseError', () => {
      const error = new DatabaseError('Record not found', 'RECORD_NOT_FOUND');

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Not Found',
        'The requested item could not be found.',
        [{ text: 'OK' }]
      );
    });

    it('should show validation error message', () => {
      const error = new ValidationError('email', 'Email is invalid');

      handleError(error, {
        component: 'TestComponent',
        operation: 'testOperation',
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Email is invalid',
        [{ text: 'OK' }]
      );
    });
  });

  // ============================================================================
  // withUIErrorHandling()
  // ============================================================================

  describe('withUIErrorHandling', () => {
    it('should wrap async function and return result on success', async () => {
      const mockFn = jest.fn(async x => x * 2);
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      const result = await wrapped(5);

      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should catch errors and call handleError', async () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw mockError;
      });
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      await wrapped();

      expect(logger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Test error', [
        { text: 'OK' },
      ]);
    });

    it('should pass additional options to handleError', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp', {
        showAlert: false,
      });

      await wrapped();

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should rethrow ValidationError after handling', async () => {
      const validationError = new ValidationError('email', 'Email is required');
      const mockFn = jest.fn(async () => {
        throw validationError;
      });
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      await expect(wrapped()).rejects.toThrow(ValidationError);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should not rethrow non-ValidationError', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      await wrapped();

      // Should not throw, error is handled
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should pass arguments to wrapped function', async () => {
      const mockFn = jest.fn(async (a, b, c) => a + b + c);
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      const result = await wrapped(1, 2, 3);

      expect(result).toBe(6);
      expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should handle synchronous errors', async () => {
      const mockFn = jest.fn(() => {
        throw new Error('Sync error');
      });
      const wrapped = withUIErrorHandling(mockFn, 'TestComponent', 'testOp');

      await wrapped();

      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // showAlert.error()
  // ============================================================================

  describe('showAlert.error', () => {
    it('should show error alert with default title', () => {
      showAlert.error('Something went wrong');

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong');
    });

    it('should show error alert with custom title', () => {
      showAlert.error('Something went wrong', 'Custom Error');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Custom Error',
        'Something went wrong'
      );
    });

    it('should handle empty message', () => {
      showAlert.error('');

      expect(Alert.alert).toHaveBeenCalledWith('Error', '');
    });
  });

  // ============================================================================
  // showAlert.success()
  // ============================================================================

  describe('showAlert.success', () => {
    it('should show success alert with default title', () => {
      showAlert.success('Operation completed');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Operation completed'
      );
    });

    it('should show success alert with custom title', () => {
      showAlert.success('Operation completed', 'Great!');

      expect(Alert.alert).toHaveBeenCalledWith('Great!', 'Operation completed');
    });
  });

  // ============================================================================
  // showAlert.info()
  // ============================================================================

  describe('showAlert.info', () => {
    it('should show info alert with default title', () => {
      showAlert.info('Here is some information');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Info',
        'Here is some information'
      );
    });

    it('should show info alert with custom title', () => {
      showAlert.info('Here is some information', 'Notice');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Notice',
        'Here is some information'
      );
    });
  });

  // ============================================================================
  // showAlert.confirm()
  // ============================================================================

  describe('showAlert.confirm', () => {
    it('should show confirm dialog with OK and Cancel buttons', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      showAlert.confirm('Confirm Action', 'Are you sure?', onConfirm, onCancel);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Action',
        'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'OK', onPress: onConfirm },
        ]
      );
    });

    it('should handle confirm without cancel callback', () => {
      const onConfirm = jest.fn();

      showAlert.confirm('Confirm Action', 'Are you sure?', onConfirm);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Action',
        'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel', onPress: null },
          { text: 'OK', onPress: onConfirm },
        ]
      );
    });

    it('should call onConfirm when OK is pressed', () => {
      const onConfirm = jest.fn();

      showAlert.confirm('Confirm', 'Message', onConfirm);

      // Get the buttons array from the mock call
      const buttons = Alert.alert.mock.calls[0][2];
      const okButton = buttons.find(btn => btn.text === 'OK');

      // Simulate pressing OK
      okButton.onPress();

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when Cancel is pressed', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      showAlert.confirm('Confirm', 'Message', onConfirm, onCancel);

      // Get the buttons array from the mock call
      const buttons = Alert.alert.mock.calls[0][2];
      const cancelButton = buttons.find(btn => btn.text === 'Cancel');

      // Simulate pressing Cancel
      cancelButton.onPress();

      expect(onCancel).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // showAlert.confirmDelete()
  // ============================================================================

  describe('showAlert.confirmDelete', () => {
    it('should show confirm delete dialog with destructive style', () => {
      const onConfirm = jest.fn();

      showAlert.confirmDelete(
        'Delete Item',
        'This cannot be undone',
        onConfirm
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Item',
        'This cannot be undone',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onConfirm },
        ]
      );
    });

    it('should call onConfirm when Delete is pressed', () => {
      const onConfirm = jest.fn();

      showAlert.confirmDelete('Delete', 'Are you sure?', onConfirm);

      // Get the buttons array from the mock call
      const buttons = Alert.alert.mock.calls[0][2];
      const deleteButton = buttons.find(btn => btn.text === 'Delete');

      // Simulate pressing Delete
      deleteButton.onPress();

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should not call onConfirm when Cancel is pressed', () => {
      const onConfirm = jest.fn();

      showAlert.confirmDelete('Delete', 'Are you sure?', onConfirm);

      // Cancel button has no onPress, should not throw
      const buttons = Alert.alert.mock.calls[0][2];
      const cancelButton = buttons.find(btn => btn.text === 'Cancel');

      expect(cancelButton.onPress).toBeUndefined();
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should have destructive style on Delete button', () => {
      const onConfirm = jest.fn();

      showAlert.confirmDelete('Delete', 'Confirm', onConfirm);

      const buttons = Alert.alert.mock.calls[0][2];
      const deleteButton = buttons.find(btn => btn.text === 'Delete');

      expect(deleteButton.style).toBe('destructive');
    });

    it('should have cancel style on Cancel button', () => {
      const onConfirm = jest.fn();

      showAlert.confirmDelete('Delete', 'Confirm', onConfirm);

      const buttons = Alert.alert.mock.calls[0][2];
      const cancelButton = buttons.find(btn => btn.text === 'Cancel');

      expect(cancelButton.style).toBe('cancel');
    });
  });
});
