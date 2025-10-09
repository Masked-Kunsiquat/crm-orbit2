import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Linking, Alert } from 'react-native';
import { Appbar, FAB, Searchbar, Text } from 'react-native-paper';
import ContactCard from '../components/ContactCard';
import { contactsDB } from '../database';

export default function ContactsList() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Get all contacts (the method is just getAll, not getAllWithCompany)
      const allContacts = await contactsDB.getAll();
      setContacts(allContacts);
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

  const handleAddContact = () => {
    Alert.alert('Add Contact', 'Add contact functionality would go here');
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