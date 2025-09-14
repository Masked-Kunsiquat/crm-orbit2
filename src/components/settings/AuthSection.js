/**
 * Authentication settings section component
 *
 * Provides UI controls for managing authentication settings:
 * - Biometric authentication toggle
 * - Auto-lock configuration with timeout settings
 * - PIN management (setup/removal)
 * - Real-time setting synchronization with auth service
 *
 * @component
 * @example
 * <AuthSection
 *   biometricEnabled={true}
 *   biometricAvailable={true}
 *   autoLockEnabled={false}
 *   autoLockTimeout={5}
 *   hasPIN={true}
 *   onBiometricToggle={(enabled) => console.log('Biometric:', enabled)}
 *   onAutoLockToggle={(enabled) => console.log('Auto-lock:', enabled)}
 *   onSetPIN={() => console.log('Setup PIN')}
 *   onRemovePIN={() => console.log('Remove PIN')}
 * />
 */
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Switch, Button, Divider, TextInput } from 'react-native-paper';
import authService from '../../services/authService';

/**
 * AuthSection functional component
 * @param {Object} props - Component props
 * @param {boolean} props.biometricEnabled - Whether biometric auth is enabled
 * @param {boolean} props.biometricAvailable - Whether biometric hardware is available
 * @param {boolean} props.autoLockEnabled - Whether auto-lock is enabled
 * @param {number} props.autoLockTimeout - Auto-lock timeout in minutes
 * @param {string} props.autoLockTimeoutInput - Current timeout input value
 * @param {boolean} props.hasPIN - Whether PIN is configured
 * @param {Function} props.onBiometricToggle - Callback for biometric toggle
 * @param {Function} props.onAutoLockToggle - Callback for auto-lock toggle
 * @param {Function} props.onTimeoutChange - Callback for timeout input change
 * @param {Function} props.onTimeoutCommit - Callback for timeout commit
 * @param {Function} props.onSetPIN - Callback for PIN setup
 * @param {Function} props.onRemovePIN - Callback for PIN removal
 * @returns {JSX.Element} Authentication settings UI
 */
const AuthSection = ({
  biometricEnabled,
  biometricAvailable,
  autoLockEnabled,
  autoLockTimeout,
  autoLockTimeoutInput,
  hasPIN,
  onBiometricToggle,
  onAutoLockToggle,
  onTimeoutChange,
  onTimeoutCommit,
  onSetPIN,
  onRemovePIN
}) => {
  const handleBiometricToggle = async (enabled) => {
    try {
      if (enabled) {
        await authService.enableBiometric();
      } else {
        await authService.disableBiometric();
      }
      onBiometricToggle(enabled);
    } catch (error) {
      console.error('Failed to update biometric setting:', error);
      Alert.alert('Error', 'Failed to update biometric setting');
    }
  };

  const handleAutoLockToggle = async (enabled) => {
    try {
      if (enabled) {
        await authService.enableAutoLock(autoLockTimeout);
      } else {
        await authService.disableAutoLock();
      }
      onAutoLockToggle(enabled);
    } catch (error) {
      console.error('Failed to update auto-lock setting:', error);
      Alert.alert('Error', 'Failed to update auto-lock setting');
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
              onRemovePIN();
              Alert.alert('Success', 'PIN has been removed');
            } catch (error) {
              console.error('Failed to remove PIN:', error);
              Alert.alert('Error', 'Failed to remove PIN');
            }
          }
        }
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Authentication</Text>

      {/* PIN Settings */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text variant="bodyLarge">PIN Authentication</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {hasPIN ? 'PIN is configured' : 'No PIN configured'}
          </Text>
        </View>
        <Button
          mode={hasPIN ? 'text' : 'outlined'}
          compact
          onPress={hasPIN ? handleRemovePIN : onSetPIN}
        >
          {hasPIN ? 'Remove' : 'Set PIN'}
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Biometric Settings */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text variant="bodyLarge">Biometric Authentication</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {biometricAvailable
              ? 'Use fingerprint or face recognition'
              : 'Not available on this device'}
          </Text>
        </View>
        <Switch
          value={biometricEnabled}
          disabled={!biometricAvailable}
          onValueChange={handleBiometricToggle}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Auto-lock Settings */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text variant="bodyLarge">Auto-lock</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            Lock app when in background
          </Text>
        </View>
        <Switch
          value={autoLockEnabled}
          onValueChange={handleAutoLockToggle}
        />
      </View>

      {autoLockEnabled && (
        <View style={styles.timeoutSetting}>
          <Text variant="titleSmall" style={styles.timeoutLabel}>
            Auto-lock timeout (minutes)
          </Text>
          <TextInput
            style={styles.timeoutInput}
            value={autoLockTimeoutInput}
            keyboardType="number-pad"
            inputMode="numeric"
            onChangeText={(t) => onTimeoutChange(t.replace(/\D+/g, ''))}
            onEndEditing={() => {
              const n = Math.min(1440, Math.max(1, parseInt(autoLockTimeoutInput || '0', 10)));
              onTimeoutCommit(String(n));
            }}
            placeholder="5"
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
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
});

export default AuthSection;
