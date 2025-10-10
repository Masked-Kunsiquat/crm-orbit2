import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function InteractionsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Interactions</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Coming soon: recent calls, texts, emails, and notes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
});

