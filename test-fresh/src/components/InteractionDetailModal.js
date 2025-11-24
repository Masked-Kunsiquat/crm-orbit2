import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Text,
  IconButton,
  Chip,
  useTheme,
} from 'react-native-paper';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import ContactAvatar from './ContactAvatar';
import { getContactDisplayName } from '../utils/contactHelpers';
import { useTranslation } from 'react-i18next';

// Helper to format interaction datetime
const formatDateTime = dateTimeStr => {
  if (!dateTimeStr) return 'No date';
  const date = new Date(dateTimeStr);

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Helper to format duration (in seconds)
const formatDuration = seconds => {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs > 0 ? ` ${secs}s` : ''}`;
  } else {
    return `${secs}s`;
  }
};

// Get icon and color for interaction type
const getTypeInfo = type => {
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

function InteractionDetailModal({
  visible,
  onDismiss,
  interaction,
  contact,
  onEdit,
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!interaction) return null;

  const typeInfo = getTypeInfo(
    interaction.interaction_type || interaction.custom_type
  );
  const durationStr = formatDuration(interaction.duration);

  return (
    <BaseModal
      visible={visible}
      onDismiss={onDismiss}
      title="Interaction Details"
      subtitle={interaction.title}
      headerRight={
        <View style={styles.headerActions}>
          <IconButton
            icon="pencil"
            size={22}
            onPress={onEdit}
            style={styles.iconButton}
            mode="contained-tonal"
          />
          <IconButton
            icon="close"
            size={22}
            onPress={onDismiss}
            style={styles.iconButton}
          />
        </View>
      }
      maxHeight={0.85}
    >
      {/* Type & Duration */}
      <ModalSection
        icon={
          <View
            style={[
              styles.typeIconContainer,
              { backgroundColor: typeInfo.color + '20' },
            ]}
          >
            <IconButton
              icon={typeInfo.name}
              size={24}
              iconColor={typeInfo.color}
              style={styles.typeIcon}
            />
          </View>
        }
      >
        <View style={styles.typeInfo}>
          <Text
            variant="labelSmall"
            style={[
              styles.label,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Type
          </Text>
          <Chip
            icon={typeInfo.name}
            style={[styles.typeChip, { backgroundColor: typeInfo.color + '15' }]}
            textStyle={{ color: typeInfo.color, fontWeight: '600' }}
          >
            {typeInfo.label}
          </Chip>
          {durationStr && (
            <Text
              variant="bodyMedium"
              style={[
                styles.duration,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Duration: {durationStr}
            </Text>
          )}
        </View>
      </ModalSection>

      {/* Contact */}
      {contact && (
        <ModalSection title="Contact">
          <View style={styles.contactRow}>
            <ContactAvatar contact={contact} size={40} />
            <Text
              variant="titleMedium"
              style={[
                styles.contactName,
                { color: theme.colors.onSurface },
              ]}
            >
              {getContactDisplayName(contact)}
            </Text>
          </View>
        </ModalSection>
      )}

      {/* Date & Time */}
      <ModalSection title="Date & Time">
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurface }}
        >
          {formatDateTime(interaction.interaction_datetime)}
        </Text>
      </ModalSection>

      {/* Notes */}
      {interaction.note && (
        <ModalSection title="Notes">
          <Text
            variant="bodyLarge"
            style={[styles.note, { color: theme.colors.onSurface }]}
          >
            {interaction.note}
          </Text>
        </ModalSection>
      )}

      {/* Metadata */}
      <ModalSection last>
        <Text
          variant="labelSmall"
          style={[
            styles.metadata,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Created:{' '}
          {new Date(interaction.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        {interaction.updated_at &&
          interaction.updated_at !== interaction.created_at && (
            <Text
              variant="labelSmall"
              style={[
                styles.metadata,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Updated:{' '}
              {new Date(interaction.updated_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          )}
      </ModalSection>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    margin: 0,
  },
  typeIconContainer: {
    borderRadius: 12,
    padding: 2,
    alignSelf: 'flex-start',
  },
  typeIcon: {
    margin: 0,
  },
  typeInfo: {
    gap: 8,
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  duration: {
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactName: {
    fontWeight: '500',
  },
  note: {
    lineHeight: 24,
  },
  metadata: {
    lineHeight: 18,
  },
});

// Memoize modal to prevent unnecessary re-renders
// Modal only needs to re-render when visibility, interaction, contact, or callbacks change
export default React.memo(InteractionDetailModal, (prevProps, nextProps) => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.interaction?.id === nextProps.interaction?.id &&
    prevProps.interaction?.updated_at === nextProps.interaction?.updated_at &&
    prevProps.contact?.id === nextProps.contact?.id
  );
});
