import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

/**
 * Themed stat card for displaying key metrics
 * Supports primary, secondary, tertiary themes
 */
export default function StatsCard({
  value,
  label,
  variant = 'primary', // 'primary' | 'secondary' | 'tertiary'
  style,
}) {
  const theme = useTheme();

  const variantColors = {
    primary: {
      background: theme.colors.primaryContainer,
      text: theme.colors.onPrimaryContainer,
    },
    secondary: {
      background: theme.colors.secondaryContainer,
      text: theme.colors.onSecondaryContainer,
    },
    tertiary: {
      background: theme.colors.tertiaryContainer,
      text: theme.colors.onTertiaryContainer,
    },
  };

  const colors = variantColors[variant] || variantColors.primary;

  return (
    <Card style={[styles.card, { backgroundColor: colors.background }, style]}>
      <Card.Content style={styles.content}>
        <Text
          variant="headlineLarge"
          style={[styles.value, { color: colors.text }]}
        >
          {value}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.label, { color: colors.text }]}
        >
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    elevation: 2,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    textAlign: 'center',
    width: '100%',
    fontSize: 12,
  },
});
