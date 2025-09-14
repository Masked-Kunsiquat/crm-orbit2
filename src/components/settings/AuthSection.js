// Authentication settings section component
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Switch, Button, Divider, TextInput } from 'react-native-paper';
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
