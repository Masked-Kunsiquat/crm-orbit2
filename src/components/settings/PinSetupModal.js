// PIN Setup Modal component for authentication settings
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Portal, Dialog } from 'react-native-paper';
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
    <Portal>
      {visible && (
        <Dialog visible onDismiss={handleClose} style={styles.modal}>
          <Dialog.Title style={styles.modalTitle}>Set PIN</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.input}
              placeholder="Enter new PIN"
              value={newPin}
              onChangeText={setNewPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              contentStyle={{ textAlign: 'center' }}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              contentStyle={{ textAlign: 'center' }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleClose}>Cancel</Button>
            <Button onPress={handleSetPIN} disabled={!newPin || !confirmPin}>
              Set PIN
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
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
