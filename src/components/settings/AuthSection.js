// Authentication settings section component
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Toggle,
  Button,
  Divider,
  Input
} from '@ui-kitten/components';
import authService from '../../services/authService';

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
          onPress={hasPIN ? handleRemovePIN : onSetPIN}
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
            value={autoLockTimeoutInput}
            keyboardType="number-pad"
            onChangeText={onTimeoutChange}
            onEndEditing={onTimeoutCommit}
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