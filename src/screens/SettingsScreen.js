// Settings screen with authentication controls
import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { 
  Layout, 
  Text, 
  Card, 
  Toggle, 
  Button, 
  Divider,
  Input,
  Modal
} from '@ui-kitten/components';
import authService from '../services/authService';

const SettingsScreen = () => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5);
  const [hasPIN, setHasPIN] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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
      setHasPIN(pinExists);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBiometricToggle = async (enabled) => {
    try {
      if (enabled) {
        await authService.enableBiometric();
      } else {
        await authService.disableBiometric();
      }
      setBiometricEnabled(enabled);
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric setting: ' + error.message);
    }
  };

  const handleAutoLockToggle = async (enabled) => {
    try {
      if (enabled) {
        await authService.enableAutoLock(autoLockTimeout);
      } else {
        await authService.disableAutoLock();
      }
      setAutoLockEnabled(enabled);
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-lock setting: ' + error.message);
    }
  };

  const handleTimeoutChange = async (newTimeout) => {
    const timeout = parseInt(newTimeout) || 5;
    setAutoLockTimeout(timeout);
    
    if (autoLockEnabled) {
      try {
        await authService.enableAutoLock(timeout);
      } catch (error) {
        console.error('Error updating timeout:', error);
      }
    }
  };

  const handleSetPIN = async () => {
    if (newPin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    
    try {
      await authService.setPIN(newPin);
      setHasPIN(true);
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Success', 'PIN has been set successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to set PIN: ' + error.message);
    }
  };

  const handleRemovePIN = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your PIN? This will disable PIN authentication.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.removePIN();
              setHasPIN(false);
              Alert.alert('Success', 'PIN has been removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove PIN: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleResetAuth = () => {
    Alert.alert(
      'Reset Authentication',
      'This will remove all authentication settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.resetAuth();
              await loadSettings();
              Alert.alert('Success', 'Authentication settings have been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset authentication: ' + error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text category="h4" style={styles.title}>Settings</Text>
        
        {/* Authentication Section */}
        <Card style={styles.card}>
          <Text category="h6" style={styles.sectionTitle}>Authentication</Text>
          
          {/* PIN Settings */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text category="s1">PIN Authentication</Text>
              <Text category="p2" appearance="hint">
                {hasPIN ? 'PIN is configured' : 'No PIN configured'}
              </Text>
            </View>
            <Button
              size="small"
              appearance={hasPIN ? 'ghost' : 'outline'}
              status={hasPIN ? 'danger' : 'primary'}
              onPress={hasPIN ? handleRemovePIN : () => setShowPinModal(true)}
            >
              {hasPIN ? 'Remove' : 'Set PIN'}
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Biometric Settings */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text category="s1">Biometric Authentication</Text>
              <Text category="p2" appearance="hint">
                {biometricAvailable 
                  ? 'Use fingerprint or face recognition' 
                  : 'Not available on this device'}
              </Text>
            </View>
            <Toggle
              checked={biometricEnabled}
              disabled={!biometricAvailable}
              onChange={handleBiometricToggle}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Auto-lock Settings */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text category="s1">Auto-lock</Text>
              <Text category="p2" appearance="hint">
                Lock app when in background
              </Text>
            </View>
            <Toggle
              checked={autoLockEnabled}
              onChange={handleAutoLockToggle}
            />
          </View>

          {autoLockEnabled && (
            <View style={styles.timeoutSetting}>
              <Text category="s2" style={styles.timeoutLabel}>
                Auto-lock timeout (minutes)
              </Text>
              <Input
                style={styles.timeoutInput}
                value={autoLockTimeout.toString()}
                keyboardType="numeric"
                onChangeText={handleTimeoutChange}
                placeholder="5"
              />
            </View>
          )}
        </Card>

        {/* Danger Zone */}
        <Card style={styles.card}>
          <Text category="h6" style={styles.sectionTitle} status="danger">
            Danger Zone
          </Text>
          <Button
            status="danger"
            appearance="outline"
            onPress={handleResetAuth}
          >
            Reset All Authentication Settings
          </Button>
        </Card>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setShowPinModal(false)}
      >
        <Card disabled={true} style={styles.modal}>
          <Text category="h6" style={styles.modalTitle}>Set PIN</Text>
          
          <Input
            style={styles.input}
            placeholder="Enter new PIN"
            value={newPin}
            onChangeText={setNewPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <Input
            style={styles.input}
            placeholder="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <View style={styles.modalButtons}>
            <Button
              style={styles.modalButton}
              appearance="ghost"
              onPress={() => setShowPinModal(false)}
            >
              Cancel
            </Button>
            <Button
              style={styles.modalButton}
              onPress={handleSetPIN}
              disabled={!newPin || !confirmPin}
            >
              Set PIN
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    marginVertical: 12,
  },
  timeoutSetting: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeoutLabel: {
    flex: 1,
  },
  timeoutInput: {
    width: 80,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    margin: 16,
    minWidth: 300,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default SettingsScreen;