import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
} from 'react-native-paper';
import * as Contacts from 'expo-contacts';
import { contactsDB, contactsInfoDB, categoriesDB, categoriesRelationsDB, transaction, execute } from '../database';
import { useTranslation } from 'react-i18next';

const PHONE_LABELS = ['Mobile', 'Home', 'Work', 'Other'];
const EMAIL_LABELS = ['Personal', 'Work', 'Other'];

/**
 * Maps native contact phone label to our label format
 * @param {string} nativeLabel - The label from native contact
 * @returns {string} - One of our PHONE_LABELS
 */
const mapPhoneLabel = (nativeLabel) => {
  if (!nativeLabel) return 'Mobile';
  const normalized = nativeLabel.toLowerCase();
  if (normalized.includes('mobile') || normalized.includes('cell')) return 'Mobile';
  if (normalized.includes('home')) return 'Home';
  if (normalized.includes('work')) return 'Work';
  return 'Other';
};

/**
 * Maps native contact email label to our label format
 * @param {string} nativeLabel - The label from native contact
 * @returns {string} - One of our EMAIL_LABELS
 */
const mapEmailLabel = (nativeLabel) => {
  if (!nativeLabel) return 'Personal';
  const normalized = nativeLabel.toLowerCase();
  if (normalized.includes('work')) return 'Work';
  if (normalized.includes('personal') || normalized.includes('home')) return 'Personal';
  return 'Other';
};

export default function AddContactModal({ visible, onDismiss, onContactAdded }) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phones, setPhones] = useState([{ id: 1, value: '', label: 'Mobile' }]);
  const [emails, setEmails] = useState([{ id: 1, value: '', label: 'Personal' }]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const allCategories = await categoriesDB.getAll();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhones([{ id: 1, value: '', label: 'Mobile' }]);
    setEmails([{ id: 1, value: '', label: 'Personal' }]);
    setSelectedCategories([]);
    setSaving(false);
  };

  /**
   * Handles importing a contact from the device's native contact picker
   */
  const handleImportFromContacts = async () => {
    try {
      // Request permissions
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('addContact.permissionTitle'), t('addContact.permissionMsg'));
        return;
      }

      // Present the native contact picker (Android requires READ_CONTACTS permission)
      const contact = await Contacts.presentContactPickerAsync();

      // User cancelled the picker
      if (!contact) {
        return;
      }

      // Map name fields
      if (contact.firstName) {
        setFirstName(contact.firstName);
      }
      if (contact.lastName) {
        setLastName(contact.lastName);
      }

      // Map phone numbers
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const mappedPhones = contact.phoneNumbers.map((phone, idx) => ({
          id: idx + 1,
          value: phone.number || '',
          label: mapPhoneLabel(phone.label),
        }));
        setPhones(mappedPhones);
      }

      // Map email addresses
      if (contact.emails && contact.emails.length > 0) {
        const mappedEmails = contact.emails.map((email, idx) => ({
          id: idx + 1,
          value: email.email || '',
          label: mapEmailLabel(email.label),
        }));
        setEmails(mappedEmails);
      }

      // Show success message
      Alert.alert(t('addContact.importSuccessTitle'), t('addContact.importSuccessMsg'));
    } catch (error) {
      console.error('Error importing contact:', error);
      Alert.alert(t('addContact.importFailTitle'), t('addContact.importFailMsg'));
    }
  };

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
  };

  // Helper functions for managing multiple phone/email entries
  const addPhoneEntry = () => {
    const newId = Math.max(...phones.map(p => p.id)) + 1;
    setPhones([...phones, { id: newId, value: '', label: 'Mobile' }]);
  };

  const addEmailEntry = () => {
    const newId = Math.max(...emails.map(e => e.id)) + 1;
    setEmails([...emails, { id: newId, value: '', label: 'Personal' }]);
  };

  const updatePhoneValue = (id, value) => {
    setPhones(phones.map(phone =>
      phone.id === id ? { ...phone, value } : phone
    ));
  };

  const updatePhoneLabel = (id, label) => {
    setPhones(phones.map(phone =>
      phone.id === id ? { ...phone, label } : phone
    ));
  };

  const updateEmailValue = (id, value) => {
    setEmails(emails.map(email =>
      email.id === id ? { ...email, value } : email
    ));
  };

  const updateEmailLabel = (id, label) => {
    setEmails(emails.map(email =>
      email.id === id ? { ...email, label } : email
    ));
  };

  const removePhoneEntry = (id) => {
    if (phones.length > 1) {
      setPhones(phones.filter(phone => phone.id !== id));
    }
  };

  const removeEmailEntry = (id) => {
    if (emails.length > 1) {
      setEmails(emails.filter(email => email.id !== id));
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }

    // Check if at least one phone or email is provided
    const validPhones = phones.filter(phone => phone.value.trim());
    const validEmails = emails.filter(email => email.value.trim());

    if (validPhones.length === 0 && validEmails.length === 0) {
      Alert.alert('Error', 'Please provide at least a phone number or email address');
      return;
    }

    setSaving(true);

    try {
      if (typeof transaction === 'function') {
        // Use a single DB transaction for atomic writes
        await transaction(async (tx) => {
          const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'Unnamed Contact';

          // Create contact
          const insertContact = await tx.execute(
            'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?);',
            [firstName.trim(), lastName.trim(), displayName]
          );
          const contactId = insertContact.insertId;

          // Insert phones
          for (let i = 0; i < validPhones.length; i++) {
            const phone = validPhones[i];
            await tx.execute(
              'INSERT INTO contact_info (type, label, value, is_primary, contact_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);',
              ['phone', phone.label, phone.value.trim(), i === 0 ? 1 : 0, contactId]
            );
          }

          // Insert emails
          for (let i = 0; i < validEmails.length; i++) {
            const email = validEmails[i];
            const isPrimary = validPhones.length === 0 && i === 0 ? 1 : 0;
            await tx.execute(
              'INSERT INTO contact_info (type, label, value, is_primary, contact_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);',
              ['email', email.label, email.value.trim().toLowerCase(), isPrimary, contactId]
            );
          }

          // Insert category relations (deduplicated)
          const uniqueCats = Array.from(new Set(selectedCategories));
          for (const categoryId of uniqueCats) {
            try {
              await tx.execute(
                'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
                [contactId, categoryId]
              );
            } catch (e) {
              const msg = String(e?.message || e?.originalError?.message || '');
              if (!msg.includes('UNIQUE constraint failed')) throw e; // ignore duplicates
            }
          }
        });
      } else {
        // Fallback: perform operations and explicitly roll back on failure
        let createdContactId = null;
        try {
          const contact = await contactsDB.create({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          });
          createdContactId = contact.id;

          const contactInfoItems = [];
          validPhones.forEach((phone, index) => {
            contactInfoItems.push({
              type: 'phone',
              label: phone.label,
              value: phone.value.trim(),
              is_primary: index === 0,
            });
          });
          validEmails.forEach((email, index) => {
            contactInfoItems.push({
              type: 'email',
              label: email.label,
              value: email.value.trim().toLowerCase(),
              is_primary: validPhones.length === 0 && index === 0,
            });
          });

          await contactsInfoDB.addContactInfo(createdContactId, contactInfoItems);
          for (const categoryId of selectedCategories) {
            await categoriesRelationsDB.addContactToCategory(createdContactId, categoryId);
          }
        } catch (err) {
          // Attempt explicit rollback
          if (createdContactId != null) {
            try {
              await categoriesRelationsDB.removeContactFromAllCategories?.(createdContactId);
            } catch (rb1) {
              console.error('Rollback: failed to remove categories for contact', rb1);
            }
            try {
              // delete all contact_info for this contact
              await execute('DELETE FROM contact_info WHERE contact_id = ?;', [createdContactId]);
            } catch (rb2) {
              console.error('Rollback: failed to remove contact info', rb2);
            }
            try {
              await contactsDB.delete(createdContactId);
            } catch (rb3) {
              console.error('Rollback: failed to delete contact', rb3);
            }
          }
          throw err;
        }
      }

      resetForm();
      onContactAdded && onContactAdded();
      onDismiss();
      Alert.alert('Success', 'Contact added successfully!');
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const validPhones = phones.filter(phone => phone.value.trim());
  const validEmails = emails.filter(email => email.value.trim());
  const canSave = firstName.trim() && (validPhones.length > 0 || validEmails.length > 0) && !saving;

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
              {t('addContact.title')}
            </Text>
            <View style={styles.headerActions}>
              <IconButton
                icon="account-convert"
                size={24}
                onPress={handleImportFromContacts}
                style={styles.importButton}
                mode="contained-tonal"
              />
              <IconButton
                icon="close"
                size={24}
                onPress={handleCancel}
                style={styles.closeButton}
              />
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Name Section */}
            <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('addContact.sections.name')}
            </Text>
            <TextInput
                label={t('addContact.labels.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
                placeholder={t('addContact.labels.optional')}
              />
              <TextInput
                label={t('addContact.labels.lastName')}
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
                placeholder={t('addContact.labels.optional')}
              />
            </View>

            {/* Phone Numbers Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addContact.sections.phones')}
                </Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={addPhoneEntry}
                  style={styles.addButton}
                />
              </View>

              {phones.map((phone, index) => (
                <View key={phone.id} style={styles.entryContainer}>
                  <View style={styles.labelChips}>
                    {PHONE_LABELS.map((label) => (
                      <Chip
                        key={label}
                        selected={phone.label === label}
                        onPress={() => updatePhoneLabel(phone.id, label)}
                        style={styles.labelChip}
                        compact
                      >
                        {t(`contact.phoneLabels.${label}`)}
                      </Chip>
                    ))}
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      label={`${t('contact.phoneLabels.' + phone.label)} ${t('addContact.labels.phone')}`}
                      value={phone.value}
                      onChangeText={(value) => updatePhoneValue(phone.id, value)}
                      mode="outlined"
                      style={styles.inputFlex}
                      keyboardType="phone-pad"
                      placeholder="Optional"
                    />
                    {phones.length > 1 && (
                      <IconButton
                        icon="minus-circle-outline"
                        size={24}
                        onPress={() => removePhoneEntry(phone.id)}
                        style={styles.deleteButton}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Email Addresses Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addContact.sections.emails')}
                </Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={addEmailEntry}
                  style={styles.addButton}
                />
              </View>

              {emails.map((email, index) => (
                <View key={email.id} style={styles.entryContainer}>
                  <View style={styles.labelChips}>
                    {EMAIL_LABELS.map((label) => (
                      <Chip
                        key={label}
                        selected={email.label === label}
                        onPress={() => updateEmailLabel(email.id, label)}
                        style={styles.labelChip}
                        compact
                      >
                        {t(`contact.emailLabels.${label}`)}
                      </Chip>
                    ))}
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      label={`${t('contact.emailLabels.' + email.label)} ${t('addContact.labels.email')}`}
                      value={email.value}
                      onChangeText={(value) => updateEmailValue(email.id, value)}
                      mode="outlined"
                      style={styles.inputFlex}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Optional"
                    />
                    {emails.length > 1 && (
                      <IconButton
                        icon="minus-circle-outline"
                        size={24}
                        onPress={() => removeEmailEntry(email.id)}
                        style={styles.deleteButton}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Categories Section */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addContact.sections.categories')}
                </Text>
                <View style={styles.categoryChips}>
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      selected={selectedCategories.includes(category.id)}
                      onPress={() => toggleCategory(category.id)}
                      style={[
                        styles.categoryChip,
                        selectedCategories.includes(category.id) && { backgroundColor: category.color }
                      ]}
                      mode="flat"
                      icon={category.icon}
                    >
                      {(() => { const key = `categories.${category.name}`; const translated = t(key); return translated === key ? category.name : translated; })()}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.spacer} />
          </ScrollView>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
              disabled={saving}
            >
              {t('addContact.labels.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!canSave}
              loading={saving}
            >
              {t('addContact.labels.save')}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  importButton: {
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
  },
  addButton: {
    margin: 0,
  },
  entryContainer: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  deleteButton: {
    margin: 0,
  },
  labelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  labelChip: {
    marginRight: 0,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    marginRight: 0,
    marginBottom: 4,
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
