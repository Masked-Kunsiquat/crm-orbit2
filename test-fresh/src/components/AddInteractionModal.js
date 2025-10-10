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
import { interactionsDB, contactsDB } from '../database';

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call', icon: 'phone' },
  { value: 'text', label: 'Text', icon: 'message-text' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'meeting', label: 'Meeting', icon: 'calendar-account' },
  { value: 'other', label: 'Other', icon: 'note-text' },
];

export default function AddInteractionModal({ visible, onDismiss, onInteractionAdded, preselectedContactId }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [duration, setDuration] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(preselectedContactId || null);
  const [contacts, setContacts] = useState([]);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interactionDateTime, setInteractionDateTime] = useState(new Date().toISOString());

  useEffect(() => {
    if (visible) {
      loadContacts();
      if (preselectedContactId) {
        setSelectedContactId(preselectedContactId);
      }
    }
  }, [visible, preselectedContactId]);

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
    setInteractionDateTime(new Date().toISOString());
    setSaving(false);
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
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

      // Create the interaction
      const interactionData = {
        contact_id: selectedContactId,
        title: title.trim(),
        note: note.trim() || null,
        interaction_type: interactionType,
        duration: durationSeconds,
        interaction_datetime: interactionDateTime,
      };

      await interactionsDB.create(interactionData);

      resetForm();
      onInteractionAdded && onInteractionAdded();
      onDismiss();
      Alert.alert('Success', 'Interaction added successfully!');
    } catch (error) {
      console.error('Error adding interaction:', error);
      Alert.alert('Error', 'Failed to add interaction. Please try again.');
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
              Add Interaction
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleCancel}
              style={styles.closeButton}
            />
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

            {/* Title */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Title
                </Text>
                {selectedContact && (
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
              Save Interaction
            </Button>
          </View>
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
