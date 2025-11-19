import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

/**
 * Consistent empty state message
 */
export default function EmptyState({ message, style }) {
  return (
    <Text variant="bodyMedium" style={[styles.emptyText, style]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
});
