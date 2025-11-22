import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  TextInput,
  IconButton,
  Chip,
  Menu,
} from 'react-native-paper';
import * as Contacts from 'expo-contacts';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import { categoriesDB } from '../database';
import { useTranslation } from 'react-i18next';
import { useCreateContactWithDetails, useCompanies } from '../hooks/queries';
import { useSettings } from '../context/SettingsContext';
import { handleError, showAlert } from '../errors';
import { hasContent, filterNonEmpty } from '../utils/stringHelpers';
import { requestPermission } from '../utils/permissionHelpers';

const PHONE_LABELS = ['Mobile', 'Home', 'Work', 'Other'];
const EMAIL_LABELS = ['Personal', 'Work', 'Other'];

const mapPhoneLabel = nativeLabel => {
  if (!nativeLabel) return 'Mobile';
  const normalized = nativeLabel.toLowerCase();
  if (normalized.includes('mobile') || normalized.includes('cell'))
    return 'Mobile';
  if (normalized.includes('home')) return 'Home';
  if (normalized.includes('work')) return 'Work';
  return 'Other';
};

const mapEmailLabel = nativeLabel => {
  if (!nativeLabel) return 'Personal';
  const normalized = nativeLabel.toLowerCase();
  if (normalized.includes('work')) return 'Work';
  if (normalized.includes('personal') || normalized.includes('home'))
    return 'Personal';
  return 'Other';
};

function AddContactModal({ visible, onDismiss, onContactAdded }) {
  const { t } = useTranslation();
  const { companyManagementEnabled } = useSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [phones, setPhones] = useState([{ id: 1, value: '', label: 'Mobile' }]);
  const [emails, setEmails] = useState([
    { id: 1, value: '', label: 'Personal' },
  ]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const createContactMutation = useCreateContactWithDetails();
  const { data: companies = [] } = useCompanies({
    enabled: companyManagementEnabled,
  });

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
      handleError(error, {
        component: 'AddContactModal',
        operation: 'loadCategories',
        showAlert: false,
      });
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setSelectedCompany(null);
    setPhones([{ id: 1, value: '', label: 'Mobile' }]);
    setEmails([{ id: 1, value: '', label: 'Personal' }]);
    setSelectedCategories([]);
  };

  const handleImportFromContacts = async () => {
    try {
      const granted = await requestPermission(
        Contacts.requestPermissionsAsync,
        'Contacts',
        t('addContact.permissionMsg')
      );
      if (!granted) return;

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      if (contact.firstName) setFirstName(contact.firstName);
      if (contact.lastName) setLastName(contact.lastName);

      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const mappedPhones = contact.phoneNumbers.map((phone, idx) => ({
          id: idx + 1,
          value: phone.number || '',
          label: mapPhoneLabel(phone.label),
        }));
        setPhones(mappedPhones);
      }

      if (contact.emails && contact.emails.length > 0) {
        const mappedEmails = contact.emails.map((email, idx) => ({
          id: idx + 1,
          value: email.email || '',
          label: mapEmailLabel(email.label),
        }));
        setEmails(mappedEmails);
      }

      showAlert.success(
        t('addContact.importSuccessTitle'),
        t('addContact.importSuccessMsg')
      );
    } catch (error) {
      handleError(error, {
        component: 'AddContactModal',
        operation: 'handleImportFromContacts',
        showAlert: true,
        context: { customMessage: t('addContact.importFailMsg') },
      });
    }
  };

  const toggleCategory = categoryId => {
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

  const addPhoneEntry = () => {
    const newId = Math.max(...phones.map(p => p.id)) + 1;
    setPhones([...phones, { id: newId, value: '', label: 'Mobile' }]);
  };

  const addEmailEntry = () => {
    const newId = Math.max(...emails.map(e => e.id)) + 1;
    setEmails([...emails, { id: newId, value: '', label: 'Personal' }]);
  };

  const updatePhoneValue = (id, value) => {
    setPhones(
      phones.map(phone => (phone.id === id ? { ...phone, value } : phone))
    );
  };

  const updatePhoneLabel = (id, label) => {
    setPhones(
      phones.map(phone => (phone.id === id ? { ...phone, label } : phone))
    );
  };

  const updateEmailValue = (id, value) => {
    setEmails(
      emails.map(email => (email.id === id ? { ...email, value } : email))
    );
  };

  const updateEmailLabel = (id, label) => {
    setEmails(
      emails.map(email => (email.id === id ? { ...email, label } : email))
    );
  };

  const removePhoneEntry = id => {
    if (phones.length > 1) {
      setPhones(phones.filter(phone => phone.id !== id));
    }
  };

  const removeEmailEntry = id => {
    if (emails.length > 1) {
      setEmails(emails.filter(email => email.id !== id));
    }
  };

  const handleSave = async () => {
    if (!hasContent(firstName)) {
      showAlert.error(t('addContact.validation.firstNameRequired'));
      return;
    }

    const validPhones = filterNonEmpty(phones);
    const validEmails = filterNonEmpty(emails);

    if (validPhones.length === 0 && validEmails.length === 0) {
      showAlert.error(t('addContact.validation.contactInfoRequired'));
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        firstName,
        lastName,
        companyId: selectedCompany?.id || null,
        phones: validPhones,
        emails: validEmails,
        categoryIds: selectedCategories,
      });

      resetForm();
      onContactAdded && onContactAdded();
      onDismiss();
      showAlert.success(t('addContact.successMsg'));
    } catch (error) {
      handleError(error, {
        component: 'AddContactModal',
        operation: 'handleSave',
        showAlert: true,
      });
    }
  };

  const validPhones = filterNonEmpty(phones);
  const validEmails = filterNonEmpty(emails);
  const canSave =
    hasContent(firstName) &&
    (validPhones.length > 0 || validEmails.length > 0) &&
    !createContactMutation.isPending;

  return (
    <BaseModal
      visible={visible}
      onDismiss={handleCancel}
      title={t('addContact.title')}
      headerRight={
        <View style={styles.headerActions}>
          <IconButton
            icon="account-convert"
            size={22}
            onPress={handleImportFromContacts}
            style={styles.iconButton}
            mode="contained-tonal"
          />
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
          label: t('addContact.labels.cancel'),
          onPress: handleCancel,
          mode: 'outlined',
          disabled: createContactMutation.isPending,
        },
        {
          label: t('addContact.labels.save'),
          onPress: handleSave,
          mode: 'contained',
          disabled: !canSave,
          loading: createContactMutation.isPending,
        },
      ]}
      maxHeight={0.92}
    >
      {/* Name Section */}
      <ModalSection title={t('addContact.sections.name')}>
        <TextInput
          label={t('addContact.labels.firstName')}
          value={firstName}
          onChangeText={setFirstName}
          mode="outlined"
          autoCapitalize="words"
          placeholder={t('addContact.labels.optional')}
        />
        <TextInput
          label={t('addContact.labels.lastName')}
          value={lastName}
          onChangeText={setLastName}
          mode="outlined"
          autoCapitalize="words"
          placeholder={t('addContact.labels.optional')}
        />
      </ModalSection>

      {/* Company Section */}
      {companyManagementEnabled && companies.length > 0 && (
        <ModalSection title="Company">
          <Menu
            visible={showCompanyMenu}
            onDismiss={() => setShowCompanyMenu(false)}
            anchor={
              <TextInput
                label="Company"
                value={selectedCompany?.name || ''}
                mode="outlined"
                right={<TextInput.Icon icon="chevron-down" />}
                onFocus={() => setShowCompanyMenu(true)}
                showSoftInputOnFocus={false}
                placeholder="Optional"
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
            {companies.map(company => (
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
        </ModalSection>
      )}

      {/* Phone Numbers Section */}
      <ModalSection
        title={t('addContact.sections.phones')}
        action={
          <IconButton
            icon="plus-circle-outline"
            size={22}
            onPress={addPhoneEntry}
            style={styles.addButton}
          />
        }
      >
        {phones.map(phone => (
          <View key={phone.id} style={styles.entryContainer}>
            <View style={styles.labelChips}>
              {PHONE_LABELS.map(label => (
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
                onChangeText={value => updatePhoneValue(phone.id, value)}
                mode="outlined"
                style={styles.inputFlex}
                keyboardType="phone-pad"
                placeholder="Optional"
              />
              {phones.length > 1 && (
                <IconButton
                  icon="minus-circle-outline"
                  size={22}
                  onPress={() => removePhoneEntry(phone.id)}
                  style={styles.deleteButton}
                />
              )}
            </View>
          </View>
        ))}
      </ModalSection>

      {/* Email Addresses Section */}
      <ModalSection
        title={t('addContact.sections.emails')}
        action={
          <IconButton
            icon="plus-circle-outline"
            size={22}
            onPress={addEmailEntry}
            style={styles.addButton}
          />
        }
      >
        {emails.map(email => (
          <View key={email.id} style={styles.entryContainer}>
            <View style={styles.labelChips}>
              {EMAIL_LABELS.map(label => (
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
                onChangeText={value => updateEmailValue(email.id, value)}
                mode="outlined"
                style={styles.inputFlex}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Optional"
              />
              {emails.length > 1 && (
                <IconButton
                  icon="minus-circle-outline"
                  size={22}
                  onPress={() => removeEmailEntry(email.id)}
                  style={styles.deleteButton}
                />
              )}
            </View>
          </View>
        ))}
      </ModalSection>

      {/* Categories Section */}
      {categories.length > 0 && (
        <ModalSection title={t('addContact.sections.categories')} last>
          <View style={styles.categoryChips}>
            {categories.map(category => (
              <Chip
                key={category.id}
                selected={selectedCategories.includes(category.id)}
                onPress={() => toggleCategory(category.id)}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(category.id) && {
                    backgroundColor: category.color,
                  },
                ]}
                mode="flat"
                icon={category.icon}
              >
                {(() => {
                  const key = `categories.${category.name}`;
                  const translated = t(key);
                  return translated === key ? category.name : translated;
                })()}
              </Chip>
            ))}
          </View>
        </ModalSection>
      )}
    </BaseModal>
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
  addButton: {
    margin: 0,
    marginTop: -8,
  },
  entryContainer: {
    gap: 12,
  },
  labelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelChip: {
    marginRight: 0,
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
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    marginRight: 0,
  },
});

export default React.memo(AddContactModal);
