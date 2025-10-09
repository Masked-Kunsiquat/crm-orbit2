import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Linking, Alert } from 'react-native';
import { Appbar, FAB, Searchbar, Text } from 'react-native-paper';
import ContactCard from '../components/ContactCard';
import AddContactModal from '../components/AddContactModal';
import { contactsDB, contactsInfoDB } from '../database';

export default function ContactsList() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Get all contacts
      const allContacts = await contactsDB.getAll();

      // Fetch contact info for each contact
      const contactsWithInfo = await Promise.all(
        allContacts.map(async (contact) => {
          const contactWithInfo = await contactsInfoDB.getWithContactInfo(contact.id);

          // Extract primary phone and email for easy access
          const phones = (contactWithInfo.contact_info || []).filter(info => info.type === 'phone');
          const emails = (contactWithInfo.contact_info || []).filter(info => info.type === 'email');

          return {
            ...contactWithInfo,
            phone: phones.find(p => p.is_primary)?.value || phones[0]?.value || null,
            email: emails.find(e => e.is_primary)?.value || emails[0]?.value || null,
          };
        })
      );

      setContacts(contactsWithInfo);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleContactPress = (contact) => {
    Alert.alert(
      contact.display_name || `${contact.first_name} ${contact.last_name}`,
      `Phone: ${contact.phone || 'N/A'}\nEmail: ${contact.email || 'N/A'}`,
      [
        { text: 'OK', style: 'cancel' },
        ...(contact.phone ? [{ text: 'Call', onPress: () => handleCall(contact) }] : []),
      ]
    );
  };

  const handleCall = async (contact) => {
    if (contact.phone) {
      const phoneUrl = `tel:${contact.phone.replace(/\D/g, '')}`;
      try {
        await Linking.openURL(phoneUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to make phone call');
      }
    }
  };

  const handleEdit = (contact) => {
    Alert.alert('Edit Contact', `Edit functionality for ${contact.display_name} would go here`);
  };

  const handleDelete = (contact) => {
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
              await contactsDB.delete(contact.id);
              await loadContacts(); // Refresh the list
              Alert.alert('Success', 'Contact deleted successfully');
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleContactAdded = () => {
    loadContacts(); // Refresh the contacts list
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
    const displayName = (contact.display_name || '').toLowerCase();
    const company = (contact.company_name || '').toLowerCase();
    const phone = (contact.phone || '').toLowerCase();

    return name.includes(query) ||
           displayName.includes(query) ||
           company.includes(query) ||
           phone.includes(query);
  });

  const renderContact = ({ item }) => (
    <ContactCard
      contact={item}
      onPress={() => handleContactPress(item)}
      onEdit={() => handleEdit(item)}
      onCall={() => handleCall(item)}
      onDelete={() => handleDelete(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Contacts Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        {searchQuery ? 'No contacts match your search.' : 'Add your first contact to get started.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Contacts" />
      </Appbar.Header>

      <Searchbar
        placeholder="Search contacts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={filteredContacts.length === 0 ? styles.emptyContainer : null}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddContact}
      />

      <AddContactModal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onContactAdded={handleContactAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});