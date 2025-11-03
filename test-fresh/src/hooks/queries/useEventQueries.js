import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsDB } from '../../database';

/**
 * Query keys for event-related queries
 */
export const eventKeys = {
  all: ['events'],
  lists: () => [...eventKeys.all, 'list'],
  detail: (id) => [...eventKeys.all, 'detail', id],
  upcoming: () => [...eventKeys.all, 'upcoming'],
  byContact: (contactId) => [...eventKeys.all, 'contact', contactId],
};

/**
 * Fetch all events
 */
export function useEvents(options = {}) {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: () => eventsDB.getAll(options),
    ...options,
  });
}

/**
 * Fetch single event
 */
export function useEvent(id, options = {}) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsDB.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch upcoming events
 */
export function useUpcomingEvents(options = {}) {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: () => eventsDB.getUpcoming(),
    ...options,
  });
}

/**
 * Fetch events by contact
 */
export function useContactEvents(contactId, options = {}) {
  return useQuery({
    queryKey: eventKeys.byContact(contactId),
    queryFn: () => eventsDB.getByContact(contactId),
    enabled: !!contactId,
    ...options,
  });
}

/**
 * Create event mutation
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData) => eventsDB.create(eventData),
    onSuccess: () => {
      // Invalidate all event queries
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

/**
 * Update event mutation
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => eventsDB.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific event and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
    },
  });
}

/**
 * Delete event mutation
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => eventsDB.delete(id),
    onSuccess: () => {
      // Invalidate all event queries
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
