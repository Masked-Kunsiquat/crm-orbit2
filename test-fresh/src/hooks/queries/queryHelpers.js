/**
 * TanStack Query Helper Utilities
 *
 * Centralized utilities for query invalidation and mutation handling
 * to reduce code duplication and ensure consistent query management.
 */

import { logger } from '../../errors';

/**
 * Invalidate multiple query keys at once
 *
 * Replaces repetitive queryClient.invalidateQueries() calls with a single helper
 * that handles multiple keys in parallel.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - TanStack Query client instance
 * @param {...Array} queryKeys - One or more query keys to invalidate
 * @returns {Promise<void[]>} Promise that resolves when all invalidations complete
 *
 * @example
 * // Before:
 * queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
 * queryClient.invalidateQueries({ queryKey: contactKeys.listsWithInfo() });
 *
 * // After:
 * await invalidateQueries(queryClient, contactKeys.lists(), contactKeys.listsWithInfo());
 *
 * @example
 * // In mutation onSuccess:
 * onSuccess: () => {
 *   invalidateQueries(queryClient, contactKeys.all);
 * }
 */
export function invalidateQueries(queryClient, ...queryKeys) {
  return Promise.all(
    queryKeys.map(key =>
      queryClient.invalidateQueries({ queryKey: key })
    )
  );
}

/**
 * Create standardized mutation handlers with automatic query invalidation
 *
 * Generates onSuccess and onError handlers for mutations, eliminating
 * boilerplate code in every mutation definition.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - TanStack Query client instance
 * @param {Array|Array[]} keysToInvalidate - Single query key or array of keys to invalidate on success
 * @param {Object} [options] - Optional configuration
 * @param {Function} [options.onSuccess] - Additional success handler (called after invalidation)
 * @param {Function} [options.onError] - Additional error handler (called after logging)
 * @param {string} [options.successMessage] - Optional success log message
 * @param {string} [options.context] - Context name for error logging
 * @returns {Object} Object with onSuccess and onError handlers
 *
 * @example
 * // Before:
 * return useMutation({
 *   mutationFn: (data) => contactsDB.create(data),
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
 *     queryClient.invalidateQueries({ queryKey: contactKeys.listsWithInfo() });
 *   },
 *   onError: (error) => {
 *     logger.error('useCreateContact', 'mutation', error);
 *   }
 * });
 *
 * // After:
 * return useMutation({
 *   mutationFn: (data) => contactsDB.create(data),
 *   ...createMutationHandlers(queryClient, [contactKeys.lists(), contactKeys.listsWithInfo()], {
 *     context: 'useCreateContact'
 *   })
 * });
 *
 * @example
 * // With single key:
 * ...createMutationHandlers(queryClient, eventKeys.all, { context: 'useCreateEvent' })
 *
 * @example
 * // With additional handlers:
 * ...createMutationHandlers(queryClient, [noteKeys.all], {
 *   context: 'useCreateNote',
 *   onSuccess: (data) => {
 *     console.log('Note created:', data.id);
 *   },
 *   onError: (error) => {
 *     showAlert.error('Failed to create note');
 *   }
 * })
 */
export function createMutationHandlers(queryClient, keysToInvalidate, options = {}) {
  const {
    onSuccess: customOnSuccess,
    onError: customOnError,
    successMessage,
    context = 'Mutation'
  } = options;

  // Normalize keysToInvalidate to always be an array
  const keys = Array.isArray(keysToInvalidate) ? keysToInvalidate : [keysToInvalidate];

  return {
    onSuccess: async (...args) => {
      // Invalidate all specified queries
      await invalidateQueries(queryClient, ...keys);

      // Log success if message provided
      if (successMessage) {
        logger.success(context, successMessage);
      }

      // Call custom success handler if provided
      if (customOnSuccess) {
        customOnSuccess(...args);
      }
    },

    onError: (error, ...args) => {
      // Log error with context
      logger.error(context, 'mutation failed', error);

      // Call custom error handler if provided
      if (customOnError) {
        customOnError(error, ...args);
      }
    }
  };
}
