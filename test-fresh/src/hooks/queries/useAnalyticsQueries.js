import { useQuery } from '@tanstack/react-query';
import database from '../../database';

/**
 * Query keys for analytics-related queries
 */
export const analyticsKeys = {
  all: ['analytics'],
  stats: filters => [...analyticsKeys.all, 'stats', filters],
  topContacts: options => [...analyticsKeys.all, 'topContacts', options],
  trends: options => [...analyticsKeys.all, 'trends', options],
};

/**
 * Fetch interaction statistics
 */
export function useInteractionStats(filters = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.stats(filters),
    queryFn: () => database.interactionsStats.getStatistics(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes (analytics can be slightly stale)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch top contacts by interaction count
 */
export function useTopContacts(options = {}, queryOptions = {}) {
  return useQuery({
    queryKey: analyticsKeys.topContacts(options),
    queryFn: () => database.interactionsStats.getTopContacts(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Fetch interaction trends over time
 */
export function useInteractionTrends(options = {}, queryOptions = {}) {
  return useQuery({
    queryKey: analyticsKeys.trends(options),
    queryFn: () => database.interactionsStats.getInteractionTrends(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Fetch contact interaction summary
 */
export function useContactInteractionSummary(contactId, options = {}) {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'contactSummary', contactId],
    queryFn: () =>
      database.interactionsStats.getContactInteractionSummary(contactId),
    enabled: !!contactId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
