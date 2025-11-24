import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { getTierDetails } from '../constants/proximityDefaults';

/**
 * ScoreBadge - Circular badge displaying proximity score
 *
 * @param {number} score - Proximity score (0-100)
 * @param {string} size - Badge size: 'small' | 'medium' | 'large' (default: 'medium')
 * @param {object} style - Optional style override
 */
export default function ScoreBadge({ score = 0, size = 'medium', style }) {
  const theme = useTheme();
  const tierInfo = getTierDetails(score);

  // Validate size and fallback to 'medium' if invalid
  const VALID_SIZES = ['small', 'medium', 'large'];
  const validatedSize = VALID_SIZES.includes(size) ? size : 'medium';

  // Warn in development if an invalid size was provided
  if (__DEV__ && !VALID_SIZES.includes(size)) {
    console.warn(
      `ScoreBadge: Invalid size "${size}". Must be one of: ${VALID_SIZES.join(', ')}. Falling back to "medium".`
    );
  }

  const sizeStyles = {
    small: { width: 32, height: 32, borderRadius: 16 },
    medium: { width: 44, height: 44, borderRadius: 22 },
    large: { width: 56, height: 56, borderRadius: 28 },
  };

  const textVariants = {
    small: 'labelMedium',
    medium: 'labelLarge',
    large: 'titleMedium',
  };

  const styles = getStyles(theme);

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[validatedSize],
        { backgroundColor: tierInfo.color },
        style,
      ]}
    >
      <Text variant={textVariants[validatedSize]} style={styles.scoreText}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    badge: {
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
    },
    scoreText: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
    },
  });
}
