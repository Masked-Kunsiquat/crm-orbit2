import { invalidateQueries, createMutationHandlers } from '../queryHelpers';
import { logger } from '../../../errors';

// Mock the logger
jest.mock('../../../errors', () => ({
  logger: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('queryHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // invalidateQueries()
  // ============================================================================
  describe('invalidateQueries', () => {
    describe('basic functionality', () => {
      it('should invalidate single query key', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(mockQueryClient, ['contacts']);

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(1);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts']
        });
      });

      it('should invalidate multiple query keys', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(
          mockQueryClient,
          ['contacts'],
          ['contacts', 'list'],
          ['contacts', 'detail']
        );

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(3);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts']
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts', 'list']
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts', 'detail']
        });
      });

      it('should handle empty query keys array', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(mockQueryClient);

        expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
      });

      it('should return Promise that resolves when all invalidations complete', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const result = await invalidateQueries(
          mockQueryClient,
          ['contacts'],
          ['events']
        );

        expect(result).toBeInstanceOf(Array);
        expect(result).toHaveLength(2);
      });
    });

    describe('parallel execution', () => {
      it('should invalidate queries in parallel', async () => {
        const callOrder = [];
        const mockQueryClient = {
          invalidateQueries: jest.fn((params) => {
            callOrder.push(params.queryKey);
            return Promise.resolve();
          })
        };

        await invalidateQueries(
          mockQueryClient,
          ['contacts'],
          ['events'],
          ['interactions']
        );

        // All should be called (order doesn't matter for parallel execution)
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(3);
        expect(callOrder).toHaveLength(3);
      });

      it('should handle slow invalidations', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn()
            .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
            .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 50)))
        };

        const start = Date.now();
        await invalidateQueries(mockQueryClient, ['contacts'], ['events']);
        const duration = Date.now() - start;

        // Should take ~100ms (parallel), not 150ms (sequential)
        // Allow some margin for test execution overhead
        expect(duration).toBeLessThan(200);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      });
    });

    describe('error handling', () => {
      it('should propagate error if invalidation fails', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockRejectedValue(new Error('Invalidation failed'))
        };

        await expect(
          invalidateQueries(mockQueryClient, ['contacts'])
        ).rejects.toThrow('Invalidation failed');
      });

      it('should fail if any invalidation fails', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Second invalidation failed'))
            .mockResolvedValueOnce(undefined)
        };

        await expect(
          invalidateQueries(mockQueryClient, ['contacts'], ['events'], ['interactions'])
        ).rejects.toThrow('Second invalidation failed');
      });
    });

    describe('query key formats', () => {
      it('should handle simple string keys', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(mockQueryClient, 'contacts', 'events');

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: 'contacts'
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: 'events'
        });
      });

      it('should handle nested array keys', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(
          mockQueryClient,
          ['contacts', 'list', { filters: { active: true } }]
        );

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts', 'list', { filters: { active: true } }]
        });
      });

      it('should handle mixed key types', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        await invalidateQueries(
          mockQueryClient,
          'contacts',
          ['contacts', 'list'],
          ['contacts', 'detail', 123]
        );

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(3);
      });
    });

    describe('real-world usage scenarios', () => {
      it('should invalidate all contact-related queries', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const contactKeys = {
          all: ['contacts'],
          lists: () => ['contacts', 'list'],
          listsWithInfo: () => ['contacts', 'list', 'withInfo']
        };

        await invalidateQueries(
          mockQueryClient,
          contactKeys.all,
          contactKeys.lists(),
          contactKeys.listsWithInfo()
        );

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(3);
      });

      it('should work in mutation onSuccess handler', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const onSuccess = async () => {
          await invalidateQueries(mockQueryClient, ['contacts'], ['events']);
        };

        await onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ============================================================================
  // createMutationHandlers()
  // ============================================================================
  describe('createMutationHandlers', () => {
    describe('basic structure', () => {
      it('should return object with onSuccess and onError handlers', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);

        expect(handlers).toHaveProperty('onSuccess');
        expect(handlers).toHaveProperty('onError');
        expect(typeof handlers.onSuccess).toBe('function');
        expect(typeof handlers.onError).toBe('function');
      });

      it('should work without options parameter', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);

        expect(handlers.onSuccess).toBeDefined();
        expect(handlers.onError).toBeDefined();
      });

      it('should work with empty options object', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {});

        expect(handlers.onSuccess).toBeDefined();
        expect(handlers.onError).toBeDefined();
      });
    });

    describe('onSuccess handler', () => {
      it('should invalidate single query key on success', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);
        await handlers.onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(1);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts']
        });
      });

      it('should invalidate multiple query keys on success', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, [
          ['contacts', 'list'],
          ['contacts', 'detail']
        ]);
        await handlers.onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      });

      it('should call custom onSuccess handler after invalidation', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnSuccess = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onSuccess: customOnSuccess
        });
        await handlers.onSuccess('data', 'variables', 'context');

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
        expect(customOnSuccess).toHaveBeenCalledWith('data', 'variables', 'context');
      });

      it('should log success message if provided', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          successMessage: 'Contact created successfully',
          context: 'useCreateContact'
        });
        await handlers.onSuccess();

        expect(logger.success).toHaveBeenCalledWith(
          'useCreateContact',
          'Contact created successfully'
        );
      });

      it('should not log if successMessage not provided', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);
        await handlers.onSuccess();

        expect(logger.success).not.toHaveBeenCalled();
      });

      it('should pass all arguments to custom onSuccess', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnSuccess = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onSuccess: customOnSuccess
        });

        const data = { id: 1, name: 'John' };
        const variables = { name: 'John' };
        const context = { previousData: [] };

        await handlers.onSuccess(data, variables, context);

        expect(customOnSuccess).toHaveBeenCalledWith(data, variables, context);
      });
    });

    describe('onError handler', () => {
      it('should log error with context', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          context: 'useCreateContact'
        });

        const error = new Error('Creation failed');
        handlers.onError(error);

        expect(logger.error).toHaveBeenCalledWith(
          'useCreateContact',
          'mutation failed',
          error
        );
      });

      it('should use default context if not provided', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);
        const error = new Error('Creation failed');
        handlers.onError(error);

        expect(logger.error).toHaveBeenCalledWith(
          'Mutation',
          'mutation failed',
          error
        );
      });

      it('should call custom onError handler', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnError = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onError: customOnError
        });

        const error = new Error('Creation failed');
        handlers.onError(error);

        expect(logger.error).toHaveBeenCalled();
        expect(customOnError).toHaveBeenCalledWith(error);
      });

      it('should pass all arguments to custom onError', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnError = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onError: customOnError
        });

        const error = new Error('Creation failed');
        const variables = { name: 'John' };
        const context = { previousData: [] };

        handlers.onError(error, variables, context);

        expect(customOnError).toHaveBeenCalledWith(error, variables, context);
      });

      it('should handle errors without custom handler', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);
        const error = new Error('Creation failed');

        expect(() => handlers.onError(error)).not.toThrow();
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('key normalization', () => {
      it('should handle single query key (not wrapped in array)', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts']);
        await handlers.onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts']
        });
      });

      it('should handle array of query keys', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, [
          ['contacts', 'list'],
          ['contacts', 'detail']
        ]);
        await handlers.onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      });

      it('should handle nested array structures', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, [
          ['contacts', 'list', { filters: {} }],
          ['events', 'upcoming']
        ]);
        await handlers.onSuccess();

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      });
    });

    describe('integration scenarios', () => {
      it('should work in useMutation hook', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const contactKeys = {
          all: ['contacts'],
          lists: () => ['contacts', 'list']
        };

        const handlers = createMutationHandlers(
          mockQueryClient,
          [contactKeys.all, contactKeys.lists()],
          { context: 'useCreateContact' }
        );

        // Simulate successful mutation
        await handlers.onSuccess({ id: 1, name: 'John' });

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts']
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['contacts', 'list']
        });
      });

      it('should handle mutation with custom success callback', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const onSuccessCallback = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, [['contacts']], {
          context: 'useCreateContact',
          onSuccess: onSuccessCallback
        });

        const newContact = { id: 1, name: 'John' };
        await handlers.onSuccess(newContact);

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
        expect(onSuccessCallback).toHaveBeenCalledWith(newContact);
      });

      it('should handle mutation with custom error callback', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const onErrorCallback = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, [['contacts']], {
          context: 'useCreateContact',
          onError: onErrorCallback
        });

        const error = new Error('Network error');
        handlers.onError(error);

        expect(logger.error).toHaveBeenCalledWith(
          'useCreateContact',
          'mutation failed',
          error
        );
        expect(onErrorCallback).toHaveBeenCalledWith(error);
      });
    });

    describe('edge cases', () => {
      it('should handle empty keysToInvalidate', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, []);
        await handlers.onSuccess();

        // Empty array results in no invalidation calls (0 keys to invalidate)
        expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
      });

      it('should handle null custom handlers', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onSuccess: null,
          onError: null
        });

        await expect(handlers.onSuccess()).resolves.not.toThrow();
        expect(() => handlers.onError(new Error('test'))).not.toThrow();
      });

      it('should handle undefined custom handlers', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onSuccess: undefined,
          onError: undefined
        });

        await expect(handlers.onSuccess()).resolves.not.toThrow();
        expect(() => handlers.onError(new Error('test'))).not.toThrow();
      });

      it('should handle errors in custom onSuccess', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnSuccess = jest.fn(() => {
          throw new Error('Custom handler error');
        });

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onSuccess: customOnSuccess
        });

        await expect(handlers.onSuccess()).rejects.toThrow('Custom handler error');
      });

      it('should handle errors in custom onError', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnError = jest.fn(() => {
          throw new Error('Custom error handler error');
        });

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          onError: customOnError
        });

        expect(() => handlers.onError(new Error('test'))).toThrow('Custom error handler error');
      });
    });

    describe('logger integration', () => {
      it('should log with custom context', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          context: 'MyCustomMutation',
          successMessage: 'Operation completed'
        });

        await handlers.onSuccess();

        expect(logger.success).toHaveBeenCalledWith(
          'MyCustomMutation',
          'Operation completed'
        );
      });

      it('should not log success without successMessage', async () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          context: 'MyCustomMutation'
        });

        await handlers.onSuccess();

        expect(logger.success).not.toHaveBeenCalled();
      });

      it('should always log errors regardless of custom handler', () => {
        const mockQueryClient = {
          invalidateQueries: jest.fn().mockResolvedValue(undefined)
        };
        const customOnError = jest.fn();

        const handlers = createMutationHandlers(mockQueryClient, ['contacts'], {
          context: 'useCreateContact',
          onError: customOnError
        });

        const error = new Error('Test error');
        handlers.onError(error);

        expect(logger.error).toHaveBeenCalledWith(
          'useCreateContact',
          'mutation failed',
          error
        );
        expect(customOnError).toHaveBeenCalled();
      });
    });
  });
});
