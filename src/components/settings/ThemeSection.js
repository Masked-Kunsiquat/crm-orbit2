import React from 'react';
import { View } from 'react-native';
import { List, RadioButton, Text } from 'react-native-paper';
import { useAppTheme } from '../../contexts/ThemeContext';

const ThemeSection = () => {
  const { mode, setMode } = useAppTheme();

  return (
    <List.Section>
      <List.Subheader>Appearance</List.Subheader>
      <RadioButton.Group value={mode} onValueChange={setMode}>
        <List.Item
          title="System"
          description="Match your device appearance"
          left={(props) => <RadioButton {...props} value="system" />}
          onPress={() => setMode('system')}
          accessibilityLabel="Use system theme"
        />
        <List.Item
          title="Light"
          left={(props) => <RadioButton {...props} value="light" />}
          onPress={() => setMode('light')}
          accessibilityLabel="Use light theme"
        />
        <List.Item
          title="Dark"
          left={(props) => <RadioButton {...props} value="dark" />}
          onPress={() => setMode('dark')}
          accessibilityLabel="Use dark theme"
        />
      </RadioButton.Group>
      <View style={{ height: 8 }} />
      <Text variant="bodySmall" style={{ opacity: 0.7, paddingHorizontal: 16 }}>
        Changes apply immediately across the app.
      </Text>
    </List.Section>
  );
};

export default ThemeSection;

