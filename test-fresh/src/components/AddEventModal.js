import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Menu,
  Switch,
  useTheme,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import {
  useCreateEvent,
  useCreateEventWithReminders,
  useUpdateEvent,
  useUpdateEventReminders,
  useDeleteEvent,
  useContacts,
  useEventReminders,
} from '../hooks/queries';
import {
  parseFlexibleDate,
  formatDateToString,
  formatDateSmart,
  formatDateAndTime,
  getPrimaryLocale,
} from '../utils/dateUtils';
import { handleError, showAlert } from '../errors';
import { safeTrim, hasContent } from '../utils/stringHelpers';
import { getContactDisplayName } from '../utils/contactHelpers';

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

function AddEventModal({
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
  const locale = getPrimaryLocale();
  const isEditMode = Boolean(editingEvent && editingEvent.id);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [eventType, setEventType] = useState('birthday');
  const [selectedContactId, setSelectedContactId] = useState(
    preselectedContactId || null
  );
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminders, setReminders] = useState([]);

  // Use a ref to track if we've initialized reminders for the current editing session
  const remindersInitializedRef = useRef(false);

  // Use TanStack Query hooks
  const { data: contacts = [] } = useContacts();
  const { data: fetchedReminders = [] } = useEventReminders(editingEvent?.id, {
    enabled: !!editingEvent?.id && visible,
  });
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

        // Load reminders from fetched data only once when modal opens or editingEvent changes
        // Don't reload on subsequent refetches to avoid overwriting user's in-progress edits
        if (!remindersInitializedRef.current && fetchedReminders.length > 0) {
          const loadedReminders = fetchedReminders.map(dbReminder => ({
            minutes: 0, // This will be recalculated if needed
            datetime: new Date(dbReminder.reminder_datetime),
          }));
          setReminders(loadedReminders);
          remindersInitializedRef.current = true;
        }
      } else {
        // New event - set defaults
        if (preselectedContactId) {
          setSelectedContactId(preselectedContactId);
        }
        setEventDate(new Date());
        setIsRecurring(false);
        setReminders([]); // Clear reminders for new events
        remindersInitializedRef.current = false; // Reset for next edit session
      }
    } else {
      // Modal closed - reset initialization flag
      remindersInitializedRef.current = false;
    }
  }, [visible, preselectedContactId, editingEvent]);

  // Separate effect to load reminders when they arrive from the query
  // This handles the case where fetchedReminders loads after the modal opens
  useEffect(() => {
    if (
      visible &&
      editingEvent &&
      !remindersInitializedRef.current &&
      fetchedReminders.length > 0
    ) {
      const loadedReminders = fetchedReminders.map(dbReminder => ({
        minutes: 0,
        datetime: new Date(dbReminder.reminder_datetime),
      }));
      setReminders(loadedReminders);
      remindersInitializedRef.current = true;
    }
  }, [fetchedReminders, visible, editingEvent]);

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

    showAlert.confirmDelete(
      t('addEvent.delete.title'),
      t('addEvent.delete.message'),
      async () => {
        try {
          await deleteEventMutation.mutateAsync(editingEvent.id);
          showAlert.success(t('addEvent.success.deleted'), '');
          resetForm();
          onDismiss();
          if (onEventDeleted) onEventDeleted();
        } catch (error) {
          handleError(error, {
            component: 'AddEventModal',
            operation: 'handleDelete',
            showAlert: true,
          });
        }
      }
    );
  };

  const formatRemindersForDB = reminders =>
    reminders.map(reminder => ({
      reminder_datetime: reminder.datetime,
      reminder_type: 'notification',
      is_sent: false,
    }));

  const handleSave = async () => {
    // Validation
    if (!hasContent(title)) {
      showAlert.error(t('addEvent.errors.titleRequired'), '');
      return;
    }

    if (!selectedContactId) {
      showAlert.error(t('addEvent.errors.contactRequired'), '');
      return;
    }

    try {
      const eventData = {
        contact_id: selectedContactId,
        title: safeTrim(title),
        event_type: eventType,
        event_date: formatDateToString(eventDate), // YYYY-MM-DD format using local date
        recurring: isRecurring ? 1 : 0,
        recurrence_pattern:
          isRecurring && ['birthday', 'anniversary'].includes(eventType)
            ? 'yearly'
            : null,
        notes: safeTrim(notes) || null,
      };

      if (isEditMode) {
        // Update event
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: eventData,
        });

        // Update reminders (replaces all existing)
        if (reminders.length > 0) {
          const formattedReminders = formatRemindersForDB(reminders);
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

        showAlert.success(t('addEvent.success.updated'), '');
        if (onEventUpdated) onEventUpdated();
      } else {
        // Create event with or without reminders
        if (reminders.length > 0) {
          const formattedReminders = formatRemindersForDB(reminders);

          await createEventWithRemindersMutation.mutateAsync({
            eventData,
            reminders: formattedReminders,
          });
        } else {
          // No reminders, just create the event
          await createEventMutation.mutateAsync(eventData);
        }

        showAlert.success(t('addEvent.success.added'), '');
        if (onEventAdded) onEventAdded();
      }

      resetForm();
      onDismiss();
    } catch (error) {
      handleError(error, {
        component: 'AddEventModal',
        operation: 'handleSave',
        showAlert: true,
      });
    }
  };

  const handleQuickFill = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    const contactName = getContactDisplayName(contact, 'Unknown');
    const quickTitle = t(`addEvent.quickTitles.${eventType}`, {
      name: contactName,
    });
    setTitle(quickTitle);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const addReminder = minutesBefore => {
    const reminderTime = new Date(eventDate);

    // Treat all events as all-day events: set reminder at 9 AM and shift by whole days
    // This avoids unintuitive previous-day times like 23:45 when subtracting from midnight
    reminderTime.setHours(9, 0, 0, 0);
    const daysBefore = Math.floor(minutesBefore / 1440);
    reminderTime.setDate(reminderTime.getDate() - daysBefore);

    const newReminder = {
      minutes: minutesBefore,
      datetime: reminderTime,
    };

    setReminders([...reminders, newReminder]);
  };

  const removeReminder = index => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const isSaving =
    createEventMutation.isPending ||
    createEventWithRemindersMutation.isPending ||
    updateEventMutation.isPending ||
    updateEventRemindersMutation.isPending;

  return (
    <>
      <BaseModal
        visible={visible}
        onDismiss={handleCancel}
        title={isEditMode ? t('addEvent.titleEdit') : t('addEvent.titleAdd')}
        headerRight={
          <View style={styles.headerActions}>
            {isEditMode && (
              <IconButton
                icon="delete"
                size={22}
                onPress={handleDelete}
                iconColor="#d32f2f"
                style={styles.iconButton}
              />
            )}
            <IconButton
              icon="close"
              size={22}
              onPress={handleCancel}
              style={styles.iconButton}
            />
          </View>
        }
        actions={[
          {
            label: t('addEvent.labels.cancel'),
            onPress: handleCancel,
            mode: 'outlined',
            disabled: isSaving,
          },
          {
            label: isEditMode
              ? t('addEvent.labels.update')
              : t('addEvent.labels.save'),
            onPress: handleSave,
            mode: 'contained',
            loading: isSaving,
          },
        ]}
        maxHeight={0.92}
      >
        {/* Contact Selection */}
        <ModalSection title={t('addEvent.sections.contact')}>
          <Menu
            visible={contactMenuVisible}
            onDismiss={() => setContactMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setContactMenuVisible(true)}
                icon="account"
                style={styles.contactButton}
                contentStyle={styles.contactButtonContent}
              >
                {selectedContact
                  ? getContactDisplayName(selectedContact)
                  : t('addEvent.labels.selectContact')}
              </Button>
            }
            contentStyle={styles.contactMenu}
          >
            {contacts.map(contact => (
              <Menu.Item
                key={contact.id}
                onPress={() => {
                  setSelectedContactId(contact.id);
                  setContactMenuVisible(false);
                }}
                title={getContactDisplayName(contact)}
              />
            ))}
          </Menu>
        </ModalSection>

        {/* Event Type */}
        <ModalSection title={t('addEvent.sections.type')}>
          <View style={styles.typeChips}>
            {EVENT_TYPES.map(type => (
              <Chip
                key={type.value}
                selected={eventType === type.value}
                onPress={() => {
                  setEventType(type.value);
                  // Auto-enable recurring for birthdays and anniversaries
                  // Disable recurring for other types (meetings, deadlines, other)
                  if (['birthday', 'anniversary'].includes(type.value)) {
                    setIsRecurring(true);
                  } else {
                    setIsRecurring(false);
                  }
                }}
                icon={type.icon}
                style={styles.typeChip}
                mode="flat"
              >
                {t(`addEvent.types.${type.value}`)}
              </Chip>
            ))}
          </View>
        </ModalSection>

        {/* Date Picker */}
        <ModalSection title={t('addEvent.sections.date')}>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            icon="calendar"
            style={styles.dateButton}
            contentStyle={styles.dateButtonContent}
          >
            {formatDateSmart(eventDate, t, locale) ||
              eventDate.toLocaleDateString()}
          </Button>
        </ModalSection>

        {/* Recurring Toggle - only shown for birthdays and anniversaries */}
        {['birthday', 'anniversary'].includes(eventType) && (
          <ModalSection>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text variant="labelLarge">
                  {t('addEvent.labels.recurring')}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.helperText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t('addEvent.labels.recurringHelper')}
                </Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring} />
            </View>
          </ModalSection>
        )}

        {/* Title */}
        <ModalSection
          title={t('addEvent.sections.title')}
          action={
            selectedContactId && (
              <Button
                mode="text"
                onPress={handleQuickFill}
                compact
                style={styles.quickButton}
              >
                {t('addEvent.labels.quickFill')}
              </Button>
            )
          }
        >
          <TextInput
            label={t('addEvent.labels.titlePlaceholder')}
            mode="outlined"
            value={title}
            onChangeText={setTitle}
            placeholder={t('addEvent.labels.titlePlaceholder')}
          />
        </ModalSection>

        {/* Reminders */}
        <ModalSection title={t('addEvent.sections.reminders')}>
          <View style={styles.reminderTemplates}>
            {REMINDER_TEMPLATES.map((template, index) => (
              <Chip
                key={index}
                icon="bell-plus"
                onPress={() => addReminder(template.minutes)}
                style={styles.reminderChip}
                mode="outlined"
                compact
              >
                {t(`addEvent.reminderTemplates.${template.minutes}`)}
              </Chip>
            ))}
          </View>
          {reminders.length > 0 && (
            <View style={styles.remindersList}>
              {reminders.map((reminder, index) => {
                const { date, time } = formatDateAndTime(
                  reminder.datetime,
                  locale
                );
                return (
                  <View key={index} style={styles.reminderItem}>
                    <Text variant="bodyMedium">
                      {date} {time}
                    </Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removeReminder(index)}
                      style={styles.reminderDeleteButton}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ModalSection>

        {/* Notes */}
        <ModalSection title={t('addEvent.sections.notes')} last>
          <TextInput
            mode="outlined"
            value={notes}
            onChangeText={setNotes}
            placeholder={t('addEvent.labels.notesPlaceholder')}
            multiline
            numberOfLines={4}
          />
        </ModalSection>
      </BaseModal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          themeVariant={theme.dark ? 'dark' : 'light'}
        />
      )}
    </>
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
  contactButton: {
    justifyContent: 'flex-start',
  },
  contactButtonContent: {
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
  dateButtonContent: {
    justifyContent: 'flex-start',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  switchLabel: {
    flex: 1,
  },
  helperText: {
    marginTop: 4,
  },
  quickButton: {
    marginTop: -8,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  reminderDeleteButton: {
    margin: 0,
  },
});

// Memoize modal to prevent unnecessary re-renders
// Modal only needs to re-render when visibility, editingEvent, preselectedContactId, or callbacks change
//
// IMPORTANT: Relies on updated_at invariant - the database layer MUST bump updated_at
// whenever any event fields change (see events.js:139).
// If updated_at is not properly maintained, the modal may show stale data when editing.
export default React.memo(AddEventModal, (prevProps, nextProps) => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.preselectedContactId === nextProps.preselectedContactId &&
    prevProps.editingEvent?.id === nextProps.editingEvent?.id &&
    prevProps.editingEvent?.updated_at === nextProps.editingEvent?.updated_at &&
    prevProps.onDismiss === nextProps.onDismiss &&
    prevProps.onEventAdded === nextProps.onEventAdded &&
    prevProps.onEventUpdated === nextProps.onEventUpdated &&
    prevProps.onEventDeleted === nextProps.onEventDeleted
  );
});
