import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, RadioButton, Text, List, Divider, Switch } from 'react-native-paper';
import { useSettings } from '../context/SettingsContext';
import authService from '../services/authService';
import { useNavigation } from '@react-navigation/native';

const ACTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Text', value: 'text' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { leftAction, rightAction, setMapping, themeMode, setThemeMode } = useSettings();
  const [expandedSwipe, setExpandedSwipe] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState(false);
  const [expandedSecurity, setExpandedSecurity] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);

  React.useEffect(() => {
    (async () => {
      setBiometricEnabled(await authService.isBiometricEnabled());
      setAutoLockEnabled(await authService.isAutoLockEnabled());
    })();
  }, []);

  const toggleBiometric = async () => {
    try {
      if (biometricEnabled) {
        await authService.disableBiometric();
        setBiometricEnabled(false);
      } else {
        await authService.enableBiometric();
        setBiometricEnabled(true);
      }
    } catch (e) {
      // no-op simple handling
    }
  };

  const toggleAutoLock = async () => {
    try {
      if (autoLockEnabled) {
        await authService.disableAutoLock();
        setAutoLockEnabled(false);
      } else {
        await authService.enableAutoLock(5);
        setAutoLockEnabled(true);
      }
    } catch (e) {
      // no-op
    }
  };

  const onSelectCall = side => {
    if (side === 'left') setMapping('call', 'text');
    else setMapping('text', 'call');
  };

  const onSelectText = side => {
    if (side === 'left') setMapping('text', 'call');
    else setMapping('call', 'text');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      {/* Security */}
      <List.Section style={styles.section}>
        <List.Accordion
          title="Security"
          expanded={expandedSecurity}
          onPress={() => setExpandedSecurity(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">Set / Change PIN</Text>}
            onPress={() => navigation.navigate('PinSetup')}
          />
          <List.Item
            title={() => <Text variant="titleSmall">Use Biometric</Text>}
            right={() => (
              <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
            )}
          />
          <List.Item
            title={() => <Text variant="titleSmall">Auto-Lock (5 min)</Text>}
            right={() => (
              <Switch value={autoLockEnabled} onValueChange={toggleAutoLock} />
            )}
          />
        </List.Accordion>
      </List.Section>

      {/* Swipe Actions */}
      <List.Section style={styles.section}>
        <List.Accordion
          title="Swipe Actions"
          expanded={expandedSwipe}
          onPress={() => setExpandedSwipe(e => !e)}
        >
          <List.Item
            title={() => (
              <Text variant="titleSmall">Call</Text>
            )}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>Left</Text>
                <RadioButton
                  value="call-left"
                  status={leftAction === 'call' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectCall('left')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>Right</Text>
                <RadioButton
                  value="call-right"
                  status={rightAction === 'call' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectCall('right')}
                />
              </View>
            )}
          />

          <Divider style={styles.divider} />

          <List.Item
            title={() => (
              <Text variant="titleSmall">Text</Text>
            )}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>Left</Text>
                <RadioButton
                  value="text-left"
                  status={leftAction === 'text' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectText('left')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>Right</Text>
                <RadioButton
                  value="text-right"
                  status={rightAction === 'text' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectText('right')}
                />
              </View>
            )}
          />
        </List.Accordion>
      </List.Section>

      {/* Theme */}
      <List.Section style={styles.section}>
        <List.Accordion
          title="Theme"
          expanded={expandedTheme}
          onPress={() => setExpandedTheme(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">Appearance</Text>}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>System</Text>
                <RadioButton
                  value="theme-system"
                  status={themeMode === 'system' ? 'checked' : 'unchecked'}
                  onPress={() => setThemeMode('system')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>Light</Text>
                <RadioButton
                  value="theme-light"
                  status={themeMode === 'light' ? 'checked' : 'unchecked'}
                  onPress={() => setThemeMode('light')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>Dark</Text>
                <RadioButton
                  value="theme-dark"
                  status={themeMode === 'dark' ? 'checked' : 'unchecked'}
                  onPress={() => setThemeMode('dark')}
                />
              </View>
            )}
          />
        </List.Accordion>
      </List.Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 8,
  },
  rowOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  optionLabel: {
    color: '#666',
    marginRight: 4,
  },
});
