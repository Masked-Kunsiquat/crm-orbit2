import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, RadioButton, Text, List, Divider } from 'react-native-paper';
import { useSettings } from '../context/SettingsContext';

const ACTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Text', value: 'text' },
];

export default function SettingsScreen() {
  const { leftAction, rightAction, setMapping, themeMode, setThemeMode } = useSettings();

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

      <List.Section style={styles.section}>
        <List.Subheader>Swipe Actions</List.Subheader>

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
      </List.Section>

      <List.Section style={styles.section}>
        <List.Subheader>Theme</List.Subheader>
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
