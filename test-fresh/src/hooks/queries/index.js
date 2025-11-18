/**
 * Query Hooks Index
 * Central export point for all TanStack Query hooks
 */

// Contact queries
export {
  contactKeys,
  enrichContactsWithInfo,
  useContacts,
  useContactsWithInfo,
  useFilteredContactsWithInfo,
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
  useEventReminders,
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

// Company queries
export {
  companyKeys,
  useCompanies,
  useCompany,
  useCompanyWithContacts,
  useCompanySearch,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  useUpdateCompanyLogo,
  useMergeCompanies,
} from './useCompanyQueries';

// Global search queries
export {
  globalSearchKeys,
  useGlobalSearch,
  useSearchHistory,
} from './useGlobalSearch';
