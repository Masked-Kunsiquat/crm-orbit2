import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, Button, useTheme, FAB, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useContactsWithInfo } from '../hooks/queries/useContactQueries';
import { useUpcomingEvents } from '../hooks/queries/useEventQueries';
import { useInteractions } from '../hooks/queries/useInteractionQueries';
import { logger } from '../errors/utils/errorLogger';
import AddContactModal from '../components/AddContactModal';
import AddInteractionModal from '../components/AddInteractionModal';
import AddEventModal from '../components/AddEventModal';

export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const theme = useTheme();
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
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('dashboard.title')} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Quick Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineLarge" style={[styles.statNumber, { color: theme.colors.onPrimaryContainer }]}>
                {contactCount}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.statLabel, { color: theme.colors.onPrimaryContainer }]}
              >
                {t('dashboard.stats.contacts')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineLarge" style={[styles.statNumber, { color: theme.colors.onSecondaryContainer }]}>
                {interactionCount}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.statLabel, { color: theme.colors.onSecondaryContainer }]}
              >
                {t('dashboard.stats.interactions')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineLarge" style={[styles.statNumber, { color: theme.colors.onTertiaryContainer }]}>
                {eventCount}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.statLabel, { color: theme.colors.onTertiaryContainer }]}
              >
                {t('dashboard.stats.events')}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Upcoming Events */}
        <Card style={styles.card}>
          <Card.Title
            title={t('dashboard.upcomingEvents.title')}
            subtitle={t('dashboard.upcomingEvents.subtitle')}
            right={(props) => (
              <IconButton
                {...props}
                icon="calendar-plus"
                onPress={() => setShowAddEventModal(true)}
              />
            )}
          />
          <Card.Content>
            {loadingEvents ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('dashboard.loading')}
              </Text>
            ) : events.length === 0 ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('dashboard.upcomingEvents.empty')}
              </Text>
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
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Title title={t('dashboard.quickActions.title')} />
          <Card.Content>
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
          </Card.Content>
        </Card>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    width: '100%',
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
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
