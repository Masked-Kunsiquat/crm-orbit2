import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView, Alert } from 'react-native';
import { Appbar, FAB, Chip, Text, useTheme, SegmentedButtons } from 'react-native-paper';
import InteractionCard from '../components/InteractionCard';
import AddInteractionModal from '../components/AddInteractionModal';
import { interactionsDB, contactsDB } from '../database';

const INTERACTION_TYPES = [
  { value: 'all', label: 'All', icon: 'format-list-bulleted' },
  { value: 'call', label: 'Calls', icon: 'phone' },
  { value: 'text', label: 'Texts', icon: 'message-text' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'meeting', label: 'Meetings', icon: 'calendar-account' },
  { value: 'other', label: 'Other', icon: 'note-text' },
];

export default function InteractionsScreen({ navigation }) {
  const theme = useTheme();
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first

  useEffect(() => {
    loadInteractions();
  }, []);

  useEffect(() => {
    filterAndSortInteractions();
  }, [interactions, selectedType, sortOrder]);

  const loadInteractions = async () => {
    try {
      setLoading(true);

      // Fetch all interactions
      const allInteractions = await interactionsDB.getAll({
        limit: 500,
        orderBy: 'interaction_datetime',
        orderDir: 'DESC',
      });

      setInteractions(allInteractions);

      // Fetch contact information for each unique contact_id
      const contactIds = [...new Set(allInteractions.map(i => i.contact_id))];
      const contactsMap = {};

      await Promise.all(
        contactIds.map(async (contactId) => {
          try {
            const contact = await contactsDB.getById(contactId);
            if (contact) {
              contactsMap[contactId] = contact;
            }
          } catch (error) {
            console.error(`Error loading contact ${contactId}:`, error);
          }
        })
      );

      setContacts(contactsMap);
    } catch (error) {
      console.error('Error loading interactions:', error);
      Alert.alert('Error', 'Failed to load interactions');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortInteractions = () => {
    let filtered = [...interactions];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(
        i => i.interaction_type === selectedType || i.custom_type === selectedType
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.interaction_datetime || 0);
      const dateB = new Date(b.interaction_datetime || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredInteractions(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInteractions();
    setRefreshing(false);
  };

  const handleInteractionPress = (interaction) => {
    // Open in edit mode
    setEditingInteraction(interaction);
    setShowAddModal(true);
  };

  const handleAddInteraction = () => {
    setEditingInteraction(null); // Clear editing mode
    setShowAddModal(true);
  };

  const handleInteractionAdded = () => {
    loadInteractions(); // Refresh the list
  };

  const handleInteractionUpdated = () => {
    loadInteractions(); // Refresh the list
  };

  const handleInteractionDeleted = () => {
    loadInteractions(); // Refresh the list
  };

  const handleModalDismiss = () => {
    setEditingInteraction(null);
    setShowAddModal(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const renderInteraction = ({ item }) => {
    const contact = contacts[item.contact_id];

    return (
      <InteractionCard
        interaction={item}
        contact={contact}
        onPress={() => handleInteractionPress(item)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Interactions Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        {selectedType !== 'all'
          ? `No ${selectedType} interactions yet.`
          : 'Add your first interaction to get started.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.background }]}>
      <Appbar.Header>
        <Appbar.Content title="Interactions" />
        <Appbar.Action
          icon={sortOrder === 'desc' ? 'sort-calendar-descending' : 'sort-calendar-ascending'}
          onPress={toggleSortOrder}
        />
      </Appbar.Header>

      {/* Type Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {INTERACTION_TYPES.map((type) => (
          <Chip
            key={type.value}
            selected={selectedType === type.value}
            onPress={() => setSelectedType(type.value)}
            style={styles.filterChip}
            icon={type.icon}
            mode="flat"
            compact
          >
            {type.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Interactions List */}
      <FlatList
        data={filteredInteractions}
        renderItem={renderInteraction}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={
          filteredInteractions.length === 0 ? styles.emptyContainer : styles.listContent
        }
      />

      {/* FAB for adding new interaction */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddInteraction}
      />

      {/* Add/Edit Interaction Modal */}
      <AddInteractionModal
        visible={showAddModal}
        onDismiss={handleModalDismiss}
        onInteractionAdded={handleInteractionAdded}
        onInteractionUpdated={handleInteractionUpdated}
        onInteractionDeleted={handleInteractionDeleted}
        editingInteraction={editingInteraction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterScroll: {
    maxHeight: 50,
    marginVertical: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 0,
    height: 32,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
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
