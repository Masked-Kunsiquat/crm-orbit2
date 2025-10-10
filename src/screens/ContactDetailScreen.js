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
} from 'react-native-paper';
import { contactsDB, contactsInfoDB } from '../database';
import EditContactModal from '../components/EditContactModal';

export default function ContactDetailScreen({ route, navigation }) {
  const { contactId } = route.params;
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const contactWithInfo = await contactsInfoDB.getWithContactInfo(contactId);
      setContact(contactWithInfo);
    } catch (error) {
      console.error('Error loading contact:', error);
      Alert.alert('Error', 'Failed to load contact details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (phoneNumber) => {
    const phoneUrl = `tel:${phoneNumber.replace(/\D/g, '')}`;
    try {
      await Linking.openURL(phoneUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleMessage = async (phoneNumber) => {
    const smsUrl = `sms:${phoneNumber.replace(/\D/g, '')}`;
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets && result.assets[0];
      const uri = asset?.uri;
      if (!uri) return;

      await contactsDB.update(contactId, { avatar_uri: uri });
      setShowAvatarDialog(false);
      loadContact();
    } catch (e) {
      console.error('Image pick error', e);
      Alert.alert('Error', 'Failed to set contact photo');
    }
  };

  const removePhoto = async () => {
    try {
      await contactsDB.update(contactId, { avatar_uri: null });
      setShowAvatarDialog(false);
      loadContact();
    } catch (e) {
      console.error('Remove photo error', e);
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  if (loading || !contact) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Contact" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  const phones = (contact.contact_info || []).filter(info => info.type === 'phone');
  const emails = (contact.contact_info || []).filter(info => info.type === 'email');

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="" />
        <Appbar.Action icon="pencil" onPress={handleEdit} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Header Section - iOS style */}
        <View style={styles.header}>
          <Pressable onPress={() => setShowAvatarDialog(true)}>
            {contact.avatar_uri ? (
              <Avatar.Image size={100} source={{ uri: contact.avatar_uri }} style={styles.avatar} />
            ) : (
              <Avatar.Text
                size={100}
                label={getInitials(contact.first_name, contact.last_name)}
                style={styles.avatar}
              />
            )}
          </Pressable>
          <Text variant="headlineMedium" style={styles.name}>
            {contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
          </Text>
          {contact.company_id && (
            <Text variant="bodyMedium" style={styles.company}>
              {contact.job_title || 'Company'}
            </Text>
          )}
        </View>

        {/* Quick Actions - Material Design style */}
        <View style={styles.quickActions}>
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="message-text"
                size={24}
                mode="contained"
                containerColor="#1976d2"
                iconColor="#fff"
                onPress={() => handleMessage(phones[0].value)}
              />
              <Text variant="labelSmall" style={styles.actionLabel}>message</Text>
            </View>
          )}
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="phone"
                size={24}
                mode="contained"
                containerColor="#1976d2"
                iconColor="#fff"
                onPress={() => handleCall(phones[0].value)}
              />
              <Text variant="labelSmall" style={styles.actionLabel}>call</Text>
            </View>
          )}
          {emails.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="email"
                size={24}
                mode="contained"
                containerColor="#1976d2"
                iconColor="#fff"
                onPress={() => handleEmail(emails[0].value)}
              />
              <Text variant="labelSmall" style={styles.actionLabel}>email</Text>
            </View>
          )}
        </View>

        {/* Phone Numbers Section - iOS grouped list style */}
        {phones.length > 0 && (
          <Surface style={styles.section} elevation={0}>
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
          <Surface style={styles.section} elevation={0}>
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

        {/* Delete Button - iOS style at bottom */}
        <Surface style={styles.section} elevation={0}>
          <List.Item
            title="Delete Contact"
            titleStyle={styles.deleteText}
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

      <Portal>
        <Dialog visible={showAvatarDialog} onDismiss={() => setShowAvatarDialog(false)}>
          <Dialog.Title>Contact Photo</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Add or remove a profile picture.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {contact.avatar_uri ? (
              <Button onPress={removePhoto} textColor="#d32f2f">Remove</Button>
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
  spacer: {
    height: 40,
  },
});
