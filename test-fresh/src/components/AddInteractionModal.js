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
import { interactionsDB, contactsDB } from '../database';

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call', icon: 'phone' },
  { value: 'text', label: 'Text', icon: 'message-text' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'meeting', label: 'Meeting', icon: 'calendar-account' },
  { value: 'other', label: 'Other', icon: 'note-text' },
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
  const isEditMode = !!editingInteraction;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [duration, setDuration] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(preselectedContactId || null);
  const [contacts, setContacts] = useState([]);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interactionDateTime, setInteractionDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();

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

  const loadContacts = async () => {
    try {
      const allContacts = await contactsDB.getAll();
      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setInteractionType('call');
    setDuration('');
    if (!preselectedContactId) {
      setSelectedContactId(null);
    }
    setInteractionDateTime(new Date());
    setSaving(false);
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
  };

  const handleDelete = () => {
    if (!isEditMode || !editingInteraction) return;

    Alert.alert(
      'Delete Interaction',
      'Are you sure you want to delete this interaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await interactionsDB.delete(editingInteraction.id);

              resetForm();
              onInteractionDeleted && onInteractionDeleted();
              onDismiss();
              Alert.alert('Success', 'Interaction deleted successfully!');
            } catch (error) {
              console.error('Error deleting interaction:', error);
              Alert.alert('Error', 'Failed to delete interaction. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    if (!selectedContactId) {
      Alert.alert('Error', 'Please select a contact');
      return;
    }

    setSaving(true);

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
        await interactionsDB.update(editingInteraction.id, interactionData);
        resetForm();
        onInteractionUpdated && onInteractionUpdated();
        onDismiss();
        Alert.alert('Success', 'Interaction updated successfully!');
      } else {
        // Create new interaction
        await interactionsDB.create(interactionData);
        resetForm();
        onInteractionAdded && onInteractionAdded();
        onDismiss();
        Alert.alert('Success', 'Interaction added successfully!');
      }
    } catch (error) {
      console.error('Error saving interaction:', error);
      Alert.alert('Error', 'Failed to save interaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const canSave = title.trim() && selectedContactId && !saving;

  // Generate quick title suggestions based on interaction type
  const getQuickTitleSuggestion = () => {
    const contactName = selectedContact
      ? selectedContact.display_name || `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim()
      : 'Contact';

    switch (interactionType) {
      case 'call':
        return `Call with ${contactName}`;
      case 'text':
        return `Texted ${contactName}`;
      case 'email':
        return `Emailed ${contactName}`;
      case 'meeting':
        return `Meeting with ${contactName}`;
      case 'other':
      default:
        return `Interaction with ${contactName}`;
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
              {isEditMode ? 'Edit Interaction' : 'Add Interaction'}
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
                Contact
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
                      : 'Select a contact'}
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
                Type
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
                    {type.label}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Date & Time
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
                  Title
                </Text>
                {selectedContact && !isEditMode && (
                  <Button
                    mode="text"
                    onPress={handleQuickTitle}
                    compact
                    style={styles.quickButton}
                  >
                    Quick Fill
                  </Button>
                )}
              </View>
              <TextInput
                label="Interaction Title"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Quick catch-up call"
              />
            </View>

            {/* Duration (for calls and meetings) */}
            {(interactionType === 'call' || interactionType === 'meeting') && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Duration (minutes)
                </Text>
                <TextInput
                  label="Duration"
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Optional"
                />
              </View>
            )}

            {/* Notes */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notes
              </Text>
              <TextInput
                label="Additional Notes"
                value={note}
                onChangeText={setNote}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder="Optional notes about this interaction"
              />
            </View>

            <View style={styles.spacer} />
          </ScrollView>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!canSave}
              loading={saving}
            >
              {isEditMode ? 'Update' : 'Save'}
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
