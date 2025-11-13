import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useContacts } from '../hooks/queries/useContactQueries';
import { useInteractions } from '../hooks/queries/useInteractionQueries';
import { useEvents } from '../hooks/queries/useEventQueries';
import { useInteractionStats, useTopContacts } from '../hooks/queries/useAnalyticsQueries';
import { logger } from '../errors/utils/errorLogger';
import { ScreenContainer, StatsCard, StatsRow, SectionCard, EmptyState } from '../components/layout';

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
    <ScreenContainer
      title={t('analytics.title')}
      navigation={navigation}
      showBackButton
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Date Range Filter */}
      <SectionCard>
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
      </SectionCard>

      {/* Overview Stats */}
      <StatsRow>
        <StatsCard
          value={totalContacts}
          label={t('analytics.overview.totalContacts')}
          variant="primary"
        />
        <StatsCard
          value={totalInteractions}
          label={t('analytics.overview.totalInteractions')}
          variant="secondary"
        />
        <StatsCard
          value={totalEvents}
          label={t('analytics.overview.totalEvents')}
          variant="tertiary"
        />
      </StatsRow>

      {/* Interaction Breakdown */}
      <SectionCard title={t('analytics.interactions.title')}>
        {Object.keys(interactionTypes).length === 0 ? (
          <EmptyState message={t('analytics.interactions.empty')} />
        ) : (
          <>
            {Object.entries(interactionTypes).map(([type, count]) => (
              <View key={type} style={styles.breakdownItem}>
                <Text variant="bodyLarge" style={styles.breakdownType}>
                  {t(`interactions.filters.${type}`, type)}
                </Text>
                <Text variant="bodyLarge" style={[styles.breakdownCount, { color: theme.colors.primary }]}>
                  {count}
                </Text>
              </View>
            ))}
            {stats && stats.totalInteractions > 0 && (
              <View style={styles.statsDetail}>
                <Text variant="bodySmall" style={styles.mutedText}>
                  {t('analytics.interactions.uniqueContacts', { count: stats.uniqueContacts || 0 })}
                </Text>
              </View>
            )}
          </>
        )}
      </SectionCard>

      {/* Event Breakdown */}
      <SectionCard title={t('analytics.events.title')}>
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
      </SectionCard>

      {/* Top Contacts */}
      <SectionCard title={t('analytics.topContacts.title')}>
        {loadingTopContacts ? (
          <EmptyState message={t('dashboard.loading')} />
        ) : topContacts.length === 0 ? (
          <EmptyState message={t('analytics.topContacts.empty')} />
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
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
