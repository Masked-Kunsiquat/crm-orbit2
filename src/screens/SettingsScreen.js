// Settings screen with authentication controls
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import authService from '../services/authService';
import AuthSection from '../components/settings/AuthSection';
import DangerZone from '../components/settings/DangerZone';
import PinSetupModal from '../components/settings/PinSetupModal';

const SettingsScreen = () => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5);
  const [autoLockTimeoutInput, setAutoLockTimeoutInput] = useState('5');
  const [hasPIN, setHasPIN] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check biometric availability
      const capabilities = await authService.checkAuthenticationCapabilities();
      setBiometricAvailable(capabilities.canUseBiometric);
      
      // Load current settings
      const [biometric, autoLock, timeout, pinExists] = await Promise.all([
        authService.isBiometricEnabled(),
        authService.isAutoLockEnabled(),
        authService.getAutoLockTimeout(),
        authService.hasPIN()
      ]);
      
      setBiometricEnabled(biometric);
      setAutoLockEnabled(autoLock);
      setAutoLockTimeout(timeout);
      setAutoLockTimeoutInput(String(timeout));
      setHasPIN(pinExists);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };


  const handleTimeoutChange = (text) => {
    setAutoLockTimeoutInput(text.replace(/[^0-9]/g, ''));
  };

  const commitAutoLockTimeout = async (valueStr) => {
    const source = typeof valueStr === 'string' ? valueStr : autoLockTimeoutInput;
    let parsed = parseInt(source, 10);
    if (!Number.isFinite(parsed)) parsed = autoLockTimeout;
    // Clamp to 1..1440 minutes
    parsed = Math.min(1440, Math.max(1, parsed));
    setAutoLockTimeoutInput(String(parsed));
    setAutoLockTimeout(parsed);
    if (autoLockEnabled) {
      try {
        await authService.enableAutoLock(parsed);
      } catch (error) {
        console.error('Error updating timeout:', error);
      }
    }
  };

  const handlePinSetupSuccess = () => {
    setHasPIN(true);
  };

  const handlePinRemoved = () => {
    setHasPIN(false);
  };

  const handleResetComplete = () => {
    loadSettings();
  };

  return (
    <Surface style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={styles.title}>Settings</Text>

        <AuthSection
          biometricEnabled={biometricEnabled}
          biometricAvailable={biometricAvailable}
          autoLockEnabled={autoLockEnabled}
          autoLockTimeout={autoLockTimeout}
          autoLockTimeoutInput={autoLockTimeoutInput}
          hasPIN={hasPIN}
          onBiometricToggle={setBiometricEnabled}
          onAutoLockToggle={setAutoLockEnabled}
          onTimeoutChange={handleTimeoutChange}
          onTimeoutCommit={commitAutoLockTimeout}
          onSetPIN={() => setShowPinModal(true)}
          onRemovePIN={handlePinRemoved}
        />

        <DangerZone onResetComplete={handleResetComplete} />
      </ScrollView>

      <PinSetupModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSetupSuccess}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
});

export default SettingsScreen;
