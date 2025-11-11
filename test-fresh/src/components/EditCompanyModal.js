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
  Menu,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUpdateCompany } from '../hooks/queries';
import { showAlert } from '../errors';
import { hasContent } from '../utils/stringHelpers';

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Education',
  'Consulting',
  'Real Estate',
  'Other',
];

export default function EditCompanyModal({ visible, company, onDismiss }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showIndustryMenu, setShowIndustryMenu] = useState(false);

  // Use TanStack Query mutation
  const updateCompanyMutation = useUpdateCompany();

  // Populate form when company changes
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
      showAlert.error('Validation Error', 'Company name is required');
      return;
    }

    if (name.length > 200) {
      showAlert.error('Validation Error', 'Company name must be 200 characters or less');
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
      showAlert.success('Success', 'Company updated successfully');
    } catch (error) {
      showAlert.error('Error', 'Failed to update company');
    }
  };

  if (!company) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text variant="headlineSmall">Edit Company</Text>
            <IconButton icon="close" onPress={handleCancel} />
          </View>

          <ScrollView style={styles.scrollView}>
            <TextInput
              label="Company Name *"
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
                  label="Industry"
                  value={industry}
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Icon icon="chevron-down" />}
                  onFocus={() => setShowIndustryMenu(true)}
                  showSoftInputOnFocus={false}
                />
              }
            >
              {INDUSTRIES.map((ind) => (
                <Menu.Item
                  key={ind}
                  onPress={() => {
                    setIndustry(ind);
                    setShowIndustryMenu(false);
                  }}
                  title={ind}
                />
              ))}
            </Menu>

            <TextInput
              label="Website"
              value={website}
              onChangeText={setWebsite}
              mode="outlined"
              style={styles.input}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="https://example.com"
            />

            <TextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
            />

            <TextInput
              label="Notes"
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
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              loading={updateCompanyMutation.isPending}
              disabled={updateCompanyMutation.isPending}
            >
              Save
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
