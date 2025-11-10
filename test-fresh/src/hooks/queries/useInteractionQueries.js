import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interactionsDB, interactionsSearchDB } from '../../database';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';

/**
 * Query keys for interaction-related queries
 */
export const interactionKeys = {
  all: ['interactions'],
  lists: () => [...interactionKeys.all, 'list'],
  detail: (id) => [...interactionKeys.all, 'detail', id],
  byContact: (contactId) => [...interactionKeys.all, 'contact', contactId],
  byType: (type) => [...interactionKeys.all, 'type', type],
  recent: () => [...interactionKeys.all, 'recent'],
};

/**
 * Fetch all interactions
 */
export function useInteractions(options = {}) {
  return useQuery({
    queryKey: interactionKeys.lists(),
    queryFn: () => interactionsDB.getAll(options),
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
    ...options,
  });
}

/**
 * Create interaction mutation
 */
export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interactionData) => interactionsDB.create(interactionData),
    ...createMutationHandlers(
      queryClient,
      interactionKeys.all,
      { context: 'useCreateInteraction' }
    ),
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
      [interactionKeys.lists(), interactionKeys.recent()],
      {
        context: 'useUpdateInteraction',
        onSuccess: (_, { id }) => {
          // Additional invalidation for specific interaction detail
          invalidateQueries(queryClient, interactionKeys.detail(id));
        }
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
    mutationFn: (id) => interactionsDB.delete(id),
    ...createMutationHandlers(
      queryClient,
      interactionKeys.all,
      { context: 'useDeleteInteraction' }
    ),
  });
}
