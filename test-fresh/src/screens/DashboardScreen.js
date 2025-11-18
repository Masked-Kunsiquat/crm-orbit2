import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useContactsWithInfo } from '../hooks/queries/useContactQueries';
import { useUpcomingEvents } from '../hooks/queries/useEventQueries';
import { useInteractions } from '../hooks/queries/useInteractionQueries';
import { logger } from '../errors/utils/errorLogger';
import AddContactModal from '../components/AddContactModal';
import AddInteractionModal from '../components/AddInteractionModal';
import AddEventModal from '../components/AddEventModal';
import { ScreenContainer, StatsCard, StatsRow, SectionCard, EmptyState } from '../components/layout';

export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Fetch data using TanStack Query
  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useContactsWithInfo();
  const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents } = useUpcomingEvents();
  const { data: interactions = [], isLoading: loadingInteractions, refetch: refetchInteractions } = useInteractions();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        refetchContacts(),
        refetchEvents(),
        refetchInteractions(),
      ]);
    } catch (error) {
      logger.error('DashboardScreen', 'handleRefresh', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = loadingContacts || loadingEvents || loadingInteractions;

  // Calculate stats
  const contactCount = contacts.length;
  const interactionCount = interactions.length;
  const eventCount = events.length;

  return (
    <ScreenContainer
      title={t('dashboard.title')}
      navigation={navigation}
      headerActions={[
        {
          icon: 'magnify',
          onPress: () => navigation.navigate('GlobalSearch'),
          accessibilityLabel: t('globalSearch.title'),
        },
        {
          icon: 'chart-bar',
          onPress: () => navigation.navigate('Analytics'),
        },
      ]}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Quick Stats Cards */}
      <StatsRow>
        <StatsCard
          value={contactCount}
          label={t('dashboard.stats.contacts')}
          variant="primary"
        />
        <StatsCard
          value={interactionCount}
          label={t('dashboard.stats.interactions')}
          variant="secondary"
        />
        <StatsCard
          value={eventCount}
          label={t('dashboard.stats.events')}
          variant="tertiary"
        />
      </StatsRow>

      {/* Upcoming Events */}
      <SectionCard
        title={t('dashboard.upcomingEvents.title')}
        subtitle={t('dashboard.upcomingEvents.subtitle')}
        actions={(props) => (
          <IconButton
            {...props}
            icon="calendar-plus"
            onPress={() => setShowAddEventModal(true)}
          />
        )}
      >
        {loadingEvents ? (
          <EmptyState message={t('dashboard.loading')} />
        ) : events.length === 0 ? (
          <EmptyState message={t('dashboard.upcomingEvents.empty')} />
        ) : (
          events.slice(0, 5).map((event, index) => (
            <View key={event.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text variant="bodyLarge">{event.title}</Text>
                <Text variant="bodySmall" style={styles.listItemSubtext}>
                  {event.event_date} {event.event_time ? `• ${event.event_time}` : ''}
                </Text>
              </View>
              {event.recurring && (
                <IconButton icon="repeat" size={16} />
              )}
            </View>
          ))
        )}
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard title={t('dashboard.quickActions.title')}>
        <View style={styles.quickActionsGrid}>
          <Button
            mode="contained-tonal"
            icon="account-plus"
            style={styles.quickActionButton}
            onPress={() => setShowAddContactModal(true)}
          >
            {t('dashboard.quickActions.addContact')}
          </Button>
          <Button
            mode="contained-tonal"
            icon="message-plus"
            style={styles.quickActionButton}
            onPress={() => setShowAddInteractionModal(true)}
          >
            {t('dashboard.quickActions.addInteraction')}
          </Button>
          <Button
            mode="contained-tonal"
            icon="calendar-plus"
            style={styles.quickActionButton}
            onPress={() => setShowAddEventModal(true)}
          >
            {t('dashboard.quickActions.addEvent')}
          </Button>
        </View>
      </SectionCard>

      {/* Modals */}
      <AddContactModal
        visible={showAddContactModal}
        onDismiss={() => setShowAddContactModal(false)}
        onContactAdded={() => {
          setShowAddContactModal(false);
          refetchContacts();
        }}
      />
      <AddInteractionModal
        visible={showAddInteractionModal}
        onDismiss={() => setShowAddInteractionModal(false)}
        onInteractionAdded={() => {
          setShowAddInteractionModal(false);
          refetchInteractions();
        }}
      />
      <AddEventModal
        visible={showAddEventModal}
        onDismiss={() => setShowAddEventModal(false)}
        onEventAdded={() => {
          setShowAddEventModal(false);
          refetchEvents();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  listItemContent: {
    flex: 1,
  },
  listItemSubtext: {
    opacity: 0.7,
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
});
