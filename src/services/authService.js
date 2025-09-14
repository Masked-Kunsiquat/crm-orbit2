// Authentication service for biometric and PIN-based app security
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { MIN_PIN_LENGTH, MAX_PIN_LENGTH } from '../constants/auth';

const AUTH_STORAGE_KEYS = {
  PIN: 'auth_pin',
  BIOMETRIC_ENABLED: 'auth_biometric_enabled',
  AUTO_LOCK_ENABLED: 'auth_auto_lock_enabled',
  AUTO_LOCK_TIMEOUT: 'auth_auto_lock_timeout',
  LAST_UNLOCK_TIME: 'auth_last_unlock_time',
  IS_LOCKED: 'auth_is_locked',
  PIN_ENABLED: 'auth_pin_enabled',
  FAILED_ATTEMPTS: 'auth_failed_attempts',
  LOCKOUT_UNTIL: 'auth_lockout_until'
};

// Brute-force protection configuration
const LOCKOUT_CONFIG = {
  MAX_ATTEMPTS_TIER_1: 3,  // 3 attempts -> 30s lockout
  MAX_ATTEMPTS_TIER_2: 5,  // 5 attempts -> 5m lockout
  MAX_ATTEMPTS_TIER_3: 10, // 10 attempts -> 30m lockout
  LOCKOUT_DURATION_1: 30 * 1000,      // 30 seconds
  LOCKOUT_DURATION_2: 5 * 60 * 1000,  // 5 minutes
  LOCKOUT_DURATION_3: 30 * 60 * 1000  // 30 minutes
};

// Biometric error taxonomy
const BIOMETRIC_ERROR_CODES = {
  USER_CANCELLED: 'user_cancelled',
  USER_FALLBACK: 'user_fallback',
  SYSTEM_CANCELLED: 'system_cancelled',
  LOCKOUT: 'biometric_lockout',
  LOCKOUT_PERMANENT: 'biometric_lockout_permanent',
  NOT_AVAILABLE: 'biometric_not_available',
  NOT_ENROLLED: 'biometric_not_enrolled',
  UNKNOWN: 'biometric_unknown_error'
};

class AuthService {
  constructor() {
    this.listeners = new Set();
    this.lockTimer = null;
    this.lastUnlockTime = null;
    this.isLocked = true;
    this.failedAttempts = 0;
    this.lockoutUntil = null;
    // Guard for concurrent auto-lock timer starts
    this._autoLockStartToken = 0;
  }

  // Brute-force protection methods
  async checkLockoutStatus() {
    try {
      const lockoutUntil = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL);
      if (lockoutUntil) {
        const lockoutTime = parseInt(lockoutUntil, 10);
        const now = Date.now();

        if (now < lockoutTime) {
          return {
            isLockedOut: true,
            remainingTime: lockoutTime - now
          };
        } else {
          // Lockout expired, clear it
          await this.clearLockout();
        }
      }

      return { isLockedOut: false, remainingTime: 0 };
    } catch (error) {
      console.error('Error checking lockout status:', error);
      return { isLockedOut: false, remainingTime: 0 };
    }
  }

  async incrementFailedAttempts() {
    try {
      const attemptsStr = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      const newAttempts = attempts + 1;

      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, newAttempts.toString());
      this.failedAttempts = newAttempts;

      // Check if lockout should be applied
      let lockoutDuration = 0;
      if (newAttempts >= LOCKOUT_CONFIG.MAX_ATTEMPTS_TIER_3) {
        lockoutDuration = LOCKOUT_CONFIG.LOCKOUT_DURATION_3;
      } else if (newAttempts >= LOCKOUT_CONFIG.MAX_ATTEMPTS_TIER_2) {
        lockoutDuration = LOCKOUT_CONFIG.LOCKOUT_DURATION_2;
      } else if (newAttempts >= LOCKOUT_CONFIG.MAX_ATTEMPTS_TIER_1) {
        lockoutDuration = LOCKOUT_CONFIG.LOCKOUT_DURATION_1;
      }

      if (lockoutDuration > 0) {
        const lockoutUntil = Date.now() + lockoutDuration;
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        this.lockoutUntil = lockoutUntil;

        return {
          isLockedOut: true,
          remainingTime: lockoutDuration,
          attempts: newAttempts
        };
      }

      return {
        isLockedOut: false,
        remainingTime: 0,
        attempts: newAttempts
      };
    } catch (error) {
      console.error('Error incrementing failed attempts:', error);
      return { isLockedOut: false, remainingTime: 0, attempts: 0 };
    }
  }

  async clearFailedAttempts() {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      this.failedAttempts = 0;
    } catch (error) {
      console.error('Error clearing failed attempts:', error);
    }
  }

  async clearLockout() {
    try {
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEYS.FAILED_ATTEMPTS,
        AUTH_STORAGE_KEYS.LOCKOUT_UNTIL
      ]);
      this.failedAttempts = 0;
      this.lockoutUntil = null;
    } catch (error) {
      console.error('Error clearing lockout:', error);
    }
  }

  mapBiometricError(error) {
    if (!error) return BIOMETRIC_ERROR_CODES.UNKNOWN;

    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('user_cancel') || errorMessage.includes('user cancel')) {
      return BIOMETRIC_ERROR_CODES.USER_CANCELLED;
    } else if (errorMessage.includes('user_fallback') || errorMessage.includes('fallback')) {
      return BIOMETRIC_ERROR_CODES.USER_FALLBACK;
    } else if (errorMessage.includes('system_cancel') || errorMessage.includes('system cancel')) {
      return BIOMETRIC_ERROR_CODES.SYSTEM_CANCELLED;
    } else if (errorMessage.includes('biometric_lockout') || errorMessage.includes('lockout')) {
      if (errorMessage.includes('permanent')) {
        return BIOMETRIC_ERROR_CODES.LOCKOUT_PERMANENT;
      }
      return BIOMETRIC_ERROR_CODES.LOCKOUT;
    } else if (errorMessage.includes('not_enrolled') || errorMessage.includes('not enrolled')) {
      return BIOMETRIC_ERROR_CODES.NOT_ENROLLED;
    } else if (errorMessage.includes('not_available') || errorMessage.includes('not available')) {
      return BIOMETRIC_ERROR_CODES.NOT_AVAILABLE;
    }

    return BIOMETRIC_ERROR_CODES.UNKNOWN;
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
      if (!pin || pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) {
        if (!pin || pin.length < MIN_PIN_LENGTH) {
          throw new Error(`PIN must be at least ${MIN_PIN_LENGTH} digits`);
        } else {
          throw new Error(`PIN must be at most ${MAX_PIN_LENGTH} digits`);
        }
      }
      
      // Basic strength checks to prevent weak PINs
      // 1) Disallow all-identical digits like 0000, 1111, 2222
      if (/^(\d)\1+$/.test(pin)) {
        throw new Error('PIN cannot contain all identical digits');
      }
      // 2) Disallow simple sequential patterns (ascending/descending)
      if (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(pin)) {
        throw new Error('PIN cannot be a sequential pattern');
      }
      
      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.PIN, pin);
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.PIN_ENABLED, 'true');
      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  }

  async verifyPIN(pin) {
    try {
      const storedPIN = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.PIN);
      return storedPIN === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  async hasPIN() {
    try {
      const pinEnabled = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.PIN_ENABLED);
      const storedPIN = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.PIN);
      return pinEnabled === 'true' && !!storedPIN;
    } catch (error) {
      console.error('Error checking PIN status:', error);
      return false;
    }
  }

  async removePIN() {
    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.PIN);
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

      return {
        ...result,
        errorCode: result.success ? undefined : this.mapBiometricError(result.error)
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      const mappedError = {
        ...error,
        errorCode: this.mapBiometricError(error)
      };
      throw mappedError;
    }
  }

  // PIN authentication
  async authenticateWithPIN(pin, options = {}) {
    try {
      // Check if user is locked out
      const lockoutStatus = await this.checkLockoutStatus();
      if (lockoutStatus.isLockedOut) {
        return {
          success: false,
          error: 'Too many failed attempts. Try again later.',
          errorCode: 'PIN_LOCKOUT',
          remainingTime: lockoutStatus.remainingTime
        };
      }

      if (!await this.hasPIN()) {
        throw new Error('No PIN configured');
      }

      const isValid = await this.verifyPIN(pin);

      if (isValid) {
        // Clear failed attempts on successful authentication
        await this.clearFailedAttempts();
        return {
          success: true
        };
      } else {
        // Increment failed attempts
        const lockoutResult = await this.incrementFailedAttempts();

        return {
          success: false,
          error: lockoutResult.isLockedOut
            ? `Too many failed attempts. Locked out for ${Math.ceil(lockoutResult.remainingTime / 60000)} minutes.`
            : 'Invalid PIN',
          errorCode: lockoutResult.isLockedOut ? 'PIN_LOCKOUT' : 'INVALID_PIN',
          attempts: lockoutResult.attempts,
          remainingTime: lockoutResult.remainingTime
        };
      }
    } catch (error) {
      console.error('PIN authentication error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'PIN_AUTH_ERROR'
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
      this.startAutoLockTimer().catch(error => {
        console.error('Error starting auto-lock timer after unlock:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error handling successful authentication:', error);
      return false;
    }
  }

  // Lock/unlock management
  async getLockState() {
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

  async checkIsLocked() {
    return this.getLockState();
  }

  // Auto-lock functionality
  async enableAutoLock(timeoutMinutes = 5) {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED, 'true');
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.AUTO_LOCK_TIMEOUT, timeoutMinutes.toString());
      await this.startAutoLockTimer();
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

  async startAutoLockTimer() {
    // Create a start token to ensure only the latest invocation schedules a timer
    const token = ++this._autoLockStartToken;
    this.clearAutoLockTimer();
    
    try {
      // Check if auto-lock is enabled first
      const autoLockEnabled = await this.isAutoLockEnabled();
      if (!autoLockEnabled) {
        return; // Auto-lock is disabled, don't start timer
      }

      const timeoutMinutes = await this.getAutoLockTimeout();
      // If a newer start was requested while awaiting, abort scheduling
      if (token !== this._autoLockStartToken) return;

      if (timeoutMinutes > 0) {
        const timeoutMs = timeoutMinutes * 60 * 1000;
        this.lockTimer = setTimeout(() => {
          // Only act if this timer belongs to the latest start
          if (token === this._autoLockStartToken) {
            this.lock();
          }
        }, timeoutMs);
      }
    } catch (error) {
      console.error('Error starting auto-lock timer:', error);
    }
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
          // Start timer for remaining time (guard against concurrent starts)
          const remainingTime = timeoutMs - timeSinceUnlock;
          const token = ++this._autoLockStartToken;
          this.clearAutoLockTimer();
          this.lockTimer = setTimeout(() => {
            if (token === this._autoLockStartToken) {
              this.lock();
            }
          }, remainingTime);
        }
      }

      // Initialize lock state
      this.isLocked = await this.checkIsLocked();
      
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
    Array.from(this.listeners).forEach(callback => {
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
        AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED,
        AUTH_STORAGE_KEYS.AUTO_LOCK_ENABLED,
        AUTH_STORAGE_KEYS.AUTO_LOCK_TIMEOUT,
        AUTH_STORAGE_KEYS.LAST_UNLOCK_TIME,
        AUTH_STORAGE_KEYS.IS_LOCKED,
        AUTH_STORAGE_KEYS.PIN_ENABLED,
        AUTH_STORAGE_KEYS.FAILED_ATTEMPTS,
        AUTH_STORAGE_KEYS.LOCKOUT_UNTIL
      ]);

      // Remove PIN from secure storage
      try {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.PIN);
      } catch (secureStoreError) {
        // Ignore errors if PIN doesn't exist in SecureStore
      }
      
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
      // App going to background - start/continue auto-lock timer if enabled
      this.startAutoLockTimer().catch(error => {
        console.error('Error starting auto-lock timer on app state change:', error);
      });
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
