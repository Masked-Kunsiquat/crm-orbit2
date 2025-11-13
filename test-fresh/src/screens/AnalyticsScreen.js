import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, Chip, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useContacts } from '../hooks/queries/useContactQueries';
import { useInteractions } from '../hooks/queries/useInteractionQueries';
import { useEvents } from '../hooks/queries/useEventQueries';
import { useInteractionStats, useTopContacts } from '../hooks/queries/useAnalyticsQueries';
import { logger } from '../errors/utils/errorLogger';

export default function AnalyticsScreen({ navigation }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('all'); // 'all', '7days', '30days', '90days'

  // Calculate date range
  const getDateRangeFilter = () => {
    if (dateRange === 'all') return {};

    const now = new Date();
    const daysAgo = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
    }[dateRange];

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - daysAgo);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  const dateFilter = getDateRangeFilter();

  // Fetch data
  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useContacts();
  const { data: interactions = [], isLoading: loadingInteractions, refetch: refetchInteractions } = useInteractions();
  const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents } = useEvents();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useInteractionStats(dateFilter);
  const { data: topContacts = [], isLoading: loadingTopContacts, refetch: refetchTopContacts } = useTopContacts({ limit: 5, ...dateFilter });

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        refetchContacts(),
        refetchInteractions(),
        refetchEvents(),
        refetchStats(),
        refetchTopContacts(),
      ]);
    } catch (error) {
      logger.error('AnalyticsScreen', 'handleRefresh', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = loadingContacts || loadingInteractions || loadingEvents || loadingStats || loadingTopContacts;

  // Calculate analytics
  const totalContacts = contacts.length;
  const totalInteractions = interactions.length;
  const totalEvents = events.length;

  // Events breakdown
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= now).length;
  const pastEvents = events.filter(e => new Date(e.event_date) < now).length;

  // Interaction types breakdown
  const interactionTypes = interactions.reduce((acc, interaction) => {
    const type = interaction.custom_type || interaction.interaction_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={t('analytics.title')} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Date Range Filter */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('analytics.dateRange.title')}
            </Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={dateRange === 'all'}
                onPress={() => setDateRange('all')}
                style={styles.chip}
              >
                {t('analytics.dateRange.all')}
              </Chip>
              <Chip
                selected={dateRange === '7days'}
                onPress={() => setDateRange('7days')}
                style={styles.chip}
              >
                {t('analytics.dateRange.7days')}
              </Chip>
              <Chip
                selected={dateRange === '30days'}
                onPress={() => setDateRange('30days')}
                style={styles.chip}
              >
                {t('analytics.dateRange.30days')}
              </Chip>
              <Chip
                selected={dateRange === '90days'}
                onPress={() => setDateRange('90days')}
                style={styles.chip}
              >
                {t('analytics.dateRange.90days')}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Overview Stats */}
        <Card style={styles.card}>
          <Card.Title title={t('analytics.overview.title')} />
          <Card.Content>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {totalContacts}
                </Text>
                <Text variant="bodyMedium">{t('analytics.overview.totalContacts')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.secondary }]}>
                  {totalInteractions}
                </Text>
                <Text variant="bodyMedium">{t('analytics.overview.totalInteractions')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.tertiary }]}>
                  {totalEvents}
                </Text>
                <Text variant="bodyMedium">{t('analytics.overview.totalEvents')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Interaction Breakdown */}
        <Card style={styles.card}>
          <Card.Title title={t('analytics.interactions.title')} />
          <Card.Content>
            {Object.keys(interactionTypes).length === 0 ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('analytics.interactions.empty')}
              </Text>
            ) : (
              Object.entries(interactionTypes).map(([type, count]) => (
                <View key={type} style={styles.breakdownItem}>
                  <Text variant="bodyLarge" style={styles.breakdownType}>
                    {t(`interactions.filters.${type}`, type)}
                  </Text>
                  <Text variant="bodyLarge" style={[styles.breakdownCount, { color: theme.colors.primary }]}>
                    {count}
                  </Text>
                </View>
              ))
            )}
            {stats && stats.totalInteractions > 0 && (
              <View style={styles.statsDetail}>
                <Text variant="bodySmall" style={styles.mutedText}>
                  {t('analytics.interactions.uniqueContacts', { count: stats.uniqueContacts || 0 })}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Event Breakdown */}
        <Card style={styles.card}>
          <Card.Title title={t('analytics.events.title')} />
          <Card.Content>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.tertiary }]}>
                  {upcomingEvents}
                </Text>
                <Text variant="bodyMedium">{t('analytics.events.upcoming')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.outline }]}>
                  {pastEvents}
                </Text>
                <Text variant="bodyMedium">{t('analytics.events.past')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Top Contacts */}
        <Card style={styles.card}>
          <Card.Title title={t('analytics.topContacts.title')} />
          <Card.Content>
            {loadingTopContacts ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('dashboard.loading')}
              </Text>
            ) : topContacts.length === 0 ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('analytics.topContacts.empty')}
              </Text>
            ) : (
              topContacts.map((contact, index) => (
                <View key={contact.id} style={styles.topContactItem}>
                  <View style={styles.topContactRank}>
                    <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.topContactInfo}>
                    <Text variant="bodyLarge">{contact.display_name}</Text>
                    <Text variant="bodySmall" style={styles.mutedText}>
                      {t('analytics.topContacts.interactionCount', { count: contact.interaction_count })}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                    {contact.interaction_count}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 100,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  breakdownType: {
    flex: 1,
    textTransform: 'capitalize',
  },
  breakdownCount: {
    fontWeight: 'bold',
  },
  statsDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  mutedText: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  topContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  topContactRank: {
    width: 40,
    alignItems: 'center',
  },
  topContactInfo: {
    flex: 1,
    marginLeft: 12,
  },
});
