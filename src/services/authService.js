// Authentication service for biometric and PIN-based app security
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const AUTH_STORAGE_KEYS = {
  PIN: 'auth_pin',
  BIOMETRIC_ENABLED: 'auth_biometric_enabled',
  AUTO_LOCK_ENABLED: 'auth_auto_lock_enabled',
  AUTO_LOCK_TIMEOUT: 'auth_auto_lock_timeout',
  LAST_UNLOCK_TIME: 'auth_last_unlock_time',
  IS_LOCKED: 'auth_is_locked',
  PIN_ENABLED: 'auth_pin_enabled'
};

class AuthService {
  constructor() {
    this.listeners = new Set();
    this.lockTimer = null;
    this.lastUnlockTime = null;
    this.isLocked = true;
  }

  // Authentication capabilities check
  async checkAuthenticationCapabilities() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        canUseBiometric: hasHardware && isEnrolled
      };
    } catch (error) {
      console.error('Error checking authentication capabilities:', error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        canUseBiometric: false
      };
    }
  }

  // PIN management
  async setPIN(pin) {
    try {
      if (!pin || pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.PIN, pin);
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.PIN_ENABLED, 'true');
      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  }

  async verifyPIN(pin) {
    try {
      const storedPIN = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.PIN);
      return storedPIN === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  async hasPIN() {
    try {
      const pinEnabled = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.PIN_ENABLED);
      const storedPIN = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.PIN);
      return pinEnabled === 'true' && !!storedPIN;
    } catch (error) {
      console.error('Error checking PIN status:', error);
      return false;
    }
  }

  async removePIN() {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.PIN);
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.PIN_ENABLED, 'false');
      return true;
    } catch (error) {
      console.error('Error removing PIN:', error);
      throw error;
    }
  }

  // Biometric authentication
  async authenticateWithBiometric(options = {}) {
    try {
      const capabilities = await this.checkAuthenticationCapabilities();
      
      if (!capabilities.canUseBiometric) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || 'Authenticate to unlock CRM',
        cancelLabel: options.cancelLabel || 'Use PIN',
        fallbackLabel: options.fallbackLabel || 'Use PIN',
        disableDeviceFallback: options.disableDeviceFallback || false,
        ...options
      });

      return result;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw error;
    }
  }

  // PIN authentication
  async authenticateWithPIN(pin, options = {}) {
    try {
      if (!await this.hasPIN()) {
        throw new Error('No PIN configured');
      }

      const isValid = await this.verifyPIN(pin);
      
      return {
        success: isValid,
        error: isValid ? undefined : 'Invalid PIN'
      };
    } catch (error) {
      console.error('PIN authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Combined authentication (biometric with PIN fallback)
  async authenticate(options = {}) {
    try {
      const capabilities = await this.checkAuthenticationCapabilities();
      const biometricEnabled = await this.isBiometricEnabled();
      const hasPinSetup = await this.hasPIN();

      // Try biometric first if available and enabled
      if (capabilities.canUseBiometric && biometricEnabled) {
        try {
          const biometricResult = await this.authenticateWithBiometric(options);
          
          if (biometricResult.success) {
            await this.onSuccessfulAuth();
            return { success: true, method: 'biometric' };
          }
        } catch (error) {
          // Fall back to PIN if biometric fails
          console.warn('Biometric authentication failed, falling back to PIN:', error);
        }
      }

      // If biometric failed or not available, require PIN
      if (!hasPinSetup) {
        throw new Error('No authentication method configured');
      }

      // Return indication that PIN is required
      return { success: false, method: 'pin_required', hasPIN: true };
      
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Authentication success handler
  async onSuccessfulAuth() {
    try {
      this.isLocked = false;
      this.lastUnlockTime = Date.now();
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.IS_LOCKED, 'false');
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.LAST_UNLOCK_TIME, this.lastUnlockTime.toString());
      
      this.notifyListeners({ type: 'unlock' });
      this.startAutoLockTimer();
      
      return true;
    } catch (error) {
      console.error('Error handling successful authentication:', error);
      return false;
    }
  }

  // Lock/unlock management
  async lock() {
    try {
      this.isLocked = true;
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.IS_LOCKED, 'true');
      this.clearAutoLockTimer();
      this.notifyListeners({ type: 'lock' });
      return true;
    } catch (error) {
      console.error('Error locking app:', error);
      return false;
    }
  }

  async unlock(method = 'manual') {
    return this.onSuccessfulAuth();
  }

  async isLocked() {
    try {
      // Check in-memory state first
      if (this.isLocked !== null) {
        return this.isLocked;
      }

      // Check stored state
      const storedState = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.IS_LOCKED);
      this.isLocked = storedState !== 'false'; // Default to locked
      
      return this.isLocked;
    } catch (error) {
      console.error('Error checking lock status:', error);
      return true; // Default to locked for security
    }
  }

  // Auto-lock functionality
  async enableAutoLock(timeoutMinutes = 5) {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED, 'true');
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.AUTO_LOCK_TIMEOUT, timeoutMinutes.toString());
      this.startAutoLockTimer();
      return true;
    } catch (error) {
      console.error('Error enabling auto-lock:', error);
      return false;
    }
  }

  async disableAutoLock() {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED, 'false');
      this.clearAutoLockTimer();
      return true;
    } catch (error) {
      console.error('Error disabling auto-lock:', error);
      return false;
    }
  }

  async isAutoLockEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking auto-lock status:', error);
      return false;
    }
  }

  async getAutoLockTimeout() {
    try {
      const timeout = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.AUTO_LOCK_TIMEOUT);
      return timeout ? parseInt(timeout, 10) : 5; // Default 5 minutes
    } catch (error) {
      console.error('Error getting auto-lock timeout:', error);
      return 5;
    }
  }

  startAutoLockTimer() {
    this.clearAutoLockTimer();
    
    this.getAutoLockTimeout().then(timeoutMinutes => {
      if (timeoutMinutes > 0) {
        this.lockTimer = setTimeout(() => {
          this.lock();
        }, timeoutMinutes * 60 * 1000);
      }
    });
  }

  clearAutoLockTimer() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  // Biometric settings
  async enableBiometric() {
    try {
      const capabilities = await this.checkAuthenticationCapabilities();
      if (!capabilities.canUseBiometric) {
        throw new Error('Biometric authentication not available');
      }
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      throw error;
    }
  }

  async disableBiometric() {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  }

  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  // Initialization and cleanup
  async initialize() {
    try {
      // Check if app should be locked on startup
      const autoLockEnabled = await this.isAutoLockEnabled();
      const lastUnlockTime = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.LAST_UNLOCK_TIME);
      const timeoutMinutes = await this.getAutoLockTimeout();
      
      if (autoLockEnabled && lastUnlockTime) {
        const timeSinceUnlock = Date.now() - parseInt(lastUnlockTime, 10);
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        if (timeSinceUnlock > timeoutMs) {
          await this.lock();
        } else {
          // Start timer for remaining time
          const remainingTime = timeoutMs - timeSinceUnlock;
          this.lockTimer = setTimeout(() => {
            this.lock();
          }, remainingTime);
        }
      }

      // Initialize lock state
      this.isLocked = await this.isLocked();
      
      return true;
    } catch (error) {
      console.error('Error initializing auth service:', error);
      return false;
    }
  }

  // Event listeners for UI updates
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  // Utility methods
  async resetAuth() {
    try {
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEYS.PIN,
        AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED,
        AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED,
        AUTH_STORAGE_KEYS.AUTO_LOCK_TIMEOUT,
        AUTH_STORAGE_KEYS.LAST_UNLOCK_TIME,
        AUTH_STORAGE_KEYS.IS_LOCKED,
        AUTH_STORAGE_KEYS.PIN_ENABLED
      ]);
      
      this.clearAutoLockTimer();
      this.isLocked = true;
      this.lastUnlockTime = null;
      
      return true;
    } catch (error) {
      console.error('Error resetting auth:', error);
      return false;
    }
  }

  // App state change handlers
  onAppStateChange(nextAppState) {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App going to background - start/continue auto-lock timer
      this.startAutoLockTimer();
    } else if (nextAppState === 'active') {
      // App coming to foreground - check if should be locked
      this.checkAutoLock();
    }
  }

  async checkAutoLock() {
    try {
      const autoLockEnabled = await this.isAutoLockEnabled();
      if (!autoLockEnabled) return;

      const lastUnlockTime = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.LAST_UNLOCK_TIME);
      const timeoutMinutes = await this.getAutoLockTimeout();
      
      if (lastUnlockTime) {
        const timeSinceUnlock = Date.now() - parseInt(lastUnlockTime, 10);
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        if (timeSinceUnlock > timeoutMs) {
          await this.lock();
        }
      }
    } catch (error) {
      console.error('Error checking auto-lock:', error);
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;