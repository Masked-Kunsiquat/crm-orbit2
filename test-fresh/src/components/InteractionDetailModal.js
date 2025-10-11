import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Surface,
  Text,
  IconButton,
  Divider,
  Chip,
  useTheme,
} from 'react-native-paper';
import ContactAvatar from './ContactAvatar';

// Helper to format interaction datetime
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'No date';
  const date = new Date(dateTimeStr);

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
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
      return { name: 'phone', color: '#4CAF50', label: 'Call' };
    case 'text':
      return { name: 'message-text', color: '#2196F3', label: 'Text' };
    case 'email':
      return { name: 'email', color: '#FF9800', label: 'Email' };
    case 'meeting':
      return { name: 'calendar-account', color: '#9C27B0', label: 'Meeting' };
    case 'other':
    default:
      return { name: 'note-text', color: '#757575', label: 'Other' };
  }
};

export default function InteractionDetailModal({ visible, onDismiss, interaction, contact, onEdit }) {
  const theme = useTheme();

  if (!interaction) return null;

  const typeInfo = getTypeIcon(interaction.interaction_type || interaction.custom_type);
  const durationStr = formatDuration(interaction.duration);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              Interaction Details
            </Text>
            <View style={styles.headerActions}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={onEdit}
                style={styles.editButton}
              />
              <IconButton
                icon="close"
                size={20}
                onPress={onDismiss}
                style={styles.closeButton}
              />
            </View>
          </View>

          <Divider />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Type & Duration */}
            <View style={styles.section}>
              <View style={styles.typeRow}>
                <View style={[styles.typeIconContainer, { backgroundColor: typeInfo.color + '20' }]}>
                  <IconButton
                    icon={typeInfo.name}
                    size={24}
                    iconColor={typeInfo.color}
                    style={styles.typeIcon}
                  />
                </View>
                <View style={styles.typeInfo}>
                  <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Type</Text>
                  <Text variant="titleMedium" style={[styles.value, { color: typeInfo.color }]}>
                    {typeInfo.label}
                  </Text>
                  {durationStr && (
                    <Text variant="bodySmall" style={[styles.duration, { color: theme.colors.onSurfaceVariant }]}>
                      Duration: {durationStr}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <Divider />

            {/* Contact */}
            {contact && (
              <>
                <View style={styles.section}>
                  <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Contact</Text>
                  <View style={styles.contactRow}>
                    <ContactAvatar contact={contact} size={32} />
                    <Text variant="bodyLarge" style={[styles.contactName, { color: theme.colors.onSurface }]}>
                      {contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()}
                    </Text>
                  </View>
                </View>
                <Divider />
              </>
            )}

            {/* Title */}
            <View style={styles.section}>
              <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Title</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {interaction.title}
              </Text>
            </View>

            <Divider />

            {/* Date & Time */}
            <View style={styles.section}>
              <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Date & Time</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {formatDateTime(interaction.interaction_datetime)}
              </Text>
            </View>

            <Divider />

            {/* Notes */}
            {interaction.note && (
              <>
                <View style={styles.section}>
                  <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Notes</Text>
                  <Text variant="bodyMedium" style={[styles.note, { color: theme.colors.onSurface }]}>
                    {interaction.note}
                  </Text>
                </View>
                <Divider />
              </>
            )}

            {/* Metadata */}
            <View style={styles.section}>
              <Text variant="labelSmall" style={[styles.metadata, { color: theme.colors.onSurfaceVariant }]}>
                Created: {new Date(interaction.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </Text>
              {interaction.updated_at && interaction.updated_at !== interaction.created_at && (
                <Text variant="labelSmall" style={[styles.metadata, { color: theme.colors.onSurfaceVariant }]}>
                  Updated: {new Date(interaction.updated_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>

            <View style={styles.spacer} />
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    margin: 20,
  },
  surface: {
    maxHeight: '80%',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  title: {
    fontWeight: '600',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    margin: 0,
  },
  closeButton: {
    margin: 0,
  },
  content: {
    paddingHorizontal: 0,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconContainer: {
    borderRadius: 12,
    padding: 2,
  },
  typeIcon: {
    margin: 0,
  },
  typeInfo: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  contactName: {
    fontWeight: '500',
  },
  label: {
    marginBottom: 4,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  value: {
    // Color set via theme prop
  },
  duration: {
    marginTop: 4,
  },
  note: {
    lineHeight: 22,
  },
  metadata: {
    marginTop: 4,
  },
  spacer: {
    height: 20,
  },
});
