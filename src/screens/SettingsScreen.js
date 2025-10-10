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

  // Enforce mutual exclusivity: if one is Right, the other must be Left
  const setMapping = (left, right) => {
    setLeftAction(left);
    setRightAction(right);
    persist('swipe_left_action', left);
    persist('swipe_right_action', right);
  };

  const onSelectCall = side => {
    if (side === 'left') {
      setMapping('call', 'text');
    } else {
      setMapping('text', 'call');
    }
  };

  const onSelectText = side => {
    if (side === 'left') {
      setMapping('text', 'call');
    } else {
      setMapping('call', 'text');
    }
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
