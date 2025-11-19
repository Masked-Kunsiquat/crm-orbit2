import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { eventsDB, eventsRemindersDB } from '../../database';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';

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
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Fetch reminders for an event
 */
export function useEventReminders(eventId, options = {}) {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), 'reminders'],
    queryFn: () => eventsRemindersDB.getEventReminders(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Fetch events with infinite scrolling support
 * Use this for EventsList to support pagination with large datasets
 */
export function useInfiniteEvents(queryOptions = {}) {
  const PAGE_SIZE = 50; // Load 50 events per page

  return useInfiniteQuery({
    queryKey: eventKeys.lists(),
    queryFn: async ({ pageParam = 0 }) => {
      const events = await eventsDB.getAll({
        limit: PAGE_SIZE,
        offset: pageParam,
        orderBy: 'event_date',
        orderDir: 'ASC',
        ...queryOptions,
      });
      return { events, nextOffset: pageParam + PAGE_SIZE };
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we received fewer events than PAGE_SIZE, we've reached the end
      if (lastPage.events.length < PAGE_SIZE) {
        return undefined;
      }
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes (events have moderate updates)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Create event mutation
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData) => eventsDB.create(eventData),
    ...createMutationHandlers(
      queryClient,
      eventKeys.all,
      { context: 'useCreateEvent' }
    ),
  });
}

/**
 * Create event with reminders mutation
 */
export function useCreateEventWithReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventData, reminders }) =>
      eventsRemindersDB.createEventWithReminders(eventData, reminders),
    ...createMutationHandlers(
      queryClient,
      eventKeys.all,
      { context: 'useCreateEventWithReminders' }
    ),
  });
}

/**
 * Update event mutation
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => eventsDB.update(id, data),
    ...createMutationHandlers(
      queryClient,
      [eventKeys.lists(), eventKeys.upcoming()],
      {
        context: 'useUpdateEvent',
        onSuccess: (_, { id }) => {
          // Additional invalidation for specific event detail
          invalidateQueries(queryClient, eventKeys.detail(id));
        }
      }
    ),
  });
}

/**
 * Update event reminders mutation
 */
export function useUpdateEventReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, reminders }) =>
      eventsRemindersDB.updateEventReminders(eventId, reminders),
    ...createMutationHandlers(
      queryClient,
      [eventKeys.lists(), eventKeys.upcoming()],
      {
        context: 'useUpdateEventReminders',
        onSuccess: (_, { eventId }) => {
          // Additional invalidation for specific event detail
          invalidateQueries(queryClient, eventKeys.detail(eventId));
        }
      }
    ),
  });
}

/**
 * Delete event mutation
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => eventsDB.delete(id),
    ...createMutationHandlers(
      queryClient,
      eventKeys.all,
      { context: 'useDeleteEvent' }
    ),
  });
}
