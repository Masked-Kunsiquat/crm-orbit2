import { StyleSheet, View } from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';

/**
 * Consistent empty state message with optional icon, title, and action button
 *
 * @param {string} message - The main message to display
 * @param {string} icon - Optional icon name (from MaterialCommunityIcons)
 * @param {string} title - Optional title text (displayed above message)
 * @param {string} actionLabel - Optional button label
 * @param {function} onAction - Optional button press handler
 * @param {object} style - Optional style override
 */
export default function EmptyState({ message, icon, title, actionLabel, onAction, style }) {
  // Simple mode: just message (backwards compatible)
  if (!icon && !title && !actionLabel) {
    return (
      <Text variant="bodyMedium" style={[styles.emptyText, style]}>
        {message}
      </Text>
    );
  }

  // Enhanced mode: icon, title, message, and optional action button
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <Icon source={icon} size={48} color="#999" />
      )}
      {title && (
        <Text variant="headlineSmall" style={styles.title}>
          {title}
        </Text>
      )}
      {message && (
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});
