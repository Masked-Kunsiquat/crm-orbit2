import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';

/**
 * Convert color to rgba with alpha channel
 * Supports hex (#RGB, #RRGGBB), rgb(), and rgba() formats
 * Falls back to rgba(0,0,0,0.12) for invalid inputs
 *
 * @param {string} color - Input color (hex, rgb, or rgba)
 * @param {number} alpha - Alpha value (0-1), default 0.12
 * @returns {string} rgba color string
 */
function getColorWithAlpha(color, alpha = 0.12) {
  if (!color || typeof color !== 'string') {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const trimmed = color.trim();

  // Handle hex colors (#RGB or #RRGGBB)
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);

    // Validate hex format
    if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(hex)) {
      if (__DEV__) {
        console.warn(`TierHeader: Invalid hex color "${color}". Using fallback.`);
      }
      return `rgba(0, 0, 0, ${alpha})`;
    }

    // Expand short hex (#RGB → #RRGGBB)
    const fullHex = hex.length === 3
      ? hex.split('').map(char => char + char).join('')
      : hex;

    // Convert hex to RGB
    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Handle rgb() format - convert to rgba
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Handle rgba() format - replace alpha
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Unsupported format (named colors, hsl, etc.)
  if (__DEV__) {
    console.warn(`TierHeader: Unsupported color format "${color}". Using fallback.`);
  }
  return `rgba(0, 0, 0, ${alpha})`;
}

/**
 * TierHeader - Section header for proximity tiers
 *
 * @param {string} emoji - Tier emoji (🟢, 🟡, 🟠, 🔴)
 * @param {string} title - Tier label (e.g., "Inner Circle")
 * @param {string} color - Tier color (hex, rgb, or rgba format)
 * @param {number} count - Number of contacts in tier
 * @param {object} style - Optional style override
 */
export default function TierHeader({ emoji, title, color, count, style }) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Get background color with 12% opacity (0.12 alpha)
  const chipBackgroundColor = getColorWithAlpha(color, 0.12);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={[styles.title, { color }]}>
          {emoji} {title.toUpperCase()}
        </Text>
        <Chip
          compact
          mode="flat"
          style={[styles.countChip, { backgroundColor: chipBackgroundColor }]}
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
