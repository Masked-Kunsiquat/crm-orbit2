import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Linking, Alert, ScrollView } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Appbar, FAB, Searchbar, Text, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ContactCard from '../components/ContactCard';
import AddContactModal from '../components/AddContactModal';
import { contactsDB, contactsInfoDB, categoriesDB, categoriesRelationsDB } from '../database';
import { useSettings } from '../context/SettingsContext';

export default function ContactsList({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { leftAction, rightAction } = useSettings();

  useEffect(() => {
    loadContacts();
    loadCategories();
  }, []);

  useEffect(() => {
    // Reload contacts when category filter changes
    loadContacts();
  }, [selectedCategory]);

  // Mapping provided via SettingsContext; no local loader needed

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

      // Batch fetch related data to avoid N+1 queries
      const ids = allContacts.map(c => c.id);

      // 1) All contact_info rows for these contacts
      const allInfoRows = await contactsInfoDB.getAllInfoForContacts(ids);
      const infoByContact = new Map();
      for (const row of allInfoRows) {
        const list = infoByContact.get(row.contact_id) || [];
        list.push(row);
        infoByContact.set(row.contact_id, list);
      }

      // 2) All categories for these contacts
      const allCatRows = await categoriesRelationsDB.getCategoriesForContacts(ids);
      const catsByContact = new Map();
      for (const row of allCatRows) {
        const list = catsByContact.get(row.contact_id) || [];
        // Strip contact_id if you prefer category objects only
        const { contact_id, ...cat } = row;
        list.push(cat);
        catsByContact.set(row.contact_id, list);
      }

      // Merge once
      const contactsWithInfo = allContacts.map(c => {
        const contact_info = infoByContact.get(c.id) || [];
        const phones = contact_info.filter(i => i.type === 'phone');
        const emails = contact_info.filter(i => i.type === 'email');
        const phone = phones.find(p => p.is_primary)?.value || phones[0]?.value || null;
        const email = emails.find(e => e.is_primary)?.value || emails[0]?.value || null;
        const categories = catsByContact.get(c.id) || [];
        return { ...c, contact_info, phone, email, categories };
      });

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

  // Left actions are revealed by a RIGHT swipe (gesture to the right)
  // so they should reflect the RIGHT-swipe mapping
  const renderLeftActions = () => (
    <View style={[
      styles.swipeAction,
      rightAction === 'call' ? styles.callAction : styles.textAction,
    ]}>
      <Text style={styles.swipeActionText}>{rightAction === 'call' ? 'Call' : 'Text'}</Text>
    </View>
  );

  // Right actions are revealed by a LEFT swipe (gesture to the left)
  // so they should reflect the LEFT-swipe mapping
  const renderRightActions = () => (
    <View style={[
      styles.swipeAction,
      leftAction === 'text' ? styles.textAction : styles.callAction,
    ]}>
      <Text style={styles.swipeActionText}>{leftAction === 'text' ? 'Text' : 'Call'}</Text>
    </View>
  );

  const renderContact = ({ item }) => {
    const canPhone = !!item.phone;
    // Keep a ref to close the swipeable after triggering an action
    const swipeRef = React.createRef();
    const onOpen = (direction) => {
      if (!canPhone) return;
      // direction refers to the side that opened: 'left' side opens on RIGHT swipe, 'right' side opens on LEFT swipe
      if (direction === 'left') {
        // Right swipe → use RIGHT-swipe mapping
        rightAction === 'call' ? handleCall(item) : handleMessage(item);
      } else if (direction === 'right') {
        // Left swipe → use LEFT-swipe mapping
        leftAction === 'text' ? handleMessage(item) : handleCall(item);
      }
      // Close the swipeable so the row resets when user returns
      setTimeout(() => {
        try { swipeRef.current?.close(); } catch {}
      }, 200);
    };
    const content = (
      <ContactCard
        contact={item}
        onPress={() => handleContactPress(item)}
      />
    );
    // Only enable swipe when a phone number exists
    if (!canPhone) return content;
    return (
      <Swipeable
        ref={swipeRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={onOpen}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
      >
        {content}
      </Swipeable>
    );
  };

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
    <View style={[styles.container, { backgroundColor: theme.colors?.background }]}>
      <Appbar.Header>
        <Appbar.Content title={t('navigation.contacts')} />
      </Appbar.Header>

      <Searchbar
        placeholder={t('search.contactsPlaceholder')}
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
            compact
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
              compact
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
    maxHeight: 40,
    marginBottom: 8,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    marginRight: 0,
    height: 32,
  },
  list: {
    flex: 1,
  },
  swipeAction: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 8,
  },
  callAction: {
    backgroundColor: '#C8E6C9',
  },
  textAction: {
    backgroundColor: '#BBDEFB',
    alignItems: 'flex-end',
  },
  swipeActionText: {
    fontWeight: '600',
    color: '#1f1f1f',
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
