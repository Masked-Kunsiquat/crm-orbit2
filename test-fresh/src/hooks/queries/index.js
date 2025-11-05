/**
 * Query Hooks Index
 * Central export point for all TanStack Query hooks
 */

// Contact queries
export {
  contactKeys,
  useContacts,
  useContactsWithInfo,
  useContact,
  useFavoriteContacts,
  useContactSearch,
  useCreateContact,
  useCreateContactWithDetails,
  useUpdateContact,
  useDeleteContact,
  useToggleFavorite,
} from './useContactQueries';

// Event queries
export {
  eventKeys,
  useEvents,
  useEvent,
  useUpcomingEvents,
  useContactEvents,
  useCreateEvent,
  useCreateEventWithReminders,
  useUpdateEvent,
  useUpdateEventReminders,
  useDeleteEvent,
} from './useEventQueries';

// Note queries
export {
  noteKeys,
  useNotes,
  useNote,
  useContactNotes,
  usePinnedNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useTogglePinned,
} from './useNoteQueries';

// Interaction queries
export {
  interactionKeys,
  useInteractions,
  useInteraction,
  useContactInteractions,
  useInteractionsByType,
  useRecentInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
} from './useInteractionQueries';
