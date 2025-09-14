// PIN Setup Modal component for authentication settings
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Input,
  Modal
} from '@ui-kitten/components';
import authService from '../../services/authService';

const PinSetupModal = ({ visible, onClose, onSuccess }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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
      setNewPin('');
      setConfirmPin('');
      onSuccess?.();
      onClose();
      Alert.alert('Success', 'PIN has been set successfully');
    } catch (error) {
      console.error('Failed to set PIN:', error);
      Alert.alert('Error', 'Failed to set PIN');
    }
  };

  const handleClose = () => {
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={handleClose}
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
            onPress={handleClose}
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
  );
};

const styles = StyleSheet.create({
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

export default PinSetupModal;