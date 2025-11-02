import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesDB } from '../../database';

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
    onSuccess: () => {
      // Invalidate all note queries
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

/**
 * Update note mutation
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => notesDB.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific note and lists
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
    },
  });
}

/**
 * Delete note mutation
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesDB.delete(id),
    onSuccess: () => {
      // Invalidate all note queries
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
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
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
    },
  });
}
