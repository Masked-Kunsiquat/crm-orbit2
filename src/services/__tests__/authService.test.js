// Minimal unit tests for AuthService core logic

// Mock React Native before importing anything
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Expo LocalAuthentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../authService';

describe('AuthService Core Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    authService.isLocked = true;
    authService.lastUnlockTime = null;
  });

  describe('PIN Management', () => {
    test('setPIN stores PIN and enables PIN authentication', async () => {
      const pin = '1234';
      AsyncStorage.setItem.mockResolvedValue();

      await authService.setPIN(pin);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_pin', pin);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_pin_enabled', 'true');
    });

    test('setPIN rejects short PINs', async () => {
      await expect(authService.setPIN('123')).rejects.toThrow('PIN must be at least 4 digits');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('verifyPIN returns true for correct PIN', async () => {
      const pin = '1234';
      AsyncStorage.getItem.mockResolvedValue(pin);

      const result = await authService.verifyPIN(pin);

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_pin');
    });

    test('verifyPIN returns false for incorrect PIN', async () => {
      AsyncStorage.getItem.mockResolvedValue('1234');

      const result = await authService.verifyPIN('5678');

      expect(result).toBe(false);
    });

    test('hasPIN returns true when PIN is enabled and exists', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('true') // pin_enabled
        .mockResolvedValueOnce('1234'); // stored PIN

      const result = await authService.hasPIN();

      expect(result).toBe(true);
    });

    test('hasPIN returns false when PIN is disabled', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('false') // pin_enabled
        .mockResolvedValueOnce('1234'); // stored PIN

      const result = await authService.hasPIN();

      expect(result).toBe(false);
    });
  });

  describe('PIN Authentication', () => {
    test('authenticateWithPIN returns success for correct PIN', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('true') // hasPIN check
        .mockResolvedValueOnce('1234') // hasPIN check
        .mockResolvedValueOnce('1234'); // verifyPIN

      const result = await authService.authenticateWithPIN('1234');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('authenticateWithPIN returns error for incorrect PIN', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('true') // hasPIN check
        .mockResolvedValueOnce('1234') // hasPIN check
        .mockResolvedValueOnce('1234'); // verifyPIN

      const result = await authService.authenticateWithPIN('5678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid PIN');
    });

    test('authenticateWithPIN fails when no PIN configured', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('false') // pin_enabled
        .mockResolvedValueOnce(null); // stored PIN

      const result = await authService.authenticateWithPIN('1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No PIN configured');
    });
  });

  describe('Lock State Management', () => {
    test('lock state can be checked from storage', async () => {
      AsyncStorage.getItem.mockResolvedValue('false');
      // Create a fresh service instance to avoid property conflicts
      const freshService = { ...authService, isLocked: null };
      
      // Test the method directly with proper binding
      const result = await authService.constructor.prototype.isLocked.call(freshService);

      expect(result).toBe(false);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_is_locked');
    });

    test('lock state defaults to true when no stored state', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      // Create a fresh service instance to avoid property conflicts
      const freshService = { ...authService, isLocked: null };

      const result = await authService.constructor.prototype.isLocked.call(freshService);

      expect(result).toBe(true);
    });

    test('lock sets locked state and clears timers', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      authService.lockTimer = setTimeout(() => {}, 1000);

      const result = await authService.lock();

      expect(result).toBe(true);
      expect(authService.isLocked).toBe(true);
      expect(authService.lockTimer).toBe(null);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_is_locked', 'true');
    });

    test('onSuccessfulAuth unlocks and updates timestamps', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      const mockNow = 1640000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await authService.onSuccessfulAuth();

      expect(result).toBe(true);
      expect(authService.isLocked).toBe(false);
      expect(authService.lastUnlockTime).toBe(mockNow);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_is_locked', 'false');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_last_unlock_time', mockNow.toString());

      Date.now.mockRestore();
    });
  });

  describe('Auto-lock Settings', () => {
    test('enableAutoLock stores settings', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await authService.enableAutoLock(10);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_auto_lock_enabled', 'true');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_auto_lock_timeout', '10');
    });

    test('disableAutoLock stores setting and clears timer', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      authService.lockTimer = setTimeout(() => {}, 1000);

      const result = await authService.disableAutoLock();

      expect(result).toBe(true);
      expect(authService.lockTimer).toBe(null);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_auto_lock_enabled', 'false');
    });

    test('isAutoLockEnabled returns stored setting', async () => {
      AsyncStorage.getItem.mockResolvedValue('true');

      const result = await authService.isAutoLockEnabled();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_auto_lock_enabled');
    });

    test('getAutoLockTimeout returns stored value or default', async () => {
      AsyncStorage.getItem.mockResolvedValue('15');

      const result = await authService.getAutoLockTimeout();

      expect(result).toBe(15);

      // Test default when no value stored
      AsyncStorage.getItem.mockResolvedValue(null);
      const defaultResult = await authService.getAutoLockTimeout();
      expect(defaultResult).toBe(5);
    });
  });

  describe('Biometric Settings', () => {
    test('enableBiometric stores setting when biometric available', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      await authService.enableBiometric();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_biometric_enabled', 'true');
    });

    test('isBiometricEnabled returns stored setting', async () => {
      AsyncStorage.getItem.mockResolvedValue('true');

      const result = await authService.isBiometricEnabled();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_biometric_enabled');
    });

    test('disableBiometric stores setting', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await authService.disableBiometric();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_biometric_enabled', 'false');
    });
  });

  describe('Reset Functionality', () => {
    test('resetAuth clears all stored data', async () => {
      AsyncStorage.multiRemove.mockResolvedValue();
      authService.lockTimer = setTimeout(() => {}, 1000);
      authService.isLocked = false;

      const result = await authService.resetAuth();

      expect(result).toBe(true);
      expect(authService.isLocked).toBe(true);
      expect(authService.lastUnlockTime).toBe(null);
      expect(authService.lockTimer).toBe(null);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'auth_pin',
        'auth_biometric_enabled',
        'auth_auto_lock_enabled',
        'auth_auto_lock_timeout',
        'auth_last_unlock_time',
        'auth_is_locked',
        'auth_pin_enabled'
      ]);
    });
  });

  describe('Auto-lock Logic', () => {
    test('checkAutoLock locks app when timeout exceeded', async () => {
      const mockNow = 1640000000000;
      const lastUnlockTime = mockNow - (10 * 60 * 1000); // 10 minutes ago
      
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      AsyncStorage.getItem
        .mockResolvedValueOnce('true') // auto-lock enabled
        .mockResolvedValueOnce(lastUnlockTime.toString()) // last unlock time
        .mockResolvedValueOnce('5'); // timeout 5 minutes
      AsyncStorage.setItem.mockResolvedValue();

      await authService.checkAutoLock();

      // Should have called lock (which sets isLocked and stores state)
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_is_locked', 'true');

      Date.now.mockRestore();
    });

    test('checkAutoLock does nothing when within timeout', async () => {
      const mockNow = 1640000000000;
      const lastUnlockTime = mockNow - (2 * 60 * 1000); // 2 minutes ago
      
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      AsyncStorage.getItem
        .mockResolvedValueOnce('true') // auto-lock enabled
        .mockResolvedValueOnce(lastUnlockTime.toString()) // last unlock time
        .mockResolvedValueOnce('5'); // timeout 5 minutes

      await authService.checkAutoLock();

      // Should not have called lock
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('auth_is_locked', 'true');

      Date.now.mockRestore();
    });
  });

  describe('Event Listeners', () => {
    test('addListener returns removal function', () => {
      const callback = jest.fn();
      
      const removeListener = authService.addListener(callback);
      
      expect(typeof removeListener).toBe('function');
      expect(authService.listeners.has(callback)).toBe(true);
      
      removeListener();
      expect(authService.listeners.has(callback)).toBe(false);
    });

    test('notifyListeners calls all registered callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const event = { type: 'unlock' };
      
      authService.addListener(callback1);
      authService.addListener(callback2);
      
      authService.notifyListeners(event);
      
      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });
});