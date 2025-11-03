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
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { contactsDB } from '../database';
import { useCreateInteraction, useUpdateInteraction, useDeleteInteraction, useContacts } from '../hooks/queries';

const INTERACTION_TYPES = [
  { value: 'call', icon: 'phone' },
  { value: 'text', icon: 'message-text' },
  { value: 'email', icon: 'email' },
  { value: 'meeting', icon: 'calendar-account' },
  { value: 'other', icon: 'note-text' },
];

export default function AddInteractionModal({
  visible,
  onDismiss,
  onInteractionAdded,
  onInteractionUpdated,
  onInteractionDeleted,
  preselectedContactId,
  editingInteraction // Pass existing interaction for edit mode
}) {
  const { t } = useTranslation();
  const isEditMode = !!editingInteraction;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [duration, setDuration] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(preselectedContactId || null);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [interactionDateTime, setInteractionDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Use TanStack Query hooks
  const { data: contacts = [] } = useContacts();
  const createInteractionMutation = useCreateInteraction();
  const updateInteractionMutation = useUpdateInteraction();
  const deleteInteractionMutation = useDeleteInteraction();

  useEffect(() => {
    if (visible) {
      if (editingInteraction) {
        // Populate form with existing interaction data
        setTitle(editingInteraction.title || '');
        setNote(editingInteraction.note || '');
        setInteractionType(editingInteraction.interaction_type || 'call');
        setDuration(editingInteraction.duration ? Math.floor(editingInteraction.duration / 60).toString() : '');
        setSelectedContactId(editingInteraction.contact_id);
        setInteractionDateTime(new Date(editingInteraction.interaction_datetime || Date.now()));
      } else {
        // New interaction
        if (preselectedContactId) {
          setSelectedContactId(preselectedContactId);
        }
        setInteractionDateTime(new Date());
      }
    }
  }, [visible, preselectedContactId, editingInteraction]);

  const resetForm = () => {
    setTitle('');
    setNote('');
    setInteractionType('call');
    setDuration('');
    if (!preselectedContactId) {
      setSelectedContactId(null);
    }
    setInteractionDateTime(new Date());
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
  };

  const handleDelete = () => {
    if (!isEditMode || !editingInteraction) return;

    Alert.alert(
      t('addInteraction.delete.title'),
      t('addInteraction.delete.message'),
      [
        { text: t('addInteraction.delete.cancel'), style: 'cancel' },
        {
          text: t('addInteraction.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInteractionMutation.mutateAsync(editingInteraction.id);

              resetForm();
              onInteractionDeleted && onInteractionDeleted();
              onDismiss();
              Alert.alert(t('addInteraction.success.deleted'), '');
            } catch (error) {
              console.error('Error deleting interaction:', error);
              Alert.alert(t('addInteraction.errors.deleteFailed'), '');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('addInteraction.errors.titleRequired'), '');
      return;
    }

    if (!selectedContactId) {
      Alert.alert(t('addInteraction.errors.contactRequired'), '');
      return;
    }

    try {
      // Parse duration (in minutes) to seconds
      let durationSeconds = null;
      if (duration.trim()) {
        const durationMinutes = parseInt(duration.trim(), 10);
        if (!isNaN(durationMinutes) && durationMinutes > 0) {
          durationSeconds = durationMinutes * 60;
        }
      }

      const interactionData = {
        contact_id: selectedContactId,
        title: title.trim(),
        note: note.trim() || null,
        interaction_type: interactionType,
        duration: durationSeconds,
        interaction_datetime: interactionDateTime.toISOString(),
      };

      if (isEditMode) {
        // Update existing interaction
        await updateInteractionMutation.mutateAsync({ id: editingInteraction.id, data: interactionData });
        resetForm();
        onInteractionUpdated && onInteractionUpdated();
        onDismiss();
        Alert.alert(t('addInteraction.success.updated'), '');
      } else {
        // Create new interaction
        await createInteractionMutation.mutateAsync(interactionData);
        resetForm();
        onInteractionAdded && onInteractionAdded();
        onDismiss();
        Alert.alert(t('addInteraction.success.added'), '');
      }
    } catch (error) {
      console.error('Error saving interaction:', error);
      Alert.alert(t('addInteraction.errors.saveFailed'), '');
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const isSaving = createInteractionMutation.isPending || updateInteractionMutation.isPending || deleteInteractionMutation.isPending;
  const canSave = title.trim() && selectedContactId && !isSaving;

  // Generate quick title suggestions based on interaction type
  const getQuickTitleSuggestion = () => {
    const contactName = selectedContact
      ? selectedContact.display_name || `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim()
      : 'Contact';

    switch (interactionType) {
      case 'call':
        return t('addInteraction.quickTitles.call', { name: contactName });
      case 'text':
        return t('addInteraction.quickTitles.text', { name: contactName });
      case 'email':
        return t('addInteraction.quickTitles.email', { name: contactName });
      case 'meeting':
        return t('addInteraction.quickTitles.meeting', { name: contactName });
      default:
        return t('addInteraction.quickTitles.other', { name: contactName });
    }
  };

  const handleQuickTitle = () => {
    if (selectedContact) {
      setTitle(getQuickTitleSuggestion());
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(interactionDateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setInteractionDateTime(newDateTime);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(interactionDateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setInteractionDateTime(newDateTime);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {isEditMode ? t('addInteraction.titleEdit') : t('addInteraction.titleAdd')}
            </Text>
            <View style={styles.headerActions}>
              {isEditMode && (
                <IconButton
                  icon="delete"
                  size={24}
                  onPress={handleDelete}
                  iconColor="#d32f2f"
                  style={styles.deleteButton}
                />
              )}
              <IconButton
                icon="close"
                size={24}
                onPress={handleCancel}
                style={styles.closeButton}
              />
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Contact Selection */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('addInteraction.sections.contact')}
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
                    contentStyle={styles.contactButtonContent}
                    disabled={isEditMode} // Can't change contact when editing
                  >
                    {selectedContact
                      ? selectedContact.display_name || `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim()
                      : t('addInteraction.labels.selectContact')}
                  </Button>
                }
                contentStyle={styles.menu}
              >
                <ScrollView style={styles.menuScroll}>
                  {contacts.map((contact) => (
                    <Menu.Item
                      key={contact.id}
                      onPress={() => {
                        setSelectedContactId(contact.id);
                        setContactMenuVisible(false);
                      }}
                      title={contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()}
                      leadingIcon={selectedContactId === contact.id ? 'check' : undefined}
                    />
                  ))}
                </ScrollView>
              </Menu>
            </View>

            {/* Interaction Type */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('addInteraction.sections.type')}
              </Text>
              <View style={styles.typeChips}>
                {INTERACTION_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    selected={interactionType === type.value}
                    onPress={() => setInteractionType(type.value)}
                    style={styles.typeChip}
                    icon={type.icon}
                    mode="flat"
                  >
                    {t('addInteraction.types.' + type.value)}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('addInteraction.sections.dateTime')}
              </Text>
              <View style={styles.dateTimeRow}>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  icon="calendar"
                  style={styles.dateTimeButton}
                >
                  {formatDate(interactionDateTime)}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowTimePicker(true)}
                  icon="clock-outline"
                  style={styles.dateTimeButton}
                >
                  {formatTime(interactionDateTime)}
                </Button>
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addInteraction.sections.title')}
                </Text>
                {selectedContact && !isEditMode && (
                  <Button
                    mode="text"
                    onPress={handleQuickTitle}
                    compact
                    style={styles.quickButton}
                  >
                    {t('addInteraction.labels.quickFill')}
                  </Button>
                )}
              </View>
              <TextInput
                label={t('addInteraction.labels.interactionTitle')}
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                placeholder={t('addInteraction.labels.titlePlaceholder')}
              />
            </View>

            {/* Duration (for calls and meetings) */}
            {(interactionType === 'call' || interactionType === 'meeting') && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addInteraction.sections.duration')}
                </Text>
                <TextInput
                  label={t('addInteraction.labels.duration')}
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder={t('addInteraction.labels.durationOptional')}
                />
              </View>
            )}

            {/* Notes */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('addInteraction.sections.notes')}
              </Text>
              <TextInput
                label={t('addInteraction.labels.notes')}
                value={note}
                onChangeText={setNote}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder={t('addInteraction.labels.notesPlaceholder')}
              />
            </View>

            <View style={styles.spacer} />
          </ScrollView>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
              disabled={isSaving}
            >
              {t('addInteraction.labels.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!canSave}
              loading={isSaving}
            >
              {isEditMode ? t('addInteraction.labels.update') : t('addInteraction.labels.save')}
            </Button>
          </View>
        </Surface>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={interactionDateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()} // Can't select future dates
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={interactionDateTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
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
    maxHeight: '90%',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  deleteButton: {
    margin: 0,
  },
  closeButton: {
    margin: 0,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '500',
    color: '#1976d2',
    marginBottom: 12,
  },
  quickButton: {
    marginTop: -8,
  },
  contactButton: {
    marginTop: 0,
  },
  contactButtonContent: {
    justifyContent: 'flex-start',
  },
  menu: {
    maxHeight: 300,
  },
  menuScroll: {
    maxHeight: 250,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    marginRight: 0,
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
  },
  input: {
    marginBottom: 0,
  },
  spacer: {
    height: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
