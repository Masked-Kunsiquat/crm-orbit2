import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView } from 'react-native';
import { Appbar, FAB, Chip, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { contactsDB } from '../database';
import { useEvents } from '../hooks/queries';

const EVENT_TYPES = [
  { value: 'all', i18n: 'events.filters.all', icon: 'calendar' },
  { value: 'birthday', i18n: 'events.filters.birthday', icon: 'cake-variant' },
  { value: 'anniversary', i18n: 'events.filters.anniversary', icon: 'heart' },
  { value: 'meeting', i18n: 'events.filters.meeting', icon: 'calendar-account' },
  { value: 'deadline', i18n: 'events.filters.deadline', icon: 'clock-alert' },
  { value: 'other', i18n: 'events.filters.other', icon: 'calendar-star' },
];

export default function EventsList({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = soonest first, 'desc' = latest first

  // Use TanStack Query for events data
  const { data: events = [], isLoading: loading, refetch, isFetching: refreshing } = useEvents({
    limit: 500,
    orderBy: 'event_date',
    orderDir: 'ASC',
  });

  // Load contacts when events change
  useEffect(() => {
    const loadContacts = async () => {
      const contactIds = [...new Set(events.map(e => e.contact_id))];

      try {
        // Batch fetch all contacts in a single query
        const contactsList = await contactsDB.getByIds(contactIds);
        const contactsMap = Object.fromEntries(
          contactsList.map(c => [c.id, c])
        );
        setContacts(contactsMap);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    if (events.length > 0) {
      loadContacts();
    }
  }, [events]);

  // Filter and sort events
  const filteredEvents = React.useMemo(() => {
    let filtered = [...events];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(e => e.event_type === selectedType);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.event_date || 0);
      const dateB = new Date(b.event_date || 0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [events, selectedType, sortOrder]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleEventPress = (event) => {
    // Navigate to event detail or show modal
    setSelectedEvent(event);
    // TODO: Show event detail modal
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) {
      return t('events.today');
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return t('events.tomorrow');
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderEvent = ({ item }) => {
    const contact = contacts[item.contact_id];
    const eventDate = formatEventDate(item.event_date);

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventInfo}>
            <Text variant="titleMedium" style={styles.eventTitle}>
              {item.title}
            </Text>
            {contact && (
              <Text variant="bodySmall" style={styles.contactName}>
                {contact.display_name || `${contact.first_name} ${contact.last_name || ''}`}
              </Text>
            )}
          </View>
          <View style={styles.eventMeta}>
            <Text variant="bodySmall" style={styles.eventDate}>
              {eventDate}
            </Text>
            <Chip
              compact
              mode="outlined"
              icon={EVENT_TYPES.find(t => t.value === item.event_type)?.icon || 'calendar'}
              style={styles.typeChip}
            >
              {t(`events.types.${item.event_type}`)}
            </Chip>
          </View>
        </View>
        {item.notes && (
          <Text variant="bodySmall" style={styles.eventNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {t('events.emptyTitle')}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        {t('events.emptyMessage')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.background }]}>
      <Appbar.Header>
        <Appbar.Content title={t('events.title')} />
        <Appbar.Action
          icon={sortOrder === 'asc' ? 'sort-calendar-ascending' : 'sort-calendar-descending'}
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
        {EVENT_TYPES.map((type) => (
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

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={
          filteredEvents.length === 0 ? styles.emptyContainer : styles.listContent
        }
      />

      {/* FAB for adding new event */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddEvent}
      />

      {/* TODO: Add Event Modal */}
      {/* TODO: Event Detail Modal */}
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
  eventCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  contactName: {
    color: '#666',
  },
  eventMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  eventDate: {
    color: '#666',
    marginBottom: 4,
  },
  typeChip: {
    height: 24,
  },
  eventNotes: {
    color: '#888',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
