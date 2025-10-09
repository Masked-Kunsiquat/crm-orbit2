import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Linking, Alert, ScrollView } from 'react-native';
import { Appbar, FAB, Searchbar, Text, Chip } from 'react-native-paper';
import ContactCard from '../components/ContactCard';
import AddContactModal from '../components/AddContactModal';
import { contactsDB, contactsInfoDB, categoriesDB, categoriesRelationsDB } from '../database';

export default function ContactsList({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadContacts();
    loadCategories();
  }, []);

  useEffect(() => {
    // Reload contacts when category filter changes
    loadContacts();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const allCategories = await categoriesDB.getAll();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);

      // Get contacts based on selected category filter
      let allContacts;
      if (selectedCategory) {
        // Get contacts for specific category
        allContacts = await categoriesRelationsDB.getContactsByCategory(selectedCategory.id);
      } else {
        // Get all contacts
        allContacts = await contactsDB.getAll();
      }

      // Fetch contact info and categories for each contact
      const contactsWithInfo = await Promise.all(
        allContacts.map(async (contact) => {
          const contactWithInfo = await contactsInfoDB.getWithContactInfo(contact.id);

          // Extract primary phone and email for easy access
          const phones = (contactWithInfo.contact_info || []).filter(info => info.type === 'phone');
          const emails = (contactWithInfo.contact_info || []).filter(info => info.type === 'email');

          // Get categories for this contact
          const contactCategories = await categoriesRelationsDB.getCategoriesForContact(contact.id);

          return {
            ...contactWithInfo,
            phone: phones.find(p => p.is_primary)?.value || phones[0]?.value || null,
            email: emails.find(e => e.is_primary)?.value || emails[0]?.value || null,
            categories: contactCategories,
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
    navigation.navigate('ContactDetail', { contactId: contact.id });
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

  const handleMessage = async (contact) => {
    if (contact.phone) {
      const smsUrl = `sms:${contact.phone.replace(/\D/g, '')}`;
      try {
        await Linking.openURL(smsUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to send message');
      }
    }
  };

  const handleEmail = async (contact) => {
    if (contact.email) {
      const mailUrl = `mailto:${contact.email}`;
      try {
        await Linking.openURL(mailUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to open email');
      }
    }
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
      onCall={() => handleCall(item)}
      onMessage={() => handleMessage(item)}
      onEmail={() => handleEmail(item)}
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

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <Chip
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
            style={styles.categoryChip}
            mode="flat"
          >
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              selected={selectedCategory?.id === category.id}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory?.id === category.id && { backgroundColor: category.color }
              ]}
              mode="flat"
              icon={category.icon}
            >
              {category.name}
            </Chip>
          ))}
        </ScrollView>
      )}

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
  categoryFilter: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 0,
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