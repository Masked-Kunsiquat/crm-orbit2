// TanStack Query hooks for global search

import { useQuery } from '@tanstack/react-query';
import database from '../../database';
import { logger } from '../../errors/utils/errorLogger';

/**
 * Query keys for global search
 */
export const globalSearchKeys = {
  all: ['globalSearch'],
  search: (query) => [...globalSearchKeys.all, 'search', query],
};

/**
 * Hook to perform global search across all entities
 * @param {string} query - Search query
 * @param {Object} options - Query options
 * @returns {Object} TanStack Query result with grouped search results
 */
export function useGlobalSearch(query, options = {}) {
  return useQuery({
    queryKey: globalSearchKeys.search(query),
    queryFn: async () => {
      try {
        const results = await database.globalSearch.search(query, options);
        return results;
      } catch (error) {
        logger.error('useGlobalSearch', 'queryFn', error, { query });
        throw error;
      }
    },
    // Only run query if search term is at least 2 characters
    enabled: query && query.trim().length >= 2,
    // Cache search results for 30 seconds
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Hook to get search history (stored in settings or local state)
 * This can be implemented later if needed
 */
export function useSearchHistory() {
  // Placeholder for future implementation
  return {
    history: [],
    addToHistory: () => {},
    clearHistory: () => {},
  };
}
