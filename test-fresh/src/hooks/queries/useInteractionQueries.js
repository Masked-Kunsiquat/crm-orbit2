import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { interactionsDB, interactionsSearchDB } from '../../database';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';

/**
 * Query keys for interaction-related queries
 */
export const interactionKeys = {
  all: ['interactions'],
  lists: mode =>
    mode
      ? [...interactionKeys.all, 'list', mode]
      : [...interactionKeys.all, 'list'],
  detail: id => [...interactionKeys.all, 'detail', id],
  byContact: contactId => [...interactionKeys.all, 'contact', contactId],
  byType: type => [...interactionKeys.all, 'type', type],
  recent: () => [...interactionKeys.all, 'recent'],
};

/**
 * Fetch all interactions
 */
export function useInteractions(options = {}) {
  return useQuery({
    queryKey: interactionKeys.lists(),
    queryFn: () => interactionsDB.getAll(options),
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch single interaction
 */
export function useInteraction(id, options = {}) {
  return useQuery({
    queryKey: interactionKeys.detail(id),
    queryFn: () => interactionsDB.getById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch interactions by contact
 */
export function useContactInteractions(contactId, options = {}) {
  return useQuery({
    queryKey: interactionKeys.byContact(contactId),
    queryFn: () => interactionsSearchDB.getByContact(contactId),
    enabled: !!contactId,
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch interactions by type
 */
export function useInteractionsByType(type, options = {}) {
  return useQuery({
    queryKey: interactionKeys.byType(type),
    queryFn: () => interactionsSearchDB.getByType(type),
    enabled: !!type,
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch ALL interactions (for proximity calculations and analytics)
 *
 * WARNING: This fetches ALL interactions without pagination.
 * Use with caution for large datasets (1000+ interactions).
 * Consider adding a limit parameter if performance becomes an issue.
 */
export function useAllInteractions(options = {}) {
  return useQuery({
    queryKey: [...interactionKeys.all, 'complete'],
    queryFn: () =>
      interactionsDB.getAll({
        limit: 10000, // High limit to fetch all interactions
        orderBy: 'interaction_datetime',
        orderDir: 'DESC',
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes (longer cache for bulk data)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Fetch recent interactions
 */
export function useRecentInteractions(limit = 10, options = {}) {
  return useQuery({
    queryKey: interactionKeys.recent(),
    queryFn: () =>
      interactionsDB.getAll({
        limit,
        orderBy: 'interaction_datetime',
        orderDir: 'DESC',
      }),
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch interactions with infinite scrolling support
 * Use this for InteractionsScreen to support pagination with large datasets
 *
 * PAGINATION STRATEGY: Offset-based (current implementation)
 * - Uses offset + PAGE_SIZE for pagination
 * - Works well for historical data (interaction history)
 * - Known limitation: if interactions are created/deleted during pagination,
 *   items may be duplicated or skipped
 *
 * FUTURE ENHANCEMENT: Consider cursor-based pagination if users report
 * pagination inconsistencies. Would use interaction_datetime or ID as cursor:
 *   WHERE interaction_datetime < cursor ORDER BY interaction_datetime DESC
 * This would prevent duplication/skipping but requires database schema support.
 */
export function useInfiniteInteractions(queryOptions = {}) {
  const PAGE_SIZE = 50; // Load 50 interactions per page

  // Extract only safe filter options to prevent pagination parameter override
  const { limit, offset, orderBy, orderDir, ...safeOptions } = queryOptions;

  return useInfiniteQuery({
    queryKey: interactionKeys.lists('infinite'),
    queryFn: async ({ pageParam = 0 }) => {
      const interactions = await interactionsDB.getAll({
        limit: PAGE_SIZE,
        offset: pageParam,
        orderBy: 'interaction_datetime',
        orderDir: 'DESC',
        ...safeOptions,
      });
      return { interactions, nextOffset: pageParam + PAGE_SIZE };
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we received fewer interactions than PAGE_SIZE, we've reached the end
      if (lastPage.interactions.length < PAGE_SIZE) {
        return undefined;
      }
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
    staleTime: 1 * 60 * 1000, // 1 minute (interactions update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create interaction mutation
 */
export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interactionData => interactionsDB.create(interactionData),
    ...createMutationHandlers(queryClient, interactionKeys.all, {
      context: 'useCreateInteraction',
    }),
  });
}

/**
 * Update interaction mutation
 */
export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => interactionsDB.update(id, data),
    ...createMutationHandlers(
      queryClient,
      [
        interactionKeys.lists(),
        interactionKeys.lists('infinite'),
        interactionKeys.recent(),
      ],
      {
        context: 'useUpdateInteraction',
        onSuccess: (_, { id }) => {
          // Additional invalidation for specific interaction detail
          invalidateQueries(queryClient, interactionKeys.detail(id));
        },
      }
    ),
  });
}

/**
 * Delete interaction mutation
 */
export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: id => interactionsDB.delete(id),
    ...createMutationHandlers(queryClient, interactionKeys.all, {
      context: 'useDeleteInteraction',
    }),
  });
}
