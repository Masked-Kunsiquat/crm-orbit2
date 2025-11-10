import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView, TouchableOpacity } from 'react-native';
import { Appbar, FAB, Chip, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { contactsDB } from '../database';
import { useEvents } from '../hooks/queries';
import AddEventModal from '../components/AddEventModal';
import { compareDates, formatDateSmart } from '../utils/dateUtils';
import { logger } from '../errors';
import { getContactDisplayName } from '../utils/contactHelpers';

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
        logger.error('EventsList', 'loadContacts', error);
      }
    };

    if (events.length > 0) {
      loadContacts();
    }
  }, [events]);

  // Filter and sort events using proper local date handling
  const filteredEvents = React.useMemo(() => {
    let filtered = [...events];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(e => e.event_type === selectedType);
    }

    // Sort by date using compareDates helper (handles YYYY-MM-DD as local dates)
    filtered.sort((a, b) => {
      const comparison = compareDates(a.event_date, b.event_date);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [events, selectedType, sortOrder]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleEventPress = (event) => {
    setEditingEvent(event);
    setShowAddModal(true);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const renderEvent = ({ item }) => {
    const contact = contacts[item.contact_id];
    const eventDate = formatDateSmart(item.event_date, t);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventInfo}>
            <Text variant="titleMedium" style={[styles.eventTitle, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            {contact && (
              <Text variant="bodySmall" style={[styles.contactName, { color: theme.colors.onSurfaceVariant }]}>
                {getContactDisplayName(contact)}
              </Text>
            )}
          </View>
          <View style={styles.eventMeta}>
            <Text variant="bodySmall" style={[styles.eventDate, { color: theme.colors.onSurfaceVariant }]}>
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
          <Text variant="bodySmall" style={[styles.eventNotes, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        {t('events.emptyTitle')}
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyMessage, { color: theme.colors.onSurfaceVariant }]}>
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

      {/* Add/Edit Event Modal */}
      <AddEventModal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onEventAdded={() => refetch()}
        onEventUpdated={() => refetch()}
        onEventDeleted={() => refetch()}
        editingEvent={editingEvent}
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
  },
  eventCard: {
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
  },
  eventMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  eventDate: {
    marginBottom: 4,
  },
  typeChip: {
    height: 24,
  },
  eventNotes: {
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
