import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Menu,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import {
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
  useContacts,
} from '../hooks/queries';
import {
  setDatePart,
  setTimePart,
  formatShortDate,
  formatTime,
} from '../utils/dateUtils';
import { handleError, showAlert } from '../errors';
import {
  safeTrim,
  hasContent,
} from '../utils/stringHelpers';
import { getContactDisplayName } from '../utils/contactHelpers';

const INTERACTION_TYPES = [
  { value: 'call', icon: 'phone' },
  { value: 'text', icon: 'message-text' },
  { value: 'email', icon: 'email' },
  { value: 'meeting', icon: 'calendar-account' },
  { value: 'other', icon: 'note-text' },
];

function AddInteractionModal({
  visible,
  onDismiss,
  onInteractionAdded,
  onInteractionUpdated,
  onInteractionDeleted,
  preselectedContactId,
  editingInteraction,
}) {
  const { t } = useTranslation();
  const isEditMode = !!editingInteraction;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [duration, setDuration] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(
    preselectedContactId || null
  );
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [interactionDateTime, setInteractionDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { data: contacts = [] } = useContacts();
  const createInteractionMutation = useCreateInteraction();
  const updateInteractionMutation = useUpdateInteraction();
  const deleteInteractionMutation = useDeleteInteraction();

  useEffect(() => {
    if (visible) {
      if (editingInteraction) {
        setTitle(editingInteraction.title || '');
        setNote(editingInteraction.note || '');
        setInteractionType(editingInteraction.interaction_type || 'call');
        setDuration(
          editingInteraction.duration
            ? Math.floor(editingInteraction.duration / 60).toString()
            : ''
        );
        setSelectedContactId(editingInteraction.contact_id);
        setInteractionDateTime(
          new Date(editingInteraction.interaction_datetime || Date.now())
        );
      } else {
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

    showAlert.confirmDelete(
      t('addInteraction.delete.title'),
      t('addInteraction.delete.message'),
      async () => {
        try {
          await deleteInteractionMutation.mutateAsync(editingInteraction.id);
          resetForm();
          onInteractionDeleted && onInteractionDeleted();
          onDismiss();
          showAlert.success(t('addInteraction.success.deleted'), '');
        } catch (error) {
          handleError(error, {
            component: 'AddInteractionModal',
            operation: 'handleDelete',
            showAlert: true,
          });
        }
      }
    );
  };

  const handleSave = async () => {
    if (!hasContent(title)) {
      showAlert.error(t('addInteraction.errors.titleRequired'), '');
      return;
    }

    if (!selectedContactId) {
      showAlert.error(t('addInteraction.errors.contactRequired'), '');
      return;
    }

    try {
      let durationSeconds = null;
      if (hasContent(duration)) {
        const durationMinutes = parseInt(safeTrim(duration), 10);
        if (!isNaN(durationMinutes) && durationMinutes > 0) {
          durationSeconds = durationMinutes * 60;
        }
      }

      const interactionData = {
        contact_id: selectedContactId,
        title: safeTrim(title),
        note: safeTrim(note) || null,
        interaction_type: interactionType,
        duration: durationSeconds,
        interaction_datetime: interactionDateTime.toISOString(),
      };

      if (isEditMode) {
        await updateInteractionMutation.mutateAsync({
          id: editingInteraction.id,
          data: interactionData,
        });
        resetForm();
        onInteractionUpdated && onInteractionUpdated();
        onDismiss();
        showAlert.success(t('addInteraction.success.updated'), '');
      } else {
        await createInteractionMutation.mutateAsync(interactionData);
        resetForm();
        onInteractionAdded && onInteractionAdded();
        onDismiss();
        showAlert.success(t('addInteraction.success.added'), '');
      }
    } catch (error) {
      handleError(error, {
        component: 'AddInteractionModal',
        operation: 'handleSave',
        showAlert: true,
      });
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const isSaving =
    createInteractionMutation.isPending ||
    updateInteractionMutation.isPending ||
    deleteInteractionMutation.isPending;
  const canSave = hasContent(title) && selectedContactId && !isSaving;

  const getQuickTitleSuggestion = () => {
    const contactName = selectedContact
      ? getContactDisplayName(selectedContact, 'Contact')
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
      const newDateTime = setDatePart(interactionDateTime, selectedDate);
      if (newDateTime) {
        setInteractionDateTime(newDateTime);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = setTimePart(interactionDateTime, selectedTime);
      if (newDateTime) {
        setInteractionDateTime(newDateTime);
      }
    }
  };

  return (
    <>
      <BaseModal
        visible={visible}
        onDismiss={handleCancel}
        title={isEditMode
          ? t('addInteraction.titleEdit')
          : t('addInteraction.titleAdd')}
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
            label: t('addInteraction.labels.cancel'),
            onPress: handleCancel,
            mode: 'outlined',
            disabled: isSaving,
          },
          {
            label: isEditMode
              ? t('addInteraction.labels.update')
              : t('addInteraction.labels.save'),
            onPress: handleSave,
            mode: 'contained',
            disabled: !canSave,
            loading: isSaving,
          },
        ]}
        maxHeight={0.92}
      >
        {/* Contact Selection */}
        <ModalSection title={t('addInteraction.sections.contact')}>
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
                disabled={isEditMode}
              >
                {selectedContact
                  ? getContactDisplayName(selectedContact)
                  : t('addInteraction.labels.selectContact')}
              </Button>
            }
            contentStyle={styles.menu}
          >
            {contacts.map(contact => (
              <Menu.Item
                key={contact.id}
                onPress={() => {
                  setSelectedContactId(contact.id);
                  setContactMenuVisible(false);
                }}
                title={getContactDisplayName(contact)}
                leadingIcon={
                  selectedContactId === contact.id ? 'check' : undefined
                }
              />
            ))}
          </Menu>
        </ModalSection>

        {/* Interaction Type */}
        <ModalSection title={t('addInteraction.sections.type')}>
          <View style={styles.typeChips}>
            {INTERACTION_TYPES.map(type => (
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
        </ModalSection>

        {/* Date & Time */}
        <ModalSection title={t('addInteraction.sections.dateTime')}>
          <View style={styles.dateTimeRow}>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              style={styles.dateTimeButton}
            >
              {formatShortDate(interactionDateTime)}
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
        </ModalSection>

        {/* Title */}
        <ModalSection
          title={t('addInteraction.sections.title')}
          action={
            selectedContact && !isEditMode && (
              <Button
                mode="text"
                onPress={handleQuickTitle}
                compact
                style={styles.quickButton}
              >
                {t('addInteraction.labels.quickFill')}
              </Button>
            )
          }
        >
          <TextInput
            label={t('addInteraction.labels.interactionTitle')}
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            placeholder={t('addInteraction.labels.titlePlaceholder')}
          />
        </ModalSection>

        {/* Duration (for calls and meetings) */}
        {(interactionType === 'call' || interactionType === 'meeting') && (
          <ModalSection title={t('addInteraction.sections.duration')}>
            <TextInput
              label={t('addInteraction.labels.duration')}
              value={duration}
              onChangeText={setDuration}
              mode="outlined"
              keyboardType="number-pad"
              placeholder={t('addInteraction.labels.durationOptional')}
            />
          </ModalSection>
        )}

        {/* Notes */}
        <ModalSection title={t('addInteraction.sections.notes')} last>
          <TextInput
            label={t('addInteraction.labels.notes')}
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder={t('addInteraction.labels.notesPlaceholder')}
          />
        </ModalSection>
      </BaseModal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={interactionDateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
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
    marginTop: 0,
  },
  contactButtonContent: {
    justifyContent: 'flex-start',
  },
  menu: {
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
  },
  quickButton: {
    marginTop: -8,
  },
});

export default React.memo(AddInteractionModal, (prevProps, nextProps) => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.preselectedContactId === nextProps.preselectedContactId &&
    prevProps.editingInteraction?.id === nextProps.editingInteraction?.id &&
    prevProps.editingInteraction?.updated_at ===
      nextProps.editingInteraction?.updated_at &&
    prevProps.onDismiss === nextProps.onDismiss &&
    prevProps.onInteractionAdded === nextProps.onInteractionAdded &&
    prevProps.onInteractionUpdated === nextProps.onInteractionUpdated &&
    prevProps.onInteractionDeleted === nextProps.onInteractionDeleted
  );
});
