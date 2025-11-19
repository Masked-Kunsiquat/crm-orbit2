import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Container for stat cards with responsive row layout
 */
export default function StatsRow({ children, style }) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
});
