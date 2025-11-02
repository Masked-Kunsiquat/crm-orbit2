import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsDB, contactsInfoDB } from '../../database';

/**
 * Query keys for contact-related queries
 */
export const contactKeys = {
  all: ['contacts'],
  lists: () => [...contactKeys.all, 'list'],
  list: (filters) => [...contactKeys.lists(), filters],
  details: () => [...contactKeys.all, 'detail'],
  detail: (id) => [...contactKeys.details(), id],
  favorites: () => [...contactKeys.all, 'favorites'],
  search: (query) => [...contactKeys.all, 'search', query],
};

/**
 * Fetch all contacts
 */
export function useContacts(options = {}) {
  return useQuery({
    queryKey: contactKeys.lists(),
    queryFn: () => contactsDB.getAll(options),
    ...options,
  });
}

/**
 * Fetch single contact with details (contact info, categories, etc.)
 */
export function useContact(id, options = {}) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => contactsInfoDB.getWithContactInfo(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch favorite contacts
 */
export function useFavoriteContacts(options = {}) {
  return useQuery({
    queryKey: contactKeys.favorites(),
    queryFn: () => contactsDB.getFavorites(),
    ...options,
  });
}

/**
 * Search contacts
 */
export function useContactSearch(query, options = {}) {
  return useQuery({
    queryKey: contactKeys.search(query),
    queryFn: () => contactsDB.search(query),
    enabled: query.length >= 2, // Only search with 2+ characters
    ...options,
  });
}

/**
 * Create contact mutation
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactData) => contactsDB.create(contactData),
    onSuccess: () => {
      // Invalidate and refetch contact lists
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

/**
 * Update contact mutation
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => contactsDB.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific contact and lists
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

/**
 * Delete contact mutation
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => contactsDB.delete(id),
    onSuccess: () => {
      // Invalidate all contact queries
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

/**
 * Toggle favorite mutation with optimistic update
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => contactsDB.toggleFavorite(id),

    // Optimistic update
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: contactKeys.detail(id) });

      // Snapshot previous value
      const previousContact = queryClient.getQueryData(contactKeys.detail(id));

      // Optimistically update
      if (previousContact) {
        queryClient.setQueryData(contactKeys.detail(id), {
          ...previousContact,
          is_favorite: !previousContact.is_favorite,
        });
      }

      return { previousContact };
    },

    // Rollback on error
    onError: (err, id, context) => {
      if (context?.previousContact) {
        queryClient.setQueryData(contactKeys.detail(id), context.previousContact);
      }
    },

    // Refetch on success or error
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.favorites() });
    },
  });
}
