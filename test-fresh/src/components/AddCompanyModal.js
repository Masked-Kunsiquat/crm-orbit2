import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  TextInput,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import { useCreateCompany } from '../hooks/queries';
import { showAlert } from '../errors';
import { hasContent } from '../utils/stringHelpers';
import { INDUSTRIES, getIndustryLabel } from '../constants/industries';

export default function AddCompanyModal({ visible, onDismiss }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showIndustryMenu, setShowIndustryMenu] = useState(false);

  const createCompanyMutation = useCreateCompany();

  const resetForm = () => {
    setName('');
    setIndustry('');
    setWebsite('');
    setAddress('');
    setNotes('');
  };

  const handleCancel = () => {
    resetForm();
    onDismiss();
  };

  const handleSave = async () => {
    if (!hasContent(name)) {
      showAlert.error(
        t('companies.add.validation.title'),
        t('companies.add.validation.requiredName')
      );
      return;
    }

    if (name.length > 200) {
      showAlert.error(
        t('companies.add.validation.title'),
        t('companies.add.validation.nameTooLong')
      );
      return;
    }

    try {
      await createCompanyMutation.mutateAsync({
        name: name.trim(),
        industry: industry || null,
        website: website.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      resetForm();
      onDismiss();
      showAlert.success(t('labels.success'), t('companies.add.success'));
    } catch (error) {
      showAlert.error(
        t('companies.add.error.title'),
        t('companies.add.error.message')
      );
    }
  };

  return (
    <BaseModal
      visible={visible}
      onDismiss={handleCancel}
      title={t('companies.add.title')}
      headerRight={
        <IconButton
          icon="close"
          size={22}
          onPress={handleCancel}
          style={styles.iconButton}
        />
      }
      actions={[
        {
          label: t('buttons.cancel'),
          onPress: handleCancel,
          mode: 'outlined',
        },
        {
          label: t('buttons.save'),
          onPress: handleSave,
          mode: 'contained',
          loading: createCompanyMutation.isPending,
          disabled: createCompanyMutation.isPending,
        },
      ]}
      maxHeight={0.85}
    >
      <ModalSection title={t('companies.add.labels.name')}>
        <TextInput
          label={t('companies.add.labels.name')}
          value={name}
          onChangeText={setName}
          mode="outlined"
          maxLength={200}
          autoFocus
        />
      </ModalSection>

      <ModalSection title={t('companies.add.labels.industry')}>
        <Menu
          visible={showIndustryMenu}
          onDismiss={() => setShowIndustryMenu(false)}
          anchor={
            <TextInput
              label={t('companies.add.labels.industry')}
              value={getIndustryLabel(industry, t)}
              mode="outlined"
              right={<TextInput.Icon icon="chevron-down" />}
              onFocus={() => setShowIndustryMenu(true)}
              showSoftInputOnFocus={false}
            />
          }
        >
          {INDUSTRIES.map(ind => (
            <Menu.Item
              key={ind}
              onPress={() => {
                setIndustry(ind);
                setShowIndustryMenu(false);
              }}
              title={getIndustryLabel(ind, t)}
            />
          ))}
        </Menu>
      </ModalSection>

      <ModalSection title={t('companies.add.labels.website')}>
        <TextInput
          label={t('companies.add.labels.website')}
          value={website}
          onChangeText={setWebsite}
          mode="outlined"
          keyboardType="url"
          autoCapitalize="none"
          placeholder={t('companies.add.placeholders.website')}
        />
      </ModalSection>

      <ModalSection title={t('companies.add.labels.address')}>
        <TextInput
          label={t('companies.add.labels.address')}
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={2}
        />
      </ModalSection>

      <ModalSection title={t('companies.add.labels.notes')} last>
        <TextInput
          label={t('companies.add.labels.notes')}
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={4}
        />
      </ModalSection>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    margin: 0,
  },
});
