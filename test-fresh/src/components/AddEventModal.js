import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import {
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Menu,
  Divider,
  Switch,
  useTheme,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { contactsDB } from '../database';
import {
  useCreateEvent,
  useCreateEventWithReminders,
  useUpdateEvent,
  useUpdateEventReminders,
  useDeleteEvent,
  useContacts,
  useEventReminders,
} from '../hooks/queries';
import { parseFlexibleDate, formatDateToString } from '../utils/dateUtils';

const EVENT_TYPES = [
  { value: 'birthday', icon: 'cake-variant' },
  { value: 'anniversary', icon: 'heart' },
  { value: 'meeting', icon: 'calendar-account' },
  { value: 'deadline', icon: 'clock-alert' },
  { value: 'other', icon: 'calendar-star' },
];

const REMINDER_TEMPLATES = [
  { label: '15 minutes before', minutes: 15 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
  { label: '1 week before', minutes: 10080 },
];

export default function AddEventModal({
  visible,
  onDismiss,
  onEventAdded,
  onEventUpdated,
  onEventDeleted,
  preselectedContactId,
  editingEvent,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isEditMode = !!editingEvent;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [eventType, setEventType] = useState('birthday');
  const [selectedContactId, setSelectedContactId] = useState(preselectedContactId || null);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminders, setReminders] = useState([]);

  // Use TanStack Query hooks
  const { data: contacts = [] } = useContacts();
  const { data: fetchedReminders = [] } = useEventReminders(
    editingEvent?.id,
    { enabled: !!editingEvent?.id && visible }
  );
  const createEventMutation = useCreateEvent();
  const createEventWithRemindersMutation = useCreateEventWithReminders();
  const updateEventMutation = useUpdateEvent();
  const updateEventRemindersMutation = useUpdateEventReminders();
  const deleteEventMutation = useDeleteEvent();

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        // Populate form with existing event data
        setTitle(editingEvent.title || '');
        setNotes(editingEvent.notes || '');
        setEventType(editingEvent.event_type || 'birthday');
        setSelectedContactId(editingEvent.contact_id);
        // Use parseFlexibleDate to handle YYYY-MM-DD strings correctly, fallback to current date
        setEventDate(parseFlexibleDate(editingEvent.event_date) || new Date());
        setIsRecurring(editingEvent.recurring || false);

        // Load reminders from fetched data
        // Convert database format to component format
        const loadedReminders = (fetchedReminders || []).map(dbReminder => ({
          minutes: 0, // This will be recalculated if needed
          datetime: new Date(dbReminder.reminder_datetime),
        }));
        setReminders(loadedReminders);
      } else {
        // New event - set defaults
        if (preselectedContactId) {
          setSelectedContactId(preselectedContactId);
        }
        setEventDate(new Date());
        setIsRecurring(false);
        setReminders([]); // Clear reminders for new events
      }
    }
  }, [visible, preselectedContactId, editingEvent, fetchedReminders]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setEventType('birthday');
    if (!preselectedContactId) {
      setSelectedContactId(null);
    }
    setEventDate(new Date());
    setIsRecurring(false);
    setReminders([]);
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
  };

  const handleDelete = () => {
    if (!isEditMode || !editingEvent) return;

    Alert.alert(
      t('addEvent.delete.title'),
      t('addEvent.delete.message'),
      [
        { text: t('addEvent.delete.cancel'), style: 'cancel' },
        {
          text: t('addEvent.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventMutation.mutateAsync(editingEvent.id);
              Alert.alert(t('addEvent.success.deleted'), '');
              resetForm();
              onDismiss();
              if (onEventDeleted) onEventDeleted();
            } catch (error) {
              console.error('Delete event error:', error);
              Alert.alert(t('addEvent.errors.deleteFailed'), '');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert(t('addEvent.errors.titleRequired'), '');
      return;
    }

    if (!selectedContactId) {
      Alert.alert(t('addEvent.errors.contactRequired'), '');
      return;
    }

    try {
      const eventData = {
        contact_id: selectedContactId,
        title: title.trim(),
        event_type: eventType,
        event_date: formatDateToString(eventDate), // YYYY-MM-DD format using local date
        recurring: isRecurring ? 1 : 0,
        recurrence_pattern: isRecurring && eventType === 'birthday' ? 'yearly' : null,
        notes: notes.trim() || null,
      };

      if (isEditMode) {
        // Update event
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: eventData,
        });

        // Update reminders (replaces all existing)
        if (reminders.length > 0) {
          const formattedReminders = reminders.map(reminder => ({
            reminder_datetime: reminder.datetime,
            reminder_type: 'notification',
            is_sent: false,
          }));
          await updateEventRemindersMutation.mutateAsync({
            eventId: editingEvent.id,
            reminders: formattedReminders,
          });
        } else {
          // If no reminders, clear all existing
          await updateEventRemindersMutation.mutateAsync({
            eventId: editingEvent.id,
            reminders: [],
          });
        }

        Alert.alert(t('addEvent.success.updated'), '');
        if (onEventUpdated) onEventUpdated();
      } else {
        // Create event with or without reminders
        if (reminders.length > 0) {
          // Format reminders for database
          const formattedReminders = reminders.map(reminder => ({
            reminder_datetime: reminder.datetime,
            reminder_type: 'notification',
            is_sent: false,
          }));

          await createEventWithRemindersMutation.mutateAsync({
            eventData,
            reminders: formattedReminders,
          });
        } else {
          // No reminders, just create the event
          await createEventMutation.mutateAsync(eventData);
        }

        Alert.alert(t('addEvent.success.added'), '');
        if (onEventAdded) onEventAdded();
      }

      resetForm();
      onDismiss();
    } catch (error) {
      console.error('Save event error:', error);
      Alert.alert(t('addEvent.errors.saveFailed'), '');
    }
  };

  const handleQuickFill = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    const contactName = contact.display_name || `${contact.first_name} ${contact.last_name || ''}`.trim();
    const quickTitle = t(`addEvent.quickTitles.${eventType}`, { name: contactName });
    setTitle(quickTitle);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const addReminder = (minutesBefore) => {
    const reminderTime = new Date(eventDate);

    // For all-day events (birthdays, anniversaries), set reminder at 9 AM on the calculated day
    // instead of midnight minus minutes, which creates unintuitive times like 23:45 previous day
    if (['birthday', 'anniversary'].includes(eventType)) {
      reminderTime.setHours(9, 0, 0, 0);
      // Calculate days before (e.g., 1440 minutes = 1 day)
      const daysBefore = Math.floor(minutesBefore / 1440);
      reminderTime.setDate(reminderTime.getDate() - daysBefore);
    } else {
      // For timed events (meetings, deadlines), subtract minutes directly
      reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);
    }

    const newReminder = {
      minutes: minutesBefore,
      datetime: reminderTime,
    };

    setReminders([...reminders, newReminder]);
  };

  const removeReminder = (index) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.surface}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall">
              {isEditMode ? t('addEvent.titleEdit') : t('addEvent.titleAdd')}
            </Text>
            <IconButton icon="close" onPress={handleCancel} />
          </View>

          <ScrollView style={styles.scrollView}>
            {/* Contact Selection */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('addEvent.sections.contact')}
              </Text>
              <Menu
                visible={contactMenuVisible}
                onDismiss={() => setContactMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setContactMenuVisible(true)}
                    icon="account"
                    style={styles.contactButton}
                  >
                    {selectedContact
                      ? selectedContact.display_name || `${selectedContact.first_name} ${selectedContact.last_name || ''}`
                      : t('addEvent.labels.selectContact')}
                  </Button>
                }
              >
                <ScrollView style={styles.contactMenu}>
                  {contacts.map((contact) => (
                    <Menu.Item
                      key={contact.id}
                      onPress={() => {
                        setSelectedContactId(contact.id);
                        setContactMenuVisible(false);
                      }}
                      title={contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
                    />
                  ))}
                </ScrollView>
              </Menu>
            </View>

            {/* Event Type */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('addEvent.sections.type')}
              </Text>
              <View style={styles.typeChips}>
                {EVENT_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    selected={eventType === type.value}
                    onPress={() => {
                      setEventType(type.value);
                      // Auto-enable recurring for birthdays
                      if (type.value === 'birthday') {
                        setIsRecurring(true);
                      }
                    }}
                    icon={type.icon}
                    style={styles.typeChip}
                  >
                    {t(`addEvent.types.${type.value}`)}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Date Picker */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('addEvent.sections.date')}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                icon="calendar"
                style={styles.dateButton}
              >
                {eventDate.toLocaleDateString()}
              </Button>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Recurring Toggle */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View>
                  <Text variant="labelLarge">{t('addEvent.labels.recurring')}</Text>
                  <Text variant="bodySmall" style={styles.helperText}>
                    {t('addEvent.labels.recurringHelper')}
                  </Text>
                </View>
                <Switch value={isRecurring} onValueChange={setIsRecurring} />
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <View style={styles.titleRow}>
                <Text variant="labelLarge" style={styles.sectionLabel}>
                  {t('addEvent.sections.title')}
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={handleQuickFill}
                  disabled={!selectedContactId}
                >
                  {t('addEvent.labels.quickFill')}
                </Button>
              </View>
              <TextInput
                mode="outlined"
                value={title}
                onChangeText={setTitle}
                placeholder={t('addEvent.labels.titlePlaceholder')}
                style={styles.input}
              />
            </View>

            {/* Reminders */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('addEvent.sections.reminders')}
              </Text>
              <View style={styles.reminderTemplates}>
                {REMINDER_TEMPLATES.map((template, index) => (
                  <Chip
                    key={index}
                    icon="bell-plus"
                    onPress={() => addReminder(template.minutes)}
                    style={styles.reminderChip}
                    compact
                  >
                    {t(`addEvent.reminderTemplates.${template.minutes}`)}
                  </Chip>
                ))}
              </View>
              {reminders.length > 0 && (
                <View style={styles.remindersList}>
                  {reminders.map((reminder, index) => (
                    <View key={index} style={styles.reminderItem}>
                      <Text variant="bodyMedium">
                        {reminder.datetime.toLocaleString()}
                      </Text>
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => removeReminder(index)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('addEvent.sections.notes')}
              </Text>
              <TextInput
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                placeholder={t('addEvent.labels.notesPlaceholder')}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
            {isEditMode && (
              <Button
                mode="text"
                onPress={handleDelete}
                textColor="#d32f2f"
                style={styles.deleteButton}
              >
                {t('addEvent.labels.delete')}
              </Button>
            )}
            <View style={styles.footerButtons}>
              <Button mode="outlined" onPress={handleCancel} style={styles.cancelButton}>
                {t('addEvent.labels.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                loading={
                  createEventMutation.isPending ||
                  createEventWithRemindersMutation.isPending ||
                  updateEventMutation.isPending ||
                  updateEventRemindersMutation.isPending
                }
              >
                {isEditMode ? t('addEvent.labels.update') : t('addEvent.labels.save')}
              </Button>
            </View>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '90%',
  },
  surface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollView: {
    maxHeight: 500,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  contactButton: {
    justifyContent: 'flex-start',
  },
  contactMenu: {
    maxHeight: 300,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    marginRight: 0,
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderTemplates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reminderChip: {
    marginRight: 0,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
