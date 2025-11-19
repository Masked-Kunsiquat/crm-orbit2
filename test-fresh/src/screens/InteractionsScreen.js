import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView } from 'react-native';
import { Appbar, FAB, Chip, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import InteractionCard from '../components/InteractionCard';
import AddInteractionModal from '../components/AddInteractionModal';
import InteractionDetailModal from '../components/InteractionDetailModal';
import { EmptyState } from '../components/layout';
import { contactsDB } from '../database';
import { useInteractions } from '../hooks/queries';
import { logger } from '../errors';
import { unique } from '../utils/arrayHelpers';

const INTERACTION_TYPES = [
  {
    value: 'all',
    i18n: 'interactions.filters.all',
    icon: 'format-list-bulleted',
  },
  { value: 'call', i18n: 'interactions.filters.call', icon: 'phone' },
  { value: 'text', i18n: 'interactions.filters.text', icon: 'message-text' },
  { value: 'email', i18n: 'interactions.filters.email', icon: 'email' },
  {
    value: 'meeting',
    i18n: 'interactions.filters.meeting',
    icon: 'calendar-account',
  },
  { value: 'other', i18n: 'interactions.filters.other', icon: 'note-text' },
];

export default function InteractionsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first

  // Use TanStack Query for interactions data
  const {
    data: interactions = [],
    isLoading: loading,
    refetch,
    isFetching: refreshing,
  } = useInteractions({
    limit: 500,
    orderBy: 'interaction_datetime',
    orderDir: 'DESC',
  });

  // Load contacts when interactions change
  useEffect(() => {
    const loadContacts = async () => {
      const contactIds = unique(interactions.map(i => i.contact_id));

      try {
        // Batch fetch all contacts in a single query
        const contactsList = await contactsDB.getByIds(contactIds);
        const contactsMap = Object.fromEntries(
          contactsList.map(c => [c.id, c])
        );
        setContacts(contactsMap);
      } catch (error) {
        logger.error('InteractionsScreen', 'loadContacts', error);
      }
    };

    if (interactions.length > 0) {
      loadContacts();
    }
  }, [interactions]);

  // Filter and sort interactions
  const filteredInteractions = React.useMemo(() => {
    let filtered = [...interactions];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(
        i =>
          i.interaction_type === selectedType || i.custom_type === selectedType
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.interaction_datetime || 0);
      const dateB = new Date(b.interaction_datetime || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [interactions, selectedType, sortOrder]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleInteractionPress = interaction => {
    // Regular tap - show detail modal
    setSelectedInteraction(interaction);
    setShowDetailModal(true);
  };

  const handleInteractionLongPress = interaction => {
    // Long press - open in edit mode
    setEditingInteraction(interaction);
    setShowAddModal(true);
  };

  const handleAddInteraction = () => {
    setEditingInteraction(null); // Clear editing mode
    setShowAddModal(true);
  };

  const handleDetailEdit = () => {
    // User clicked edit from detail modal
    setEditingInteraction(selectedInteraction);
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  const handleInteractionAdded = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionUpdated = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleInteractionDeleted = () => {
    // Query will auto-refetch due to cache invalidation from mutation
  };

  const handleModalDismiss = () => {
    setEditingInteraction(null);
    setShowAddModal(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const renderInteraction = ({ item }) => {
    const contact = contacts[item.contact_id];

    return (
      <InteractionCard
        interaction={item}
        contact={contact}
        onPress={() => handleInteractionPress(item)}
        onLongPress={() => handleInteractionLongPress(item)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <EmptyState message={t('interactions.emptyMessage')} />
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header elevated>
        <Appbar.Content title={t('interactions.title')} />
        <Appbar.Action
          icon={
            sortOrder === 'desc'
              ? 'sort-calendar-descending'
              : 'sort-calendar-ascending'
          }
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
        {INTERACTION_TYPES.map(type => (
          <Chip
            key={type.value}
            selected={selectedType === type.value}
            onPress={() => setSelectedType(type.value)}
            style={styles.filterChip}
            icon={type.icon}
            mode="flat"
            compact
          >
            {t(type.i18n)}
          </Chip>
        ))}
      </ScrollView>

      {/* Interactions List */}
      <FlatList
        data={filteredInteractions}
        renderItem={renderInteraction}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={
          filteredInteractions.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
      />

      {/* FAB for adding new interaction */}
      <FAB icon="plus" style={styles.fab} onPress={handleAddInteraction} />

      {/* Detail Modal */}
      <InteractionDetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        interaction={selectedInteraction}
        contact={
          selectedInteraction ? contacts[selectedInteraction.contact_id] : null
        }
        onEdit={handleDetailEdit}
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
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
