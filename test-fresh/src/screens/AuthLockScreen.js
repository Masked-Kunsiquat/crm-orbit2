import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

export default function AuthLockScreen() {
  const { authenticate, authenticateWithPIN } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [mode, setMode] = useState('pin'); // 'biometric' | 'pin'

  React.useEffect(() => {
    (async () => {
      const caps = await authService.checkAuthenticationCapabilities();
      const enabled = await authService.isBiometricEnabled();
      const canBio = Boolean(caps?.canUseBiometric && enabled);
      setBiometricAvailable(canBio);
      setMode(canBio ? 'biometric' : 'pin');
    })();
  }, []);

  const canSubmit = useMemo(() => pin && pin.length >= 4, [pin]);

  const onBiometric = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await authenticate({ promptMessage: 'Unlock CRM' });
      if (!r?.success) {
        if (r?.method === 'pin_required') {
          setMode('pin');
        } else {
          setError(r?.error || 'Biometric authentication failed');
        }
      } else {
        setMode('biometric');
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmitPin = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const r = await authenticateWithPIN(pin);
      if (!r?.success) {
        setError(r?.error || 'Invalid PIN');
      }
    } finally {
      setBusy(false);
    }
  };

  // Auto-attempt biometric when available and in biometric mode
  React.useEffect(() => {
    if (mode === 'biometric' && biometricAvailable) {
      // fire and forget; errors handled inside
      onBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, biometricAvailable]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Locked" subtitle="Authenticate to continue" />
        <Card.Content>
          {mode === 'biometric' && biometricAvailable ? (
            <View>
              <Text style={{ marginBottom: 12 }}>Waiting for biometric authentication…</Text>
              {!!error && <HelperText type="error">{error}</HelperText>}
              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => setMode('pin')} disabled={busy}>
                  Use PIN instead
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <TextInput
                label="Enter PIN"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                disabled={busy}
              />
              {!!error && <HelperText type="error">{error}</HelperText>}
              <View style={styles.actions}>
                <Button mode="contained" onPress={onSubmitPin} disabled={!canSubmit || busy}>
                  Unlock
                </Button>
                {biometricAvailable && (
                  <Button style={styles.bioBtn} mode="text" onPress={() => setMode('biometric')} disabled={busy}>
                    Use Biometrics
                  </Button>
                )}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  card: { paddingBottom: 8 },
  actions: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bioBtn: { marginLeft: 8 },
});
