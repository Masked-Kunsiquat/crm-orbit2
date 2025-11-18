// TanStack Query hooks for saved searches

import { useQuery, useMutation } from '@tanstack/react-query';
import database from '../../database';
import { createMutationHandlers, invalidateQueries } from './queryHelpers';
import { logger } from '../../errors/utils/errorLogger';

/**
 * Query keys for saved searches
 */
export const savedSearchKeys = {
  all: ['savedSearches'],
  lists: () => [...savedSearchKeys.all, 'list'],
  list: (entityType) => [...savedSearchKeys.lists(), { entityType }],
  details: () => [...savedSearchKeys.all, 'detail'],
  detail: (id) => [...savedSearchKeys.details(), id],
  search: (query, entityType) => [...savedSearchKeys.all, 'search', { query, entityType }],
};

/**
 * Get all saved searches for an entity type
 * @param {string} entityType - Entity type (contacts, interactions, events)
 * @param {Object} options - React Query options
 */
export function useSavedSearches(entityType, options = {}) {
  return useQuery({
    queryKey: savedSearchKeys.list(entityType),
    queryFn: () => database.savedSearches.getByEntityType(entityType),
    staleTime: 5 * 60 * 1000, // 5 minutes (saved searches don't change often)
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Get saved search by ID
 * @param {number} id - Search ID
 * @param {Object} options - React Query options
 */
export function useSavedSearch(id, options = {}) {
  return useQuery({
    queryKey: savedSearchKeys.detail(id),
    queryFn: () => database.savedSearches.getById(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

/**
 * Search saved searches by name
 * @param {string} query - Search query
 * @param {string} entityType - Optional entity type filter
 * @param {Object} options - React Query options
 */
export function useSearchSavedSearches(query, entityType = null, options = {}) {
  return useQuery({
    queryKey: savedSearchKeys.search(query, entityType),
    queryFn: () => database.savedSearches.search(query, entityType),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled: typeof query === 'string' && query.trim().length >= 2,
    ...options,
  });
}

/**
 * Create a new saved search
 */
export function useCreateSavedSearch() {
  return useMutation({
    mutationFn: (data) => database.savedSearches.create(data),
    ...createMutationHandlers({
      invalidateKeys: [savedSearchKeys.all],
      successMessage: 'Search saved successfully',
      errorContext: { operation: 'createSavedSearch' },
    }),
  });
}

/**
 * Update a saved search
 */
export function useUpdateSavedSearch() {
  return useMutation({
    mutationFn: ({ id, data }) => database.savedSearches.update(id, data),
    ...createMutationHandlers({
      invalidateKeys: [savedSearchKeys.all],
      successMessage: 'Search updated successfully',
      errorContext: { operation: 'updateSavedSearch' },
      onSuccessCallback: (updatedSearch) => {
        // Also invalidate the specific search detail
        if (updatedSearch?.id) {
          invalidateQueries([savedSearchKeys.detail(updatedSearch.id)]);
        }
      },
    }),
  });
}

/**
 * Delete a saved search
 */
export function useDeleteSavedSearch() {
  return useMutation({
    mutationFn: (id) => database.savedSearches.delete(id),
    ...createMutationHandlers({
      invalidateKeys: [savedSearchKeys.all],
      successMessage: 'Search deleted successfully',
      errorContext: { operation: 'deleteSavedSearch' },
    }),
  });
}
