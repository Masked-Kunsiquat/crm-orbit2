import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Linking, Alert, Pressable } from 'react-native';
import { logger } from '../errors';
import { handleError, showAlert } from '../errors';
import {
  Appbar,
  Text,
  Surface,
  List,
  IconButton,
  Divider,
  FAB,
  Portal,
  Dialog,
  Button,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { fileService } from '../services/fileService';
import ContactAvatar from '../components/ContactAvatar';
import EditContactModal from '../components/EditContactModal';
import AddInteractionModal from '../components/AddInteractionModal';
import AddEventModal from '../components/AddEventModal';
import InteractionCard from '../components/InteractionCard';
import InteractionDetailModal from '../components/InteractionDetailModal';
import { useContact, useContactInteractions, useDeleteContact, useUpdateContact, useContactEvents } from '../hooks/queries';
import { compareDates, formatDateSmart, isFuture, isToday } from '../utils/dateUtils';

export default function ContactDetailScreen({ route, navigation }) {
  const { contactId } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const outlineColor = theme.colors?.outlineVariant || theme.colors?.outline || '#e0e0e0';

  // Use TanStack Query for contact and interactions data
  const { data: contact, isLoading: loading } = useContact(contactId);
  const { data: allInteractions = [] } = useContactInteractions(contactId);
  const { data: allEvents = [] } = useContactEvents(contactId);
  const deleteContactMutation = useDeleteContact();
  const updateContactMutation = useUpdateContact();

  // Get recent interactions (limit to 3)
  const recentInteractions = React.useMemo(() => {
    return allInteractions.slice(0, 3);
  }, [allInteractions]);

  // Get upcoming events (limit to 3, sorted by date) using proper local date handling
  const upcomingEvents = React.useMemo(() => {
    return allEvents
      .filter(event => isFuture(event.event_date) || isToday(event.event_date))
      .sort((a, b) => compareDates(a.event_date, b.event_date))
      .slice(0, 3);
  }, [allEvents]);

  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    const trimmed = phoneNumber.trim();
    // Preserve leading '+' for international numbers
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
  };

  const handleCall = async (phoneNumber) => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      showAlert.error('Invalid phone number');
      return;
    }
    const phoneUrl = `tel:${normalized}`;
    try {
      await Linking.openURL(phoneUrl);
    } catch (error) {
      showAlert.error('Unable to make phone call');
    }
  };

  const handleMessage = async (phoneNumber) => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      showAlert.error('Invalid phone number');
      return;
    }
    const smsUrl = `sms:${normalized}`;
    try {
      await Linking.openURL(smsUrl);
    } catch (error) {
      showAlert.error('Unable to send message');
    }
  };

  const handleEmail = async (emailAddress) => {
    const mailUrl = `mailto:${emailAddress}`;
    try {
      await Linking.openURL(mailUrl);
    } catch (error) {
      showAlert.error('Unable to open email');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleContactUpdated = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionAdded = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionUpdated = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionDeleted = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionPress = (interaction) => {
    // Regular tap - show detail modal
    setSelectedInteraction(interaction);
    setShowDetailModal(true);
  };

  const handleInteractionLongPress = (interaction) => {
    // Long press - open in edit mode
    setEditingInteraction(interaction);
    setShowAddInteractionModal(true);
  };

  const handleDetailEdit = () => {
    // User clicked edit from detail modal
    setEditingInteraction(selectedInteraction);
    setShowDetailModal(false);
    setShowAddInteractionModal(true);
  };

  const handleAddInteractionClick = () => {
    setEditingInteraction(null); // Clear editing mode
    setShowAddInteractionModal(true);
  };

  const handleModalDismiss = () => {
    setEditingInteraction(null);
    setShowAddInteractionModal(false);
  };

  const handleViewAllInteractions = () => {
    // Navigate to Interactions tab (would need to implement tab navigation focus)
    showAlert.info('Navigate to Interactions tab to see all interactions for this contact', 'View All');
  };

  const handleAddEventClick = () => {
    setEditingEvent(null);
    setShowAddEventModal(true);
  };

  const handleQuickAddBirthday = () => {
    // Pre-fill with birthday type
    const birthdayEvent = {
      contact_id: contactId,
      event_type: 'birthday',
      recurring: true,
      recurrence_pattern: 'yearly',
    };
    setEditingEvent(birthdayEvent);
    setShowAddEventModal(true);
  };

  const handleEventPress = (event) => {
    setEditingEvent(event);
    setShowAddEventModal(true);
  };

  const handleEventAdded = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleEventUpdated = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleEventDeleted = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleEventModalDismiss = () => {
    setEditingEvent(null);
    setShowAddEventModal(false);
  };

  const handleDelete = () => {
    const deleteContact = async () => {
      try {
        await deleteContactMutation.mutateAsync(contactId);
        navigation.goBack();
      } catch (error) {
        handleError(error, {
          component: 'ContactDetailScreen',
          operation: 'deleteContact',
          showAlert: true,
        });
      }
    };

    showAlert.confirmDelete(
      'Delete Contact',
      `Are you sure you want to delete ${contact.display_name || contact.first_name}?`,
      deleteContact
    );
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getEventIcon = (eventType) => {
    const icons = {
      birthday: 'cake-variant',
      anniversary: 'heart',
      meeting: 'calendar-account',
      deadline: 'clock-alert',
      other: 'calendar-star',
    };
    return icons[eventType] || 'calendar';
  };

  const pickImageFromLibrary = async () => {
    try {
      let ImagePicker;
      try {
        const imported = await import('expo-image-picker');
        ImagePicker = imported.default || imported;
      } catch (e) {
        showAlert.error('Missing dependency', 'Please install expo-image-picker to add photos.');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert.error('Permission required', 'Media library permission is required to select a photo.');
        return;
      }

      // Use modern array syntax for media types (v17+)
      const mediaTypes = ['images'];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets && result.assets[0];
      const uri = asset?.uri;
      if (!uri) return;

      // Save old avatar ID for cleanup after successful update
      const oldAvatarId = contact.avatar_attachment_id;

      // Save new avatar using fileService FIRST
      const fileName = asset.fileName || `avatar_${contactId}.jpg`;
      const newAttachment = await fileService.saveFile(
        uri,
        fileName,
        'contact',
        contactId
      );

      // Update contact with new avatar attachment ID - wrap in try/catch for rollback
      try {
        await updateContactMutation.mutateAsync({
          id: contactId,
          data: { avatar_attachment_id: newAttachment.id }
        });
        // TanStack Query will auto-refetch via invalidation in mutation's onSuccess
      } catch (mutationError) {
        // Rollback: delete the newly saved attachment since update failed
        try {
          await fileService.deleteFile(newAttachment.id);
        } catch (rollbackError) {
          logger.error('ContactDetailScreen', 'Failed to rollback orphaned attachment (now orphaned):', rollbackError);
          logger.error('ContactDetailScreen', 'Orphaned attachment ID:', newAttachment.id);
        }
        // Rethrow original mutation error so caller sees the failure
        throw mutationError;
      }

      // Only delete old avatar AFTER successful update
      if (oldAvatarId) {
        try {
          await fileService.deleteFile(oldAvatarId);
        } catch (cleanupError) {
          // Log but don't throw - old avatar is now orphaned but can be cleaned up later
          logger.warn('ContactDetailScreen', 'Failed to delete old avatar attachment', { oldAvatarId, error: cleanupError.message });
          
        }
      }

      setShowAvatarDialog(false);
    } catch (e) {
      logger.error('ContactDetailScreen', 'Image pick error', e);
      showAlert.error(t('contactDetail.errorImageSet'));
    }
  };

  const removePhoto = async () => {
    try {
      if (contact.avatar_attachment_id) {
        await fileService.deleteFile(contact.avatar_attachment_id);
      }
      await updateContactMutation.mutateAsync({
        id: contactId,
        data: { avatar_attachment_id: null }
      });
      setShowAvatarDialog(false);
    } catch (e) {
      logger.error('ContactDetailScreen', 'Remove photo error', e);
      showAlert.error(t('contactDetail.errorImageRemove'));
    }
  };

  if (loading || !contact) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('contactDetail.title')} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text>{t('contactDetail.loading')}</Text>
        </View>
      </View>
    );
  }

  const phones = (contact.contact_info || []).filter(info => info.type === 'phone');
  const emails = (contact.contact_info || []).filter(info => info.type === 'email');
  const companyName = contact.company?.name || contact.company_name;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="" />
        <Appbar.Action icon="pencil" onPress={handleEdit} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Header Section - iOS style */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Pressable onPress={() => setShowAvatarDialog(true)}>
            <ContactAvatar contact={contact} size={100} style={styles.avatar} />
          </Pressable>
          <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onSurface }]}>
            {contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
          </Text>
          {(contact.job_title || companyName) && (
            <Text
              variant="bodyMedium"
              style={[styles.company, { color: theme.colors.onSurfaceVariant || theme.colors.onSurface }]}
            >
              {contact.job_title && companyName
                ? `${contact.job_title} at ${companyName}`
                : (contact.job_title || companyName)}
            </Text>
          )}
        </View>

        {/* Quick Actions - Material Design style */}
        <View style={[styles.quickActions, { backgroundColor: theme.colors.surface, borderBottomColor: outlineColor }]}>
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="message-text"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleMessage(phones[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>{t('labels.text')}</Text>
            </View>
          )}
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="phone"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleCall(phones[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>{t('labels.call')}</Text>
            </View>
          )}
          {emails.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="email"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleEmail(emails[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>email</Text>
            </View>
          )}
        </View>

        {/* Phone Numbers Section - iOS grouped list style */}
        {phones.length > 0 && (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            {phones.map((phone, index) => (
              <View key={phone.id}>
                <List.Item
                  title={formatPhoneNumber(phone.value)}
                  description={phone.label}
                  left={props => <List.Icon {...props} icon="phone" />}
                  right={props => (
                    <View style={styles.itemActions}>
                      <IconButton
                        icon="message"
                        size={20}
                        onPress={() => handleMessage(phone.value)}
                      />
                      <IconButton
                        icon="phone"
                        size={20}
                        onPress={() => handleCall(phone.value)}
                      />
                    </View>
                  )}
                />
                {index < phones.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        )}

        {/* Email Addresses Section */}
        {emails.length > 0 && (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            {emails.map((email, index) => (
              <View key={email.id}>
                <List.Item
                  title={email.value}
                  description={email.label}
                  left={props => <List.Icon {...props} icon="email" />}
                  right={props => (
                    <IconButton
                      icon="email"
                      size={20}
                      onPress={() => handleEmail(email.value)}
                    />
                  )}
                />
                {index < emails.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        )}

        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            {t('contactDetail.events')}
          </Text>
          <View style={styles.eventHeaderButtons}>
            <Button
              mode="text"
              onPress={handleQuickAddBirthday}
              icon="cake-variant"
              compact
            >
              {t('contactDetail.addBirthday')}
            </Button>
            <Button
              mode="text"
              onPress={handleAddEventClick}
              icon="plus"
              compact
            >
              {t('contactDetail.addEvent')}
            </Button>
          </View>
        </View>

        {upcomingEvents.length > 0 ? (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            {upcomingEvents.map((event, index) => (
              <View key={event.id}>
                <List.Item
                  title={event.title}
                  description={`${formatDateSmart(event.event_date, t)}${event.recurring ? ' • Recurring' : ''}`}
                  left={props => <List.Icon {...props} icon={getEventIcon(event.event_type)} />}
                  onPress={() => handleEventPress(event)}
                />
                {index < upcomingEvents.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        ) : (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <List.Item
              title={t('contactDetail.noEvents')}
              description={t('contactDetail.noEventsDescription')}
              left={props => <List.Icon {...props} icon="calendar-blank" />}
              onPress={handleAddEventClick}
            />
          </Surface>
        )}

        {/* Recent Interactions Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            {t('contactDetail.recent')}
          </Text>
          <Button
            mode="text"
            onPress={handleAddInteractionClick}
            icon="plus"
            compact
          >
            {t('contactDetail.add')}
          </Button>
        </View>

        {recentInteractions.length > 0 ? (
          <View style={styles.interactionsContainer}>
            {recentInteractions.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                contact={contact}
                onPress={() => handleInteractionPress(interaction)}
                onLongPress={() => handleInteractionLongPress(interaction)}
              />
            ))}
            {recentInteractions.length >= 3 && (
              <Button
                mode="text"
                onPress={handleViewAllInteractions}
                style={styles.viewAllButton}
              >
                View All Interactions
              </Button>
            )}
          </View>
        ) : (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <List.Item
              title="No interactions yet"
              description="Add your first interaction with this contact"
              left={props => <List.Icon {...props} icon="history" />}
              onPress={handleAddInteractionClick}
            />
          </Surface>
        )}

        {/* Delete Button - iOS style at bottom */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <List.Item
            title={t('contactDetail.delete')}
            titleStyle={[styles.deleteText, { color: theme.colors.error }]}
            onPress={handleDelete}
          />
        </Surface>

        <View style={styles.spacer} />
      </ScrollView>

      <EditContactModal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        contact={contact}
        onContactUpdated={handleContactUpdated}
      />

      <InteractionDetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        interaction={selectedInteraction}
        contact={contact}
        onEdit={handleDetailEdit}
      />

      <AddInteractionModal
        visible={showAddInteractionModal}
        onDismiss={handleModalDismiss}
        onInteractionAdded={handleInteractionAdded}
        onInteractionUpdated={handleInteractionUpdated}
        onInteractionDeleted={handleInteractionDeleted}
        preselectedContactId={contactId}
        editingInteraction={editingInteraction}
      />

      <AddEventModal
        visible={showAddEventModal}
        onDismiss={handleEventModalDismiss}
        onEventAdded={handleEventAdded}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
        preselectedContactId={contactId}
        editingEvent={editingEvent}
      />

      <Portal>
        <Dialog visible={showAvatarDialog} onDismiss={() => setShowAvatarDialog(false)}>
          <Dialog.Title>Contact Photo</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Add or remove a profile picture.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {contact?.avatar_attachment_id ? (
              <Button onPress={removePhoto} textColor="#d32f2f">{t('contactDetail.remove')}</Button>
            ) : null}
            <Button onPress={pickImageFromLibrary}>Add Photo</Button>
            <Button onPress={() => setShowAvatarDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#1976d2',
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#212121',
  },
  company: {
    color: '#757575',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    color: '#1976d2',
    fontWeight: '500',
  },
  section: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  eventHeaderButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  interactionsContainer: {
    marginTop: 8,
  },
  viewAllButton: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  spacer: {
    height: 40,
  },
});
