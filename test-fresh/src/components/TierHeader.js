import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';

/**
 * TierHeader - Section header for proximity tiers
 *
 * @param {string} emoji - Tier emoji (🟢, 🟡, 🟠, 🔴)
 * @param {string} title - Tier label (e.g., "Inner Circle")
 * @param {string} color - Tier color (hex string)
 * @param {number} count - Number of contacts in tier
 * @param {object} style - Optional style override
 */
export default function TierHeader({ emoji, title, color, count, style }) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={[styles.title, { color }]}>
          {emoji} {title.toUpperCase()}
        </Text>
        <Chip
          compact
          mode="flat"
          style={[styles.countChip, { backgroundColor: color + '20' }]}
          textStyle={[styles.countText, { color }]}
        >
          {count}
        </Chip>
      </View>
    </View>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    container: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    content: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    countChip: {
      height: 24,
    },
    countText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
