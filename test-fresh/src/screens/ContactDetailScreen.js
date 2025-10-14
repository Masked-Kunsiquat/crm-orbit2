import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Linking, Alert, Pressable } from 'react-native';
import {
  Appbar,
  Avatar,
  Text,
  Surface,
  List,
  IconButton,
  Divider,
  FAB,
  Portal,
  Dialog,
  Button,
  useTheme,
} from 'react-native-paper';
import { contactsDB, contactsInfoDB, interactionsDB, attachmentsDB } from '../database';
import { useTranslation } from 'react-i18next';
import { fileService } from '../services/fileService';
import EditContactModal from '../components/EditContactModal';
import AddInteractionModal from '../components/AddInteractionModal';
import InteractionCard from '../components/InteractionCard';
import InteractionDetailModal from '../components/InteractionDetailModal';

export default function ContactDetailScreen({ route, navigation }) {
  const { contactId } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();
  const [contact, setContact] = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [recentInteractions, setRecentInteractions] = useState([]);
  const outlineColor = theme.colors?.outlineVariant || theme.colors?.outline || '#e0e0e0';

  useEffect(() => {
    loadContact();
    loadRecentInteractions();
  }, [contactId]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const contactWithInfo = await contactsInfoDB.getWithContactInfo(contactId);
      setContact(contactWithInfo);

      // Load avatar URI from fileService if avatar_attachment_id exists
      if (contactWithInfo.avatar_attachment_id) {
        try {
          const uri = await fileService.getFileUri(contactWithInfo.avatar_attachment_id);
          setAvatarUri(uri);
        } catch (error) {
          console.warn('Failed to load avatar:', error);
          setAvatarUri(null);
        }
      } else {
        setAvatarUri(null);
      }
    } catch (error) {
      console.error('Error loading contact:', error);
      Alert.alert('Error', t('contactDetail.errorLoad'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadRecentInteractions = async () => {
    try {
      // Get recent interactions for this contact (limit to 3)
      const allInteractions = await interactionsDB.getAll({
        limit: 500,
        orderBy: 'interaction_datetime',
        orderDir: 'DESC',
      });

      // Filter by this contact
      const contactInteractions = allInteractions
        .filter(i => i.contact_id === contactId)
        .slice(0, 3);

      setRecentInteractions(contactInteractions);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    const trimmed = phoneNumber.trim();
    // Preserve leading '+' for international numbers
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
  };

  const handleCall = async (phoneNumber) => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }
    const phoneUrl = `tel:${normalized}`;
    try {
      await Linking.openURL(phoneUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleMessage = async (phoneNumber) => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }
    const smsUrl = `sms:${normalized}`;
    try {
      await Linking.openURL(smsUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to send message');
    }
  };

  const handleEmail = async (emailAddress) => {
    const mailUrl = `mailto:${emailAddress}`;
    try {
      await Linking.openURL(mailUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to open email');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleContactUpdated = () => {
    loadContact(); // Reload contact after edit
  };

  const handleInteractionAdded = () => {
    loadRecentInteractions(); // Reload interactions after adding
  };

  const handleInteractionUpdated = () => {
    loadRecentInteractions(); // Reload interactions after updating
  };

  const handleInteractionDeleted = () => {
    loadRecentInteractions(); // Reload interactions after deleting
  };

  const handleInteractionPress = (interaction) => {
    // Regular tap - show detail modal
    setSelectedInteraction(interaction);
    setShowDetailModal(true);
  };

  const handleInteractionLongPress = (interaction) => {
    // Long press - open in edit mode
    setEditingInteraction(interaction);
    setShowAddInteractionModal(true);
  };

  const handleDetailEdit = () => {
    // User clicked edit from detail modal
    setEditingInteraction(selectedInteraction);
    setShowDetailModal(false);
    setShowAddInteractionModal(true);
  };

  const handleAddInteractionClick = () => {
    setEditingInteraction(null); // Clear editing mode
    setShowAddInteractionModal(true);
  };

  const handleModalDismiss = () => {
    setEditingInteraction(null);
    setShowAddInteractionModal(false);
  };

  const handleViewAllInteractions = () => {
    // Navigate to Interactions tab (would need to implement tab navigation focus)
    Alert.alert('View All', 'Navigate to Interactions tab to see all interactions for this contact');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.display_name || contact.first_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsDB.delete(contactId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  const pickImageFromLibrary = async () => {
    try {
      let ImagePicker;
      try {
        ImagePicker = (await import('expo-image-picker'));
      } catch (e) {
        Alert.alert('Missing dependency', 'Please install expo-image-picker to add photos.');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library permission is required to select a photo.');
        return;
      }

      // Prefer the modern API; if unavailable, omit to avoid deprecation warnings
      const mt = ImagePicker?.MediaTypeOptions?.Images ?? undefined;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mt,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets && result.assets[0];
      const uri = asset?.uri;
      if (!uri) return;

      // Save old avatar ID for cleanup after successful update
      const oldAvatarId = contact.avatar_attachment_id;

      // Save new avatar using fileService FIRST
      const fileName = asset.fileName || `avatar_${contactId}.jpg`;
      const newAttachment = await fileService.saveFile(
        uri,
        fileName,
        'contact',
        contactId
      );

      // Update contact with new avatar attachment ID
      await contactsDB.update(contactId, { avatar_attachment_id: newAttachment.id });

      // Only delete old avatar AFTER successful update
      if (oldAvatarId) {
        try {
          await fileService.deleteFile(oldAvatarId);
        } catch (cleanupError) {
          // Log but don't throw - old avatar is now orphaned but can be cleaned up later
          console.warn('Failed to delete old avatar attachment (now orphaned):', cleanupError);
          console.warn('Orphaned attachment ID:', oldAvatarId);
        }
      }

      setShowAvatarDialog(false);
      loadContact();
    } catch (e) {
      console.error('Image pick error', e);
      Alert.alert('Error', t('contactDetail.errorImageSet'));
    }
  };

  const removePhoto = async () => {
    try {
      if (contact.avatar_attachment_id) {
        await fileService.deleteFile(contact.avatar_attachment_id);
      }
      await contactsDB.update(contactId, { avatar_attachment_id: null });
      setShowAvatarDialog(false);
      loadContact();
    } catch (e) {
      console.error('Remove photo error', e);
      Alert.alert('Error', t('contactDetail.errorImageRemove'));
    }
  };

  if (loading || !contact) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('contactDetail.title')} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text>{t('contactDetail.loading')}</Text>
        </View>
      </View>
    );
  }

  const phones = (contact.contact_info || []).filter(info => info.type === 'phone');
  const emails = (contact.contact_info || []).filter(info => info.type === 'email');
  const companyName = contact.company?.name || contact.company_name;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="" />
        <Appbar.Action icon="pencil" onPress={handleEdit} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Header Section - iOS style */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Pressable onPress={() => setShowAvatarDialog(true)}>
            {avatarUri ? (
              <Avatar.Image size={100} source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <Avatar.Text
                size={100}
                label={getInitials(contact.first_name, contact.last_name)}
                style={styles.avatar}
              />
            )}
          </Pressable>
          <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onSurface }]}>
            {contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
          </Text>
          {(contact.job_title || companyName) && (
            <Text
              variant="bodyMedium"
              style={[styles.company, { color: theme.colors.onSurfaceVariant || theme.colors.onSurface }]}
            >
              {contact.job_title && companyName
                ? `${contact.job_title} at ${companyName}`
                : (contact.job_title || companyName)}
            </Text>
          )}
        </View>

        {/* Quick Actions - Material Design style */}
        <View style={[styles.quickActions, { backgroundColor: theme.colors.surface, borderBottomColor: outlineColor }]}>
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="message-text"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleMessage(phones[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>{t('labels.text')}</Text>
            </View>
          )}
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="phone"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleCall(phones[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>{t('labels.call')}</Text>
            </View>
          )}
          {emails.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="email"
                size={24}
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="#fff"
                onPress={() => handleEmail(emails[0].value)}
              />
              <Text variant="labelSmall" style={[styles.actionLabel, { color: theme.colors.primary }]}>email</Text>
            </View>
          )}
        </View>

        {/* Phone Numbers Section - iOS grouped list style */}
        {phones.length > 0 && (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            {phones.map((phone, index) => (
              <View key={phone.id}>
                <List.Item
                  title={formatPhoneNumber(phone.value)}
                  description={phone.label}
                  left={props => <List.Icon {...props} icon="phone" />}
                  right={props => (
                    <View style={styles.itemActions}>
                      <IconButton
                        icon="message"
                        size={20}
                        onPress={() => handleMessage(phone.value)}
                      />
                      <IconButton
                        icon="phone"
                        size={20}
                        onPress={() => handleCall(phone.value)}
                      />
                    </View>
                  )}
                />
                {index < phones.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        )}

        {/* Email Addresses Section */}
        {emails.length > 0 && (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            {emails.map((email, index) => (
              <View key={email.id}>
                <List.Item
                  title={email.value}
                  description={email.label}
                  left={props => <List.Icon {...props} icon="email" />}
                  right={props => (
                    <IconButton
                      icon="email"
                      size={20}
                      onPress={() => handleEmail(email.value)}
                    />
                  )}
                />
                {index < emails.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        )}

        {/* Recent Interactions Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            {t('contactDetail.recent')}
          </Text>
          <Button
            mode="text"
            onPress={handleAddInteractionClick}
            icon="plus"
            compact
          >
            {t('contactDetail.add')}
          </Button>
        </View>

        {recentInteractions.length > 0 ? (
          <View style={styles.interactionsContainer}>
            {recentInteractions.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                contact={contact}
                onPress={() => handleInteractionPress(interaction)}
                onLongPress={() => handleInteractionLongPress(interaction)}
              />
            ))}
            {recentInteractions.length >= 3 && (
              <Button
                mode="text"
                onPress={handleViewAllInteractions}
                style={styles.viewAllButton}
              >
                View All Interactions
              </Button>
            )}
          </View>
        ) : (
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <List.Item
              title="No interactions yet"
              description="Add your first interaction with this contact"
              left={props => <List.Icon {...props} icon="history" />}
              onPress={handleAddInteractionClick}
            />
          </Surface>
        )}

        {/* Delete Button - iOS style at bottom */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <List.Item
            title={t('contactDetail.delete')}
            titleStyle={[styles.deleteText, { color: theme.colors.error }]}
            onPress={handleDelete}
          />
        </Surface>

        <View style={styles.spacer} />
      </ScrollView>

      <EditContactModal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        contact={contact}
        onContactUpdated={handleContactUpdated}
      />

      <InteractionDetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        interaction={selectedInteraction}
        contact={contact}
        onEdit={handleDetailEdit}
      />

      <AddInteractionModal
        visible={showAddInteractionModal}
        onDismiss={handleModalDismiss}
        onInteractionAdded={handleInteractionAdded}
        onInteractionUpdated={handleInteractionUpdated}
        onInteractionDeleted={handleInteractionDeleted}
        preselectedContactId={contactId}
        editingInteraction={editingInteraction}
      />

      <Portal>
        <Dialog visible={showAvatarDialog} onDismiss={() => setShowAvatarDialog(false)}>
          <Dialog.Title>Contact Photo</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Add or remove a profile picture.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {avatarUri ? (
              <Button onPress={removePhoto} textColor="#d32f2f">{t('contactDetail.remove')}</Button>
            ) : null}
            <Button onPress={pickImageFromLibrary}>Add Photo</Button>
            <Button onPress={() => setShowAvatarDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#1976d2',
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#212121',
  },
  company: {
    color: '#757575',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    color: '#1976d2',
    fontWeight: '500',
  },
  section: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  interactionsContainer: {
    marginTop: 8,
  },
  viewAllButton: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  spacer: {
    height: 40,
  },
});
