import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesDB } from '../../database';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';

/**
 * Cache tuning constants for note queries
 * Notes have moderate update frequency
 */
const NOTE_STALE_MS = 5 * 60 * 1000; // 5 minutes
const NOTE_GC_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Query keys for note-related queries
 */
export const noteKeys = {
  all: ['notes'],
  lists: () => [...noteKeys.all, 'list'],
  detail: (id) => [...noteKeys.all, 'detail', id],
  byContact: (contactId) => [...noteKeys.all, 'contact', contactId],
  pinned: () => [...noteKeys.all, 'pinned'],
};

/**
 * Fetch all notes
 */
export function useNotes(options = {}) {
  return useQuery({
    queryKey: noteKeys.lists(),
    queryFn: () => notesDB.getAll(options),
    staleTime: NOTE_STALE_MS,
    gcTime: NOTE_GC_MS,
    ...options,
  });
}

/**
 * Fetch single note
 */
export function useNote(id, options = {}) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => notesDB.getById(id),
    enabled: !!id,
    staleTime: NOTE_STALE_MS,
    gcTime: NOTE_GC_MS,
    ...options,
  });
}

/**
 * Fetch notes by contact
 */
export function useContactNotes(contactId, options = {}) {
  return useQuery({
    queryKey: noteKeys.byContact(contactId),
    queryFn: () => notesDB.getByContact(contactId),
    enabled: !!contactId,
    staleTime: NOTE_STALE_MS,
    gcTime: NOTE_GC_MS,
    ...options,
  });
}

/**
 * Fetch pinned notes
 */
export function usePinnedNotes(options = {}) {
  return useQuery({
    queryKey: noteKeys.pinned(),
    queryFn: () => notesDB.getPinned(),
    staleTime: NOTE_STALE_MS,
    gcTime: NOTE_GC_MS,
    ...options,
  });
}

/**
 * Create note mutation
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteData) => notesDB.create(noteData),
    ...createMutationHandlers(
      queryClient,
      noteKeys.all,
      { context: 'useCreateNote' }
    ),
  });
}

/**
 * Update note mutation
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => notesDB.update(id, data),
    ...createMutationHandlers(
      queryClient,
      [noteKeys.lists(), noteKeys.pinned()],
      {
        context: 'useUpdateNote',
        onSuccess: (_, { id }) => {
          // Additional invalidation for specific note detail
          invalidateQueries(queryClient, noteKeys.detail(id));
        }
      }
    ),
  });
}

/**
 * Delete note mutation
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesDB.delete(id),
    ...createMutationHandlers(
      queryClient,
      noteKeys.all,
      { context: 'useDeleteNote' }
    ),
  });
}

/**
 * Toggle pinned status mutation with optimistic update
 */
export function useTogglePinned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesDB.togglePinned(id),

    // Optimistic update
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

      // Snapshot previous value
      const previousNote = queryClient.getQueryData(noteKeys.detail(id));

      // Optimistically update
      if (previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), {
          ...previousNote,
          is_pinned: !previousNote.is_pinned,
        });
      }

      return { previousNote };
    },

    // Rollback on error
    onError: (err, id, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
      }
    },

    // Refetch on success or error
    onSettled: (_, __, id) => {
      invalidateQueries(queryClient, noteKeys.detail(id), noteKeys.pinned());
    },
  });
}
