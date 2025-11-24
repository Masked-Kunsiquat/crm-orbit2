import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Linking,
  Alert,
  Pressable,
} from 'react-native';
import { logger, handleError, showAlert } from '../errors';

import { safeTrim } from '../utils/stringHelpers';
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
  SegmentedButtons,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { fileService } from '../services/fileService';
import ContactAvatar from '../components/ContactAvatar';
import ScoreBadge from '../components/ScoreBadge';
import EditContactModal from '../components/EditContactModal';
import AddInteractionModal from '../components/AddInteractionModal';
import AddEventModal from '../components/AddEventModal';
import InteractionCard from '../components/InteractionCard';
import InteractionDetailModal from '../components/InteractionDetailModal';
import {
  useContact,
  useContactInteractions,
  useDeleteContact,
  useUpdateContact,
  useContactEvents,
} from '../hooks/queries';
import { useProximityScores } from '../hooks/queries/useProximityQueries';
import {
  compareDates,
  formatDateSmart,
  isFuture,
  isToday,
  isPast,
} from '../utils/dateUtils';
import {
  getContactDisplayName,
  normalizePhoneNumber as normalizePhone,
  formatPhoneNumber as formatPhone,
} from '../utils/contactHelpers';
import { requestPermission } from '../utils/permissionHelpers';

export default function ContactDetailScreen({ route, navigation }) {
  const { contactId } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const outlineColor =
    theme.colors?.outlineVariant || theme.colors?.outline || '#e0e0e0';

  // Use TanStack Query for contact and interactions data
  const { data: contact, isLoading: loading } = useContact(contactId);
  const { data: allInteractions = [] } = useContactInteractions(contactId);
  const { data: allEvents = [] } = useContactEvents(contactId);
  const { data: proximityScores = [] } = useProximityScores();
  const deleteContactMutation = useDeleteContact();
  const updateContactMutation = useUpdateContact();

  // Get proximity score for this contact
  const proximityScore = React.useMemo(() => {
    if (!proximityScores || !Array.isArray(proximityScores)) {
      return 0;
    }
    const contactScore = proximityScores.find(c => c.id === contactId);
    return contactScore?.proximityScore || 0;
  }, [proximityScores, contactId]);

  // Create unified activity timeline (Events + Interactions combined)
  const activityTimeline = React.useMemo(() => {
    const timeline = [];

    // Add events with type marker
    allEvents.forEach(event => {
      timeline.push({
        ...event,
        _type: 'event',
        _date: event.event_date,
        _timestamp: new Date(event.event_date).getTime(),
      });
    });

    // Add interactions with type marker
    allInteractions.forEach(interaction => {
      timeline.push({
        ...interaction,
        _type: 'interaction',
        _date: interaction.interaction_datetime?.split('T')[0] || interaction.interaction_datetime,
        _timestamp: new Date(interaction.interaction_datetime).getTime(),
      });
    });

    // Sort by timestamp (most recent first)
    return timeline.sort((a, b) => b._timestamp - a._timestamp);
  }, [allEvents, allInteractions]);

  // Separate upcoming and past activities
  const upcomingActivities = React.useMemo(() => {
    return activityTimeline
      .filter(item => isFuture(item._date) || isToday(item._date))
      .sort((a, b) => a._timestamp - b._timestamp); // Upcoming: oldest first
  }, [activityTimeline]);

  const pastActivities = React.useMemo(() => {
    return activityTimeline
      .filter(item => isPast(item._date))
      .sort((a, b) => b._timestamp - a._timestamp); // Past: most recent first
  }, [activityTimeline]);

  const normalizePhoneNumber = phoneNumber => {
    if (!phoneNumber) return '';
    const trimmed = safeTrim(phoneNumber);
    // Preserve leading '+' for international numbers
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = normalizePhone(trimmed);
    if (!digitsOnly) return '';
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
  };

  const handleCall = async phoneNumber => {
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

  const handleMessage = async phoneNumber => {
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

  const handleEmail = async emailAddress => {
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

  const handleInteractionPress = interaction => {
    // Regular tap - show detail modal
    setSelectedInteraction(interaction);
    setShowDetailModal(true);
  };

  const handleInteractionLongPress = interaction => {
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

  const handleEventPress = event => {
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

  const getEventIcon = eventType => {
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
        showAlert.error(
          'Missing dependency',
          'Please install expo-image-picker to add photos.'
        );
        return;
      }

      const granted = await requestPermission(
        ImagePicker.requestMediaLibraryPermissionsAsync,
        'Media library',
        'Media library permission is required to select a photo.'
      );
      if (!granted) return;

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
          data: { avatar_attachment_id: newAttachment.id },
        });
        // TanStack Query will auto-refetch via invalidation in mutation's onSuccess
      } catch (mutationError) {
        // Rollback: delete the newly saved attachment since update failed
        try {
          await fileService.deleteFile(newAttachment.id);
        } catch (rollbackError) {
          logger.error(
            'ContactDetailScreen',
            'Failed to rollback orphaned attachment (now orphaned):',
            rollbackError
          );
          logger.error(
            'ContactDetailScreen',
            'Orphaned attachment ID:',
            newAttachment.id
          );
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
          logger.warn(
            'ContactDetailScreen',
            'Failed to delete old avatar attachment',
            { oldAvatarId, error: cleanupError.message }
          );
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
        data: { avatar_attachment_id: null },
      });
      setShowAvatarDialog(false);
    } catch (e) {
      logger.error('ContactDetailScreen', 'Remove photo error', e);
      showAlert.error(t('contactDetail.errorImageRemove'));
    }
  };

  if (loading || !contact) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('contactDetail.title')} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text>{t('contactDetail.loading')}</Text>
        </View>
      </View>
    );
  }

  const phones = (contact.contact_info || []).filter(
    info => info.type === 'phone'
  );
  const emails = (contact.contact_info || []).filter(
    info => info.type === 'email'
  );
  const companyName = contact.company?.name || contact.company_name;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="" />
        <Appbar.Action icon="pencil" onPress={handleEdit} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Header Section - iOS style */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
        >
          <Pressable onPress={() => setShowAvatarDialog(true)}>
            <View style={styles.avatarContainer}>
              <ContactAvatar contact={contact} size={100} style={styles.avatar} />
              {proximityScore > 0 && (
                <ScoreBadge score={proximityScore} size="medium" style={styles.scoreBadge} />
              )}
            </View>
          </Pressable>
          <Text
            variant="headlineMedium"
            style={[styles.name, { color: theme.colors.onSurface }]}
          >
            {getContactDisplayName(contact)}
          </Text>
          {(contact.job_title || companyName) && (
            <Text
              variant="bodyMedium"
              style={[
                styles.company,
                {
                  color:
                    theme.colors.onSurfaceVariant || theme.colors.onSurface,
                },
              ]}
            >
              {contact.job_title && companyName
                ? `${contact.job_title} at ${companyName}`
                : contact.job_title || companyName}
            </Text>
          )}
        </View>

        {/* Segmented Tabs - Material Design 3 */}
        <View style={styles.tabsContainer}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              {
                value: 'info',
                label: t('contactDetail.tabs.info'),
                icon: 'account-details',
              },
              {
                value: 'activity',
                label: t('contactDetail.tabs.activity'),
                icon: 'history',
                badge: activityTimeline.length > 0 ? activityTimeline.length : undefined,
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <View>
            {/* Quick Actions - Material Design style */}
            <View
              style={[
                styles.quickActions,
                {
                  backgroundColor: theme.colors.surface,
                  borderBottomColor: outlineColor,
                },
              ]}
            >
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
                  <Text
                    variant="labelSmall"
                    style={[styles.actionLabel, { color: theme.colors.primary }]}
                  >
                    {t('labels.text')}
                  </Text>
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
                  <Text
                    variant="labelSmall"
                    style={[styles.actionLabel, { color: theme.colors.primary }]}
                  >
                    {t('labels.call')}
                  </Text>
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
                  <Text
                    variant="labelSmall"
                    style={[styles.actionLabel, { color: theme.colors.primary }]}
                  >
                    email
                  </Text>
                </View>
              )}
            </View>

            {/* Phone Numbers Section */}
            {phones.length > 0 && (
              <Surface
                style={[styles.section, { backgroundColor: theme.colors.surface }]}
                elevation={0}
              >
                {phones.map((phone, index) => (
                  <View key={phone.id}>
                    <List.Item
                      title={formatPhone(phone.value)}
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
              <Surface
                style={[styles.section, { backgroundColor: theme.colors.surface }]}
                elevation={0}
              >
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

            {/* Delete Button */}
            <Surface
              style={[styles.section, { backgroundColor: theme.colors.surface }]}
              elevation={0}
            >
              <List.Item
                title={t('contactDetail.delete')}
                titleStyle={[styles.deleteText, { color: theme.colors.error }]}
                onPress={handleDelete}
              />
            </Surface>
          </View>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <View>
            {/* Action Buttons */}
            <View style={styles.activityActions}>
              <Button
                mode="outlined"
                onPress={handleAddInteractionClick}
                icon="plus"
                style={styles.activityButton}
              >
                {t('contactDetail.addInteraction')}
              </Button>
              <Button
                mode="outlined"
                onPress={handleAddEventClick}
                icon="calendar-plus"
                style={styles.activityButton}
              >
                {t('contactDetail.addEvent')}
              </Button>
              <Button
                mode="text"
                onPress={handleQuickAddBirthday}
                icon="cake-variant"
                compact
              >
                {t('contactDetail.addBirthday')}
              </Button>
            </View>

            {/* Upcoming Activities */}
            {upcomingActivities.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text
                    variant="titleMedium"
                    style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
                  >
                    {t('contactDetail.upcoming')}
                  </Text>
                </View>
                <Surface
                  style={[styles.section, { backgroundColor: theme.colors.surface }]}
                  elevation={0}
                >
                  {upcomingActivities.map((item, index) => (
                    <View key={`${item._type}-${item.id}`}>
                      {item._type === 'event' ? (
                        <List.Item
                          title={item.title}
                          description={`${formatDateSmart(item.event_date, t)}${item.recurring ? ` • ${t('contactDetail.recurring')}` : ''}`}
                          left={props => (
                            <List.Icon
                              {...props}
                              icon={getEventIcon(item.event_type)}
                            />
                          )}
                          onPress={() => handleEventPress(item)}
                        />
                      ) : (
                        <InteractionCard
                          interaction={item}
                          contact={contact}
                          onPress={() => handleInteractionPress(item)}
                          onLongPress={() => handleInteractionLongPress(item)}
                        />
                      )}
                      {index < upcomingActivities.length - 1 && <Divider />}
                    </View>
                  ))}
                </Surface>
              </>
            )}

            {/* Past Activities */}
            {pastActivities.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text
                    variant="titleMedium"
                    style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
                  >
                    {t('contactDetail.pastActivity')}
                  </Text>
                </View>
                <Surface
                  style={[styles.section, { backgroundColor: theme.colors.surface }]}
                  elevation={0}
                >
                  {pastActivities.slice(0, 10).map((item, index) => (
                    <View key={`${item._type}-${item.id}`}>
                      {item._type === 'event' ? (
                        <List.Item
                          title={item.title}
                          description={`${formatDateSmart(item.event_date, t)}${item.recurring ? ` • ${t('contactDetail.recurring')}` : ''}`}
                          left={props => (
                            <List.Icon
                              {...props}
                              icon={getEventIcon(item.event_type)}
                            />
                          )}
                          onPress={() => handleEventPress(item)}
                        />
                      ) : (
                        <InteractionCard
                          interaction={item}
                          contact={contact}
                          onPress={() => handleInteractionPress(item)}
                          onLongPress={() => handleInteractionLongPress(item)}
                        />
                      )}
                      {index < pastActivities.slice(0, 10).length - 1 && <Divider />}
                    </View>
                  ))}
                  {pastActivities.length > 10 && (
                    <List.Item
                      title={t('contactDetail.viewMore', { count: pastActivities.length - 10 })}
                      left={props => <List.Icon {...props} icon="dots-horizontal" />}
                      onPress={() => {
                        // Future: Navigate to full activity view
                        showAlert.info(t('contactDetail.viewMoreInfo'));
                      }}
                    />
                  )}
                </Surface>
              </>
            )}

            {/* Empty State */}
            {activityTimeline.length === 0 && (
              <Surface
                style={[styles.section, { backgroundColor: theme.colors.surface }]}
                elevation={0}
              >
                <List.Item
                  title={t('contactDetail.noActivity')}
                  description={t('contactDetail.noActivityDescription')}
                  left={props => <List.Icon {...props} icon="history" />}
                />
              </Surface>
            )}
          </View>
        )}

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
        <Dialog
          visible={showAvatarDialog}
          onDismiss={() => setShowAvatarDialog(false)}
        >
          <Dialog.Title>Contact Photo</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Add or remove a profile picture.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {contact?.avatar_attachment_id ? (
              <Button onPress={removePhoto} textColor="#d32f2f">
                {t('contactDetail.remove')}
              </Button>
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
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    // Avatar styling handled by ContactAvatar component
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontWeight: '500',
  },
  section: {
    marginTop: 12,
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
  activityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityButton: {
    flex: 1,
    minWidth: 120,
  },
  spacer: {
    height: 40,
  },
});
