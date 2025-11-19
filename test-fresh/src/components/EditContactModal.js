import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
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
} from 'react-native-paper';
import database, { contactsDB, contactsInfoDB, categoriesDB, categoriesRelationsDB, transaction as dbTransaction } from '../database';
import { useTranslation } from 'react-i18next';
import { useCompanies } from '../hooks/queries';
import { useSettings } from '../context/SettingsContext';
import { handleError, showAlert } from '../errors';
import { hasContent, safeTrim, normalizeTrimLowercase, filterNonEmpty } from '../utils/stringHelpers';
import { useAsyncLoading } from '../hooks/useAsyncOperation';

const PHONE_LABELS = ['Mobile', 'Home', 'Work', 'Other'];
const EMAIL_LABELS = ['Personal', 'Work', 'Other'];

function EditContactModal({ visible, onDismiss, contact, onContactUpdated }) {
  const { t } = useTranslation();
  const { companyManagementEnabled } = useSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [phones, setPhones] = useState([{ id: 1, value: '', label: 'Mobile' }]);
  const [emails, setEmails] = useState([{ id: 1, value: '', label: 'Personal' }]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Fetch companies if feature is enabled
  const { data: companies = [] } = useCompanies({ enabled: companyManagementEnabled });

  const { execute: saveContact, loading: saving } = useAsyncLoading(async () => {
    // Build all new contact info
    const contactInfoItems = [];
    const validPhones = filterNonEmpty(phones);
    const validEmails = filterNonEmpty(emails);

    // Add phone numbers
    validPhones.forEach((phone, index) => {
      contactInfoItems.push({
        type: 'phone',
        label: phone.label,
        value: safeTrim(phone.value),
        is_primary: index === 0, // First phone is primary
      });
    });

    // Add email addresses
    validEmails.forEach((email, index) => {
      contactInfoItems.push({
        type: 'email',
        label: email.label,
        value: normalizeTrimLowercase(email.value),
        is_primary: validPhones.length === 0 && index === 0, // Primary if no phones and first email
      });
    });

    // Make the entire save operation atomic
    await dbTransaction(async (tx) => {
      await contactsDB.update(contact.id, {
        first_name: safeTrim(firstName),
        last_name: safeTrim(lastName),
        company_id: selectedCompany?.id || null,
      }, tx);

      await contactsInfoDB.replaceContactInfo(contact.id, contactInfoItems, tx);
      await categoriesRelationsDB.setContactCategories(contact.id, selectedCategories, tx);
    });
  });

  // Load categories and contact data when modal opens
  useEffect(() => {
    if (visible && contact) {
      loadCategories();
      loadContactData();
    }
  }, [visible, contact]);

  const loadCategories = async () => {
    try {
      const allCategories = await categoriesDB.getAll();
      setCategories(allCategories);
    } catch (error) {
      handleError(error, {
        component: 'EditContactModal',
        operation: 'loadCategories',
        showAlert: false,
      });
    }
  };

  const loadContactData = async () => {
    try {
      setFirstName(contact.first_name || '');
      setLastName(contact.last_name || '');

      // Load company if available
      if (contact.company_id && companies.length > 0) {
        const company = companies.find(c => c.id === contact.company_id);
        setSelectedCompany(company || null);
      } else {
        setSelectedCompany(null);
      }

      // Load phones
      const contactPhones = (contact.contact_info || []).filter(info => info.type === 'phone');
      if (contactPhones.length > 0) {
        setPhones(contactPhones.map((phone, index) => ({
          id: phone.id || index + 1,
          value: phone.value || '',
          label: phone.label || 'Mobile',
          dbId: phone.id, // Store the database ID for updates
          is_primary: phone.is_primary,
        })));
      } else {
        setPhones([{ id: 1, value: '', label: 'Mobile' }]);
      }

      // Load emails
      const contactEmails = (contact.contact_info || []).filter(info => info.type === 'email');
      if (contactEmails.length > 0) {
        setEmails(contactEmails.map((email, index) => ({
          id: email.id || index + 1,
          value: email.value || '',
          label: email.label || 'Personal',
          dbId: email.id, // Store the database ID for updates
          is_primary: email.is_primary,
        })));
      } else {
        setEmails([{ id: 1, value: '', label: 'Personal' }]);
      }

      // Load contact categories
      const contactCategories = await categoriesRelationsDB.getCategoriesForContact(contact.id);
      setSelectedCategories(contactCategories.map(cat => cat.id));
    } catch (error) {
      handleError(error, {
        component: 'EditContactModal',
        operation: 'loadContactData',
        showAlert: false,
      });
    }
  };

  const handleCancel = () => {
    onDismiss();
  };

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Helper functions for managing multiple phone/email entries
  const addPhoneEntry = () => {
    const maxId = phones.length ? Math.max(...phones.map(p => p.id || 0)) : 0;
    const newId = maxId + 1;
    setPhones([...phones, { id: newId, value: '', label: 'Mobile' }]);
  };

  const addEmailEntry = () => {
    const maxId = emails.length ? Math.max(...emails.map(e => e.id || 0)) : 0;
    const newId = maxId + 1;
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
    if (!hasContent(firstName)) {
      showAlert.error('First name is required');
      return;
    }

    // Check if at least one phone or email is provided
    const validPhones = filterNonEmpty(phones);
    const validEmails = filterNonEmpty(emails);

    if (validPhones.length === 0 && validEmails.length === 0) {
      showAlert.error('Please provide at least a phone number or email address');
      return;
    }

    try {
      await saveContact();
      onContactUpdated && onContactUpdated();
      onDismiss();
      showAlert.success('Contact updated successfully!');
    } catch (error) {
      handleError(error, {
        component: 'EditContactModal',
        operation: 'handleSave',
        showAlert: true,
      });
    }
  };

  const validPhones = filterNonEmpty(phones);
  const validEmails = filterNonEmpty(emails);
  const canSave = hasContent(firstName) && (validPhones.length > 0 || validEmails.length > 0) && !saving;

  if (!contact) return null;

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
              {t('editContact.title')}
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleCancel}
              style={styles.closeButton}
            />
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

            {/* Company Section */}
            {companyManagementEnabled && companies.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('addContact.sections.company')}
                </Text>
                <Menu
                  visible={showCompanyMenu}
                  onDismiss={() => setShowCompanyMenu(false)}
                  anchor={
                    <TextInput
                      label={t('addContact.labels.company')}
                      value={selectedCompany?.name || ''}
                      mode="outlined"
                      style={styles.input}
                      right={<TextInput.Icon icon="chevron-down" />}
                      onFocus={() => setShowCompanyMenu(true)}
                      showSoftInputOnFocus={false}
                      placeholder={t('addContact.labels.optional')}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setSelectedCompany(null);
                      setShowCompanyMenu(false);
                    }}
                    title="None"
                  />
                  {companies.map((company) => (
                    <Menu.Item
                      key={company.id}
                      onPress={() => {
                        setSelectedCompany(company);
                        setShowCompanyMenu(false);
                      }}
                      title={company.name}
                    />
                  ))}
                </Menu>
              </View>
            )}

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
              {t('editContact.labels.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!canSave}
              loading={saving}
            >
              {t('editContact.labels.save')}
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

// Memoize modal to prevent unnecessary re-renders
// Modal only needs to re-render when visibility, contact, or callbacks change
export default React.memo(EditContactModal, (prevProps, nextProps) => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.contact?.id === nextProps.contact?.id &&
    prevProps.contact?.updated_at === nextProps.contact?.updated_at
  );
});
