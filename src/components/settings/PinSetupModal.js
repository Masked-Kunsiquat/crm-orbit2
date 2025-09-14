/**
 * PIN Setup Modal component for authentication settings
 *
 * Provides a secure PIN setup interface with:
 * - PIN entry with confirmation validation
 * - Strength validation according to AUTH constants
 * - Secure input handling (numeric only, masked)
 * - Automatic field clearing on modal hide
 * - Error handling and user feedback
 * - Integration with authService for secure PIN storage
 *
 * @component
 * @example
 * <PinSetupModal
 *   visible={showSetup}
 *   onClose={() => setShowSetup(false)}
 *   onSuccess={() => {
 *     setShowSetup(false);
 *     console.log('PIN setup successful');
 *   }}
 * />
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, TextInput, Portal, Dialog } from 'react-native-paper';
import authService from '../../services/authService';
import { MIN_PIN_LENGTH, MAX_PIN_LENGTH } from '../../constants/AUTH';

/**
 * PinSetupModal functional component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should be closed
 * @param {Function} props.onSuccess - Callback when PIN setup is successful
 * @returns {JSX.Element} PIN setup modal UI
 */
const PinSetupModal = ({ visible, onClose, onSuccess }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  // Track mounted state to avoid setState on unmounted component
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clear PIN fields whenever the modal hides to avoid lingering secrets
  useEffect(() => {
    if (!visible) {
      if (isMountedRef.current) {
        setNewPin('');
        setConfirmPin('');
      }
    }
  }, [visible]);

  const handleSetPIN = async () => {
    const normalizedNew = newPin.replace(/\D+/g, '');
    const normalizedConfirm = confirmPin.replace(/\D+/g, '');
    if (normalizedNew.length < MIN_PIN_LENGTH || normalizedNew.length > MAX_PIN_LENGTH) {
      Alert.alert('Error', `PIN must be ${MIN_PIN_LENGTH}-${MAX_PIN_LENGTH} digits`);
      return;
    }
    if (normalizedConfirm.length < MIN_PIN_LENGTH || normalizedConfirm.length > MAX_PIN_LENGTH) {
      Alert.alert('Error', `Confirm PIN must be ${MIN_PIN_LENGTH}-${MAX_PIN_LENGTH} digits`);
      return;
    }

    if (normalizedNew !== normalizedConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    try {
      if (isMountedRef.current) setSaving(true);
      await authService.setPIN(normalizedNew);
      if (isMountedRef.current) {
        setNewPin('');
        setConfirmPin('');
      }
      if (isMountedRef.current) onSuccess?.();
      if (isMountedRef.current) onClose?.();
      Alert.alert('Success', 'PIN has been set successfully');
    } catch (error) {
      console.error('Failed to set PIN:', error);
      Alert.alert('Error', 'Failed to set PIN');
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const handleClose = () => {
    setNewPin('');
    setConfirmPin('');
    onClose?.();
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
              onChangeText={(text) => {
                const cleaned = text.replace(/\D+/g, '').slice(0, MAX_PIN_LENGTH);
                if (isMountedRef.current) setNewPin(cleaned);
              }}
              secureTextEntry
              keyboardType="number-pad"
              inputMode="numeric"
              autoCorrect={false}
              autoCapitalize="none"
              contextMenuHidden={true}
              maxLength={MAX_PIN_LENGTH}
              contentStyle={{ textAlign: 'center' }}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D+/g, '').slice(0, MAX_PIN_LENGTH);
                if (isMountedRef.current) setConfirmPin(cleaned);
              }}
              secureTextEntry
              keyboardType="number-pad"
              inputMode="numeric"
              autoCorrect={false}
              autoCapitalize="none"
              contextMenuHidden={true}
              maxLength={MAX_PIN_LENGTH}
              contentStyle={{ textAlign: 'center' }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleClose} disabled={saving}>Cancel</Button>
            <Button onPress={handleSetPIN} disabled={!newPin || !confirmPin || saving}>
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
