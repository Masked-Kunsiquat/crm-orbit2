import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  TextInput,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import ModalSection from './ModalSection';
import { useUpdateCompany } from '../hooks/queries';
import { showAlert } from '../errors';
import { hasContent } from '../utils/stringHelpers';
import { INDUSTRIES, getIndustryLabel } from '../constants/industries';

export default function EditCompanyModal({ visible, company, onDismiss }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showIndustryMenu, setShowIndustryMenu] = useState(false);

  const updateCompanyMutation = useUpdateCompany();

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setIndustry(company.industry || '');
      setWebsite(company.website || '');
      setAddress(company.address || '');
      setNotes(company.notes || '');
    }
  }, [company]);

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
        t('companies.edit.validation.title'),
        t('companies.edit.validation.requiredName')
      );
      return;
    }

    if (name.length > 200) {
      showAlert.error(
        t('companies.edit.validation.title'),
        t('companies.edit.validation.nameTooLong')
      );
      return;
    }

    if (!company) {
      return;
    }

    try {
      await updateCompanyMutation.mutateAsync({
        id: company.id,
        data: {
          name: name.trim(),
          industry: industry || null,
          website: website.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        },
      });

      resetForm();
      onDismiss();
      showAlert.success(t('labels.success'), t('companies.edit.success'));
    } catch (error) {
      showAlert.error(
        t('companies.edit.error.title'),
        t('companies.edit.error.message')
      );
    }
  };

  if (!company) {
    return null;
  }

  return (
    <BaseModal
      visible={visible}
      onDismiss={handleCancel}
      title={t('companies.edit.title')}
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
          loading: updateCompanyMutation.isPending,
          disabled: updateCompanyMutation.isPending,
        },
      ]}
      maxHeight={0.85}
    >
      <ModalSection title={t('companies.edit.labels.name')}>
        <TextInput
          label={t('companies.edit.labels.name')}
          value={name}
          onChangeText={setName}
          mode="outlined"
          maxLength={200}
          autoFocus
        />
      </ModalSection>

      <ModalSection title={t('companies.edit.labels.industry')}>
        <Menu
          visible={showIndustryMenu}
          onDismiss={() => setShowIndustryMenu(false)}
          anchor={
            <TextInput
              label={t('companies.edit.labels.industry')}
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

      <ModalSection title={t('companies.edit.labels.website')}>
        <TextInput
          label={t('companies.edit.labels.website')}
          value={website}
          onChangeText={setWebsite}
          mode="outlined"
          keyboardType="url"
          autoCapitalize="none"
          placeholder={t('companies.edit.placeholders.website')}
        />
      </ModalSection>

      <ModalSection title={t('companies.edit.labels.address')}>
        <TextInput
          label={t('companies.edit.labels.address')}
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={2}
        />
      </ModalSection>

      <ModalSection title={t('companies.edit.labels.notes')} last>
        <TextInput
          label={t('companies.edit.labels.notes')}
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
