/**
 * Custom Hook for Async Operations with Loading State
 *
 * Centralizes the common pattern of managing loading state during async operations.
 * Automatically handles loading state, error state, and cleanup with try/finally.
 */

import { useState, useCallback } from 'react';
import { logger } from '../errors/utils/errorLogger';

/**
 * Hook to manage async operation loading and error state
 *
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {string} options.component - Component name for logging
 * @param {string} options.operation - Operation name for logging
 * @param {Function} options.onError - Optional error callback
 * @param {Function} options.onSuccess - Optional success callback
 * @returns {Object} { execute, loading, error, reset }
 *
 * @example
 * // Basic usage
 * const { execute, loading, error } = useAsyncOperation(
 *   async (data) => await service.createItem(data),
 *   { component: 'MyComponent', operation: 'createItem' }
 * );
 *
 * const handleSubmit = async () => {
 *   const result = await execute(formData);
 *   if (result) {
 *     // Handle success
 *   }
 * };
 *
 * @example
 * // With callbacks
 * const { execute, loading } = useAsyncOperation(
 *   async (pin) => await authService.authenticate(pin),
 *   {
 *     component: 'AuthScreen',
 *     operation: 'authenticate',
 *     onSuccess: () => showAlert.success('Authenticated!'),
 *     onError: (err) => showAlert.error('Error', err.message)
 *   }
 * );
 */
export function useAsyncOperation(asyncFn, options = {}) {
  const { component, operation, onError, onSuccess } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);

        if (component && operation) {
          logger.success(component, operation, { args });
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        setError(err);

        if (component && operation) {
          logger.error(component, operation, err, { args });
        }

        if (onError) {
          onError(err);
        }

        // Return null to indicate failure (allows caller to check result)
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn, component, operation, onError, onSuccess]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { execute, loading, error, reset };
}

/**
 * Simplified hook for loading state only (no error management)
 *
 * Useful when you want to manage errors separately but still
 * want automatic loading state management.
 *
 * @param {Function} asyncFn - Async function to execute
 * @returns {Object} { execute, loading }
 *
 * @example
 * const { execute, loading } = useAsyncLoading(async () => {
 *   // Your async operation
 *   await someService.doWork();
 * });
 *
 * <Button onPress={execute} loading={loading}>Submit</Button>
 */
export function useAsyncLoading(asyncFn) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      try {
        return await asyncFn(...args);
      } finally {
        setLoading(false);
      }
    },
    [asyncFn]
  );

  return { execute, loading };
}
