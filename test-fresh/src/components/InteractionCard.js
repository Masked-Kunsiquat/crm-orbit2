import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon, useTheme } from 'react-native-paper';
import ContactAvatar from './ContactAvatar';

// Helper to format interaction datetime
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'No date';
  const date = new Date(dateTimeStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Helper to format duration (in seconds)
const formatDuration = (seconds) => {
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
const getTypeIcon = (type) => {
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

export default function InteractionCard({ interaction, onPress, contact }) {
  const theme = useTheme();
  const typeInfo = getTypeIcon(interaction.interaction_type || interaction.custom_type);
  const durationStr = formatDuration(interaction.duration);

  return (
    <Card style={styles.card} onPress={onPress} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.row}>
          {/* Interaction Type Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + '20' }]}>
            <Icon source={typeInfo.name} size={24} color={typeInfo.color} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.header}>
              <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
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
                <ContactAvatar
                  contact={contact}
                  size={24}
                />
                <Text variant="bodyMedium" style={styles.contactName} numberOfLines={1}>
                  {contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'}
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
            <Text variant="bodySmall" style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
              {formatDateTime(interaction.interaction_datetime)}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

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
