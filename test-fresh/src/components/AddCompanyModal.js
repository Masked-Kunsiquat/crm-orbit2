import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
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

  // Use TanStack Query mutation
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
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text variant="headlineSmall">{t('companies.add.title')}</Text>
            <IconButton icon="close" onPress={handleCancel} />
          </View>

          <ScrollView style={styles.scrollView}>
            <TextInput
              label={t('companies.add.labels.name')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              maxLength={200}
              autoFocus
            />

            <Menu
              visible={showIndustryMenu}
              onDismiss={() => setShowIndustryMenu(false)}
              anchor={
                <TextInput
                  label={t('companies.add.labels.industry')}
                  value={getIndustryLabel(industry, t)}
                  mode="outlined"
                  style={styles.input}
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

            <TextInput
              label={t('companies.add.labels.website')}
              value={website}
              onChangeText={setWebsite}
              mode="outlined"
              style={styles.input}
              keyboardType="url"
              autoCapitalize="none"
              placeholder={t('companies.add.placeholders.website')}
            />

            <TextInput
              label={t('companies.add.labels.address')}
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
            />

            <TextInput
              label={t('companies.add.labels.notes')}
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={4}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              loading={createCompanyMutation.isPending}
              disabled={createCompanyMutation.isPending}
            >
              {t('buttons.save')}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '90%',
  },
  surface: {
    borderRadius: 8,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 8,
    paddingTop: 16,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  input: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    minWidth: 100,
  },
});
