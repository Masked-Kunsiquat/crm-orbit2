import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, RadioButton, Text, List, Divider } from 'react-native-paper';
import { settingsDB } from '../database';

const ACTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Text', value: 'text' },
];

export default function SettingsScreen() {
  const [leftAction, setLeftAction] = useState('text');
  const [rightAction, setRightAction] = useState('call');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const values = await settingsDB.getValues('interactions', [
          'swipe_left_action',
          'swipe_right_action',
        ]);
        setLeftAction(values.swipe_left_action || 'text');
        setRightAction(values.swipe_right_action || 'call');
      } catch (e) {
        // Fallback defaults on first run
        setLeftAction('text');
        setRightAction('call');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const persist = async (key, value) => {
    try {
      await settingsDB.set(`interactions.${key}`, value, 'string');
    } catch (e) {
      // swallow for now; could show a toast/snackbar
      console.warn('Failed to save setting', key, e?.message);
    }
  };

  const onChangeLeft = val => {
    setLeftAction(val);
    persist('swipe_left_action', val);
  };
  const onChangeRight = val => {
    setRightAction(val);
    persist('swipe_right_action', val);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <List.Section style={styles.section}>
        <List.Subheader>Swipe Actions</List.Subheader>

        <List.Item title="Left Swipe" />
        <RadioButton.Group onValueChange={onChangeLeft} value={leftAction}>
          {ACTIONS.map(a => (
            <RadioButton.Item key={a.value} label={a.label} value={a.value} />
          ))}
        </RadioButton.Group>

        <Divider style={styles.divider} />

        <List.Item title="Right Swipe" />
        <RadioButton.Group onValueChange={onChangeRight} value={rightAction}>
          {ACTIONS.map(a => (
            <RadioButton.Item key={a.value} label={a.label} value={a.value} />
          ))}
        </RadioButton.Group>
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
});

