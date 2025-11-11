import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, HelperText, TextInput } from 'react-native-paper';
import authService from '../services/authService';
import { useAsyncLoading } from '../hooks/useAsyncOperation';

export default function PinSetupScreen({ navigation }) {
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');

  const canSave = useMemo(() => pin1 && pin2 && pin1 === pin2 && pin1.length >= 4, [pin1, pin2]);

  const { execute: save, loading: busy } = useAsyncLoading(async () => {
    setError('');
    try {
      await authService.setPIN(pin1);
      navigation.goBack();
    } catch (e) {
      setError(e?.message || 'Failed to set PIN');
    }
  });

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Set PIN" />
      </Appbar.Header>
      <View style={styles.inner}>
        <Card>
          <Card.Content>
            <TextInput
              label="Enter new PIN"
              value={pin1}
              onChangeText={setPin1}
              keyboardType="number-pad"
              secureTextEntry
              disabled={busy}
              style={styles.input}
            />
            <TextInput
              label="Confirm PIN"
              value={pin2}
              onChangeText={setPin2}
              keyboardType="number-pad"
              secureTextEntry
              disabled={busy}
              style={styles.input}
            />
            {!!error && <HelperText type="error">{error}</HelperText>}
            <Button mode="contained" onPress={save} disabled={!canSave || busy}>
              Save PIN
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 16 },
  input: { marginBottom: 12 },
});

