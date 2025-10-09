import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Linking, Alert } from 'react-native';
import {
  Appbar,
  Avatar,
  Text,
  Surface,
  List,
  IconButton,
  Divider,
  FAB,
} from 'react-native-paper';
import { contactsDB, contactsInfoDB } from '../database';

export default function ContactDetailScreen({ route, navigation }) {
  const { contactId } = route.params;
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

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
    Alert.alert('Edit Contact', 'Edit functionality coming soon');
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
          <Avatar.Text
            size={100}
            label={getInitials(contact.first_name, contact.last_name)}
            style={styles.avatar}
          />
          <Text variant="headlineMedium" style={styles.name}>
            {contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
          </Text>
          {contact.company_id && (
            <Text variant="bodyMedium" style={styles.company}>
              {contact.job_title || 'Company'}
            </Text>
          )}
        </View>

        {/* Quick Actions - iOS style */}
        <View style={styles.quickActions}>
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="message"
                size={24}
                mode="contained"
                containerColor="#007AFF"
                iconColor="#fff"
                onPress={() => handleMessage(phones[0].value)}
              />
              <Text variant="labelSmall">message</Text>
            </View>
          )}
          {phones.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="phone"
                size={24}
                mode="contained"
                containerColor="#007AFF"
                iconColor="#fff"
                onPress={() => handleCall(phones[0].value)}
              />
              <Text variant="labelSmall">call</Text>
            </View>
          )}
          {emails.length > 0 && (
            <View style={styles.actionButton}>
              <IconButton
                icon="email"
                size={24}
                mode="contained"
                containerColor="#007AFF"
                iconColor="#fff"
                onPress={() => handleEmail(emails[0].value)}
              />
              <Text variant="labelSmall">email</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
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
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  company: {
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5ea',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: '#ff3b30',
    textAlign: 'center',
  },
  spacer: {
    height: 40,
  },
});
