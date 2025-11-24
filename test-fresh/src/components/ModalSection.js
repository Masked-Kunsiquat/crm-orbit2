import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme, IconButton, Divider } from 'react-native-paper';

/**
 * ModalSection - Consistent section styling for modal content
 *
 * Provides standardized spacing, titles, and layout for modal sections
 *
 * @param {string} title - Section title
 * @param {string} description - Optional section description
 * @param {React.ReactNode} icon - Optional leading icon
 * @param {React.ReactNode} action - Optional right action (button, etc.)
 * @param {React.ReactNode} children - Section content
 * @param {boolean} last - Whether this is the last section (affects spacing)
 * @param {boolean} divider - Show divider after section (default: false)
 */
export default function ModalSection({
  title,
  description,
  icon,
  action,
  children,
  last = false,
  divider = false,
}) {
  const theme = useTheme();

  return (
    <>
      <View style={[styles.section, last && styles.lastSection]}>
        {(title || icon || action) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {icon && <View style={styles.icon}>{icon}</View>}
              <View style={styles.titleContainer}>
                {title && (
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.title,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {title}
                  </Text>
                )}
                {description && (
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.description,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {description}
                  </Text>
                )}
              </View>
            </View>
            {action && <View style={styles.action}>{action}</View>}
          </View>
        )}
        <View style={styles.content}>{children}</View>
      </View>
      {divider && <Divider style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    lineHeight: 24,
  },
  description: {
    marginTop: 2,
    lineHeight: 18,
  },
  action: {
    marginTop: -4,
  },
  content: {
    gap: 12,
  },
  divider: {
    marginVertical: 16,
  },
});
