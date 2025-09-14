// AuthGate component - App-wide authentication wrapper with lock screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  AppState,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Layout, Button, Input, Text as KittenText, Card, Icon } from '@ui-kitten/components';
import authService from '../services/authService';

const { width, height } = Dimensions.get('window');

const AuthGate = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Initialize auth service and check lock status
  useEffect(() => {
    initializeAuth();
  }, []);

  // Handle app state changes for auto-lock
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      authService.onAppStateChange(nextAppState);
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Listen to auth service events
  useEffect(() => {
    const removeListener = authService.addListener(handleAuthEvent);
    return removeListener;
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service
      await authService.initialize();
      
      // Check current lock status
      const locked = await authService.isLocked();
      setIsLocked(locked);
      
      // Check biometric availability
      const capabilities = await authService.checkAuthenticationCapabilities();
      setBiometricAvailable(capabilities.canUseBiometric);
      
      // If unlocked and biometric available, try auto-authentication
      if (!locked && capabilities.canUseBiometric) {
        const biometricEnabled = await authService.isBiometricEnabled();
        if (biometricEnabled) {
          tryBiometricAuth();
        }
      }
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsLocked(true); // Default to locked for security
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthEvent = useCallback((event) => {
    if (event.type === 'lock') {
      setIsLocked(true);
      setPin('');
      setAuthError('');
      setShowPinInput(false);
    } else if (event.type === 'unlock') {
      setIsLocked(false);
      setPin('');
      setAuthError('');
      setShowPinInput(false);
    }
  }, []);

  const tryBiometricAuth = async () => {
    try {
      setAuthError('');
      const result = await authService.authenticate();
      
      if (result.success) {
        // Authentication successful
        return;
      }
      
      if (result.method === 'pin_required') {
        setShowPinInput(true);
      } else if (result.error) {
        setAuthError(result.error);
        setShowPinInput(true);
      }
      
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setAuthError('Authentication failed. Please try again.');
      setShowPinInput(true);
    }
  };

  const handlePinSubmit = async () => {
    if (!pin || pin.length < 4) {
      setAuthError('Please enter your PIN');
      return;
    }

    try {
      setAuthError('');
      const result = await authService.authenticateWithPIN(pin);
      
      if (result.success) {
        await authService.unlock('pin');
      } else {
        setAuthError(result.error || 'Invalid PIN');
        setPin('');
      }
    } catch (error) {
      console.error('PIN authentication error:', error);
      setAuthError('Authentication failed. Please try again.');
      setPin('');
    }
  };

  const handleBiometricPress = () => {
    tryBiometricAuth();
  };

  const handleManualLock = () => {
    authService.lock();
  };

  // PIN input component
  const renderPinInput = () => (
    <View style={styles.pinContainer}>
      <KittenText category="h5" style={styles.pinTitle}>
        Enter PIN
      </KittenText>
      
      <Input
        style={styles.pinInput}
        placeholder="Enter your PIN"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="numeric"
        maxLength={6}
        onSubmitEditing={handlePinSubmit}
        autoFocus
        textAlign="center"
      />
      
      {authError ? (
        <KittenText status="danger" style={styles.errorText}>
          {authError}
        </KittenText>
      ) : null}
      
      <Button
        style={styles.unlockButton}
        onPress={handlePinSubmit}
        disabled={!pin || pin.length < 4}
      >
        Unlock
      </Button>
    </View>
  );

  // Biometric prompt component
  const renderBiometricPrompt = () => (
    <View style={styles.biometricContainer}>
      <Icon
        name="lock-outline"
        style={styles.lockIcon}
        fill="#8F9BB3"
      />
      
      <KittenText category="h4" style={styles.lockTitle}>
        App Locked
      </KittenText>
      
      <KittenText category="p1" style={styles.lockSubtitle}>
        Authenticate to unlock CRM
      </KittenText>
      
      {biometricAvailable && (
        <Button
          style={styles.biometricButton}
          appearance="outline"
          onPress={handleBiometricPress}
          accessoryLeft={(props) => <Icon {...props} name="fingerprint-outline" />}
        >
          Use Biometric
        </Button>
      )}
      
      <Button
        style={styles.pinButton}
        appearance="ghost"
        onPress={() => setShowPinInput(true)}
      >
        Use PIN
      </Button>
      
      {authError ? (
        <KittenText status="danger" style={styles.errorText}>
          {authError}
        </KittenText>
      ) : null}
    </View>
  );

  // Loading screen
  const renderLoading = () => (
    <Layout style={styles.loadingContainer}>
      <KittenText category="h6">Loading...</KittenText>
    </Layout>
  );

  // Lock screen
  const renderLockScreen = () => (
    <Layout style={styles.lockScreen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Card style={styles.authCard}>
          {showPinInput ? renderPinInput() : renderBiometricPrompt()}
        </Card>
      </KeyboardAvoidingView>
    </Layout>
  );

  // Debug controls for development (remove in production)
  const renderDebugControls = () => {
    if (__DEV__) {
      return (
        <View style={styles.debugControls}>
          <Button
            size="tiny"
            appearance="ghost"
            onPress={handleManualLock}
          >
            🔒 Lock App
          </Button>
        </View>
      );
    }
    return null;
  };

  // Main render
  if (isLoading) {
    return renderLoading();
  }

  if (isLocked) {
    return renderLockScreen();
  }

  // App is unlocked - render children with debug controls
  return (
    <View style={styles.unlockedContainer}>
      {children}
      {renderDebugControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  unlockedContainer: {
    flex: 1,
  },
  authCard: {
    width: Math.min(width * 0.9, 400),
    padding: 20,
    borderRadius: 16,
  },
  biometricContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pinContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lockIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  lockTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#222B45',
  },
  lockSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#8F9BB3',
  },
  pinTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#222B45',
  },
  pinInput: {
    width: '100%',
    marginBottom: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  biometricButton: {
    width: '100%',
    marginBottom: 12,
  },
  pinButton: {
    width: '100%',
    marginBottom: 12,
  },
  unlockButton: {
    width: '100%',
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  debugControls: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
});

export default AuthGate;