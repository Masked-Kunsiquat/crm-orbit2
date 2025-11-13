import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Linking, Alert, ScrollView } from 'react-native';
import { handleError, showAlert, logger } from '../errors';
import { Swipeable } from 'react-native-gesture-handler';
import { Appbar, FAB, Searchbar, Text, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ContactCard from '../components/ContactCard';
import AddContactModal from '../components/AddContactModal';
import { EmptyState } from '../components/layout';
import { categoriesDB } from '../database';
import { useSettings } from '../context/SettingsContext';
import { useContactsWithInfo } from '../hooks/queries';
import { safeTrim } from '../utils/stringHelpers';
import { normalizePhoneNumber as normalizePhone } from '../utils/contactHelpers';

export default function ContactsList({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { leftAction, rightAction } = useSettings();

  // Use TanStack Query for enriched contacts data (with contact_info and categories)
  const { data: contactsWithInfo = [], isLoading: loading, refetch, isFetching: refreshing } = useContactsWithInfo();

  useEffect(() => {
    loadCategories();
  }, []);

  // Mapping provided via SettingsContext; no local loader needed

  const loadCategories = async () => {
    try {
      const allCategories = await categoriesDB.getAll();
      setCategories(allCategories);
    } catch (error) {
      logger.error('ContactsList', 'Error loading categories:', error);
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const handleContactPress = (contact) => {
    navigation.navigate('ContactDetail', { contactId: contact.id });
  };

  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    const trimmed = safeTrim(phoneNumber);
    // Preserve leading '+' for international numbers
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = normalizePhone(trimmed);
    if (!digitsOnly) return '';
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
  };

  const handleCall = async (contact) => {
    if (!contact.phone) {
      showAlert.error('No phone number available');
      return;
    }
    const normalized = normalizePhoneNumber(contact.phone);
    if (!normalized) {
      showAlert.error('Invalid phone number');
      return;
    }
    const phoneUrl = `tel:${normalized}`;
    try {
      await Linking.openURL(phoneUrl);
    } catch (error) {
      showAlert.error('Unable to make phone call');
    }
  };

  const handleMessage = async (contact) => {
    if (!contact.phone) {
      showAlert.error('No phone number available');
      return;
    }
    const normalized = normalizePhoneNumber(contact.phone);
    if (!normalized) {
      showAlert.error('Invalid phone number');
      return;
    }
    const smsUrl = `sms:${normalized}`;
    try {
      await Linking.openURL(smsUrl);
    } catch (error) {
      showAlert.error('Unable to send message');
    }
  };

  const handleEmail = async (contact) => {
    if (contact.email) {
      const mailUrl = `mailto:${contact.email}`;
      try {
        await Linking.openURL(mailUrl);
      } catch (error) {
        showAlert.error('Unable to open email');
      }
    }
  };

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleContactAdded = () => {
    // No need to manually refetch - TanStack Query mutations will invalidate the cache
  };

  // Filter by category
  const categoryFilteredContacts = React.useMemo(() => {
    if (!selectedCategory) return contactsWithInfo;
    // Filter by selected category
    return contactsWithInfo.filter(contact =>
      contact.categories?.some(cat => cat.id === selectedCategory.id)
    );
  }, [contactsWithInfo, selectedCategory]);

  // Filter by search query
  const filteredContacts = React.useMemo(() => {
    if (!searchQuery) return categoryFilteredContacts;
    const query = searchQuery.toLowerCase();
    return categoryFilteredContacts.filter(contact => {
      const name = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
      const displayName = (contact.display_name || '').toLowerCase();
      const company = (contact.company_name || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();

      return name.includes(query) ||
             displayName.includes(query) ||
             company.includes(query) ||
             phone.includes(query);
    });
  }, [categoryFilteredContacts, searchQuery]);

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
    <View style={styles.emptyContainer}>
      <EmptyState
        message={searchQuery ? 'No contacts match your search.' : 'Add your first contact to get started.'}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
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
            {t('common.all')}
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
              {(() => {
                const key = `categories.${category.name}`;
                const translated = t(key);
                return translated === key ? category.name : translated;
              })()}
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
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
