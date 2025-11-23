/**
 * Proximity Queries - TanStack Query hooks for relationship proximity data
 *
 * Provides hooks for fetching and computing proximity scores for contacts
 * based on interaction history and configurable weighting presets.
 *
 * @module hooks/queries/useProximityQueries
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useContactsWithInfo, useAllInteractions } from './index';
import { settingsDB } from '../../database';
import {
  calculateProximityScores,
  groupByProximity,
  getProximityTier,
} from '../../utils/proximityCalculator';
import {
  getPresetConfig,
  DEFAULT_PRESET,
} from '../../constants/proximityDefaults';
import { logger } from '../../errors/utils/errorLogger';

/**
 * Query keys for proximity-related queries
 */
export const proximityKeys = {
  all: ['proximity'],
  config: () => [...proximityKeys.all, 'config'],
  data: () => [...proximityKeys.all, 'data'],
  grouped: () => [...proximityKeys.all, 'grouped'],
};

/**
 * Fetch proximity configuration from settings
 *
 * Returns the current preset name and weights (resolved from preset or custom).
 */
export function useProximityConfig(options = {}) {
  return useQuery({
    queryKey: proximityKeys.config(),
    queryFn: async () => {
      try {
        // Fetch preset name from settings
        const presetSetting = await settingsDB.get('proximity.preset');
        const presetName = presetSetting?.value || DEFAULT_PRESET;

        // If custom preset, fetch custom weights
        let customWeights = null;
        if (presetName === 'custom') {
          const weightsSetting = await settingsDB.get('proximity.customWeights');
          customWeights = weightsSetting?.value || null;
        }

        // Resolve preset configuration
        const config = getPresetConfig(presetName, customWeights);

        if (!config) {
          logger.warn('ProximityQueries', 'Invalid preset config, falling back to default', {
            presetName,
            customWeights,
          });

          // Fallback to default preset
          return {
            preset: DEFAULT_PRESET,
            ...getPresetConfig(DEFAULT_PRESET),
          };
        }

        logger.success('ProximityQueries', 'useProximityConfig', {
          presetName,
          hasCustomWeights: !!customWeights,
        });

        return {
          preset: presetName,
          ...config,
        };
      } catch (error) {
        logger.error('ProximityQueries', 'useProximityConfig', error);
        // Fallback to default preset on error
        return {
          preset: DEFAULT_PRESET,
          ...getPresetConfig(DEFAULT_PRESET),
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (config changes infrequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Calculate proximity scores for all contacts
 *
 * Returns contacts enriched with proximityScore field (0-100).
 * Expensive computation - results are memoized and cached.
 */
export function useProximityScores() {
  const contacts = useContactsWithInfo();
  const allInteractions = useAllInteractions();
  const config = useProximityConfig();

  // Memoize expensive calculations
  const contactsWithScores = useMemo(() => {
    // Wait for all data to load
    if (contacts.isLoading || allInteractions.isLoading || config.isLoading) {
      return null;
    }

    if (contacts.error || allInteractions.error || config.error) {
      logger.error('ProximityQueries', 'useProximityScores',
        contacts.error || allInteractions.error || config.error
      );
      return null;
    }

    // Build interactionsByContactId map for efficient lookup
    const interactionsByContactId = {};
    (allInteractions.data || []).forEach(interaction => {
      const contactId = interaction.contact_id;
      if (!interactionsByContactId[contactId]) {
        interactionsByContactId[contactId] = [];
      }
      interactionsByContactId[contactId].push(interaction);
    });

    // Calculate scores for all contacts
    const scored = calculateProximityScores(
      contacts.data || [],
      interactionsByContactId,
      config.data
    );

    logger.success('ProximityQueries', 'useProximityScores calculated', {
      contactCount: scored.length,
      avgScore: scored.length > 0
        ? (scored.reduce((sum, c) => sum + c.proximityScore, 0) / scored.length).toFixed(1)
        : 0,
    });

    return scored;
  }, [contacts.data, allInteractions.data, config.data]);

  return {
    data: contactsWithScores,
    isLoading: contacts.isLoading || allInteractions.isLoading || config.isLoading,
    error: contacts.error || allInteractions.error || config.error,
    refetch: () => {
      contacts.refetch();
      allInteractions.refetch();
      config.refetch();
    },
  };
}

/**
 * Get contacts grouped by proximity tier
 *
 * Returns object with { inner: [], middle: [], outer: [], distant: [] },
 * each array sorted by proximity score (descending).
 *
 * This is the primary hook for the Proximity Screen UI.
 */
export function useProximityData() {
  const proximityScores = useProximityScores();

  // Memoize tier grouping
  const grouped = useMemo(() => {
    if (!proximityScores.data) {
      return null;
    }

    const groups = groupByProximity(proximityScores.data);

    logger.success('ProximityQueries', 'useProximityData grouped', {
      innerCount: groups.inner.length,
      middleCount: groups.middle.length,
      outerCount: groups.outer.length,
      distantCount: groups.distant.length,
    });

    return groups;
  }, [proximityScores.data]);

  return {
    data: grouped,
    isLoading: proximityScores.isLoading,
    error: proximityScores.error,
    refetch: proximityScores.refetch,
  };
}

/**
 * Get proximity statistics
 *
 * Returns summary statistics about proximity distribution.
 */
export function useProximityStats() {
  const proximityScores = useProximityScores();

  const stats = useMemo(() => {
    if (!proximityScores.data || proximityScores.data.length === 0) {
      return null;
    }

    const scores = proximityScores.data.map(c => c.proximityScore);
    const sum = scores.reduce((acc, val) => acc + val, 0);
    const avg = sum / scores.length;

    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const max = Math.max(...scores);
    const min = Math.min(...scores);

    // Count by tier using getTierForScore helper (single source of truth)
    const tierCounts = scores.reduce(
      (counts, score) => {
        const tierInfo = getProximityTier(score);
        counts[tierInfo.tier]++;
        return counts;
      },
      { inner: 0, middle: 0, outer: 0, distant: 0 }
    );

    return {
      totalContacts: scores.length,
      avgScore: parseFloat(avg.toFixed(1)),
      medianScore: parseFloat(median.toFixed(1)),
      maxScore: max,
      minScore: min,
      tierCounts,
    };
  }, [proximityScores.data]);

  return {
    data: stats,
    isLoading: proximityScores.isLoading,
    error: proximityScores.error,
  };
}
