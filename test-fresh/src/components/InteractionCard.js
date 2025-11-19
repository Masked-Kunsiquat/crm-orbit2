import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon, useTheme } from 'react-native-paper';
import ContactAvatar from './ContactAvatar';
import { formatRelativeDateTime } from '../utils/dateUtils';
import { getContactDisplayName } from '../utils/contactHelpers';

// Helper to format duration (in seconds)
const formatDuration = seconds => {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Get icon and color for interaction type
const getTypeIcon = type => {
  switch (type) {
    case 'call':
      return { name: 'phone', color: '#4CAF50' };
    case 'text':
      return { name: 'message-text', color: '#2196F3' };
    case 'email':
      return { name: 'email', color: '#FF9800' };
    case 'meeting':
      return { name: 'calendar-account', color: '#9C27B0' };
    case 'other':
    default:
      return { name: 'note-text', color: '#757575' };
  }
};

function InteractionCard({ interaction, onPress, onLongPress, contact }) {
  const theme = useTheme();
  const typeInfo = getTypeIcon(
    interaction.interaction_type || interaction.custom_type
  );
  const durationStr = formatDuration(interaction.duration);

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      mode="elevated"
    >
      <Card.Content style={styles.content}>
        <View style={styles.row}>
          {/* Interaction Type Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: typeInfo.color + '20' },
            ]}
          >
            <Icon source={typeInfo.name} size={24} color={typeInfo.color} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.header}>
              <Text
                variant="titleMedium"
                style={styles.title}
                numberOfLines={1}
              >
                {interaction.title}
              </Text>
              {durationStr && (
                <Text variant="bodySmall" style={styles.duration}>
                  {durationStr}
                </Text>
              )}
            </View>

            {/* Contact Info */}
            {contact && (
              <View style={styles.contactRow}>
                <ContactAvatar contact={contact} size={24} />
                <Text
                  variant="bodyMedium"
                  style={styles.contactName}
                  numberOfLines={1}
                >
                  {getContactDisplayName(contact, 'Unknown')}
                </Text>
              </View>
            )}

            {/* Note Preview */}
            {interaction.note && (
              <Text variant="bodySmall" style={styles.note} numberOfLines={2}>
                {interaction.note}
              </Text>
            )}

            {/* Date */}
            <Text
              variant="bodySmall"
              style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
            >
              {formatRelativeDateTime(interaction.interaction_datetime)}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders in list views
// Only re-render if interaction ID, updated_at, contact ID, or callbacks change
export default React.memo(InteractionCard, (prevProps, nextProps) => {
  return (
    prevProps.interaction.id === nextProps.interaction.id &&
    prevProps.interaction.updated_at === nextProps.interaction.updated_at &&
    prevProps.contact?.id === nextProps.contact?.id &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onLongPress === nextProps.onLongPress
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  content: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  duration: {
    marginLeft: 8,
    color: '#666',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  contactName: {
    color: '#666',
  },
  note: {
    color: '#888',
    marginTop: 4,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
});
