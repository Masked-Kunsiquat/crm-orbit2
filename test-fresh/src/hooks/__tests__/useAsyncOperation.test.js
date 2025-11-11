import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAsyncOperation, useAsyncLoading } from '../useAsyncOperation';
import { logger } from '../../errors/utils/errorLogger';

// Mock the logger
jest.mock('../../errors/utils/errorLogger', () => ({
  logger: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('useAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // useAsyncOperation() - Basic Functionality
  // ============================================================================
  describe('useAsyncOperation - basic functionality', () => {
    it('should return execute, loading, error, and reset functions', () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      expect(result.current).toHaveProperty('execute');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reset');
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should initialize with loading false and error null', () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should execute async function and return result', async () => {
      const mockFn = jest.fn().mockResolvedValue('success result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(returnValue).toBe('success result');
    });

    it('should pass arguments to async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute('arg1', 'arg2', 123);
      });

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should work without options', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalled();
      expect(logger.success).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should work with empty options object', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn, {}));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Loading State Management
  // ============================================================================
  describe('useAsyncOperation - loading state', () => {
    it('should set loading to true during execution', async () => {
      const mockFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result'), 100)));
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.execute();
      });

      // Should be loading immediately after execute is called
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading back to false after success', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading back to false after error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should handle multiple sequential executions', async () => {
      const mockFn = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.loading).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Error State Management
  // ============================================================================
  describe('useAsyncOperation - error state', () => {
    it('should set error when async function throws', async () => {
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe(error);
    });

    it('should return null on error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(null);
    });

    it('should clear previous error on new execution', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce('success');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).not.toBe(null);

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).toBe(null);
    });

    it('should handle different error types', async () => {
      const stringError = 'String error';
      const mockFn = jest.fn().mockRejectedValue(stringError);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe(stringError);
    });
  });

  // ============================================================================
  // Reset Functionality
  // ============================================================================
  describe('useAsyncOperation - reset', () => {
    it('should reset loading and error state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should not affect execute function after reset', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      act(() => {
        result.current.reset();
      });

      await act(async () => {
        await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Logging Integration
  // ============================================================================
  describe('useAsyncOperation - logging', () => {
    it('should log success with component and operation', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, {
          component: 'TestComponent',
          operation: 'testOperation'
        })
      );

      await act(async () => {
        await result.current.execute('arg1', 'arg2');
      });

      expect(logger.success).toHaveBeenCalledWith(
        'TestComponent',
        'testOperation',
        { args: ['arg1', 'arg2'] }
      );
    });

    it('should log error with component and operation', async () => {
      const error = new Error('Failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, {
          component: 'TestComponent',
          operation: 'testOperation'
        })
      );

      await act(async () => {
        await result.current.execute('arg1');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'TestComponent',
        'testOperation',
        error,
        { args: ['arg1'] }
      );
    });

    it('should not log if component or operation is missing', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, { component: 'TestComponent' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(logger.success).not.toHaveBeenCalled();
    });

    it('should log with empty args array', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, {
          component: 'TestComponent',
          operation: 'testOperation'
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(logger.success).toHaveBeenCalledWith(
        'TestComponent',
        'testOperation',
        { args: [] }
      );
    });
  });

  // ============================================================================
  // Callback Integration
  // ============================================================================
  describe('useAsyncOperation - callbacks', () => {
    it('should call onSuccess callback with result', async () => {
      const mockFn = jest.fn().mockResolvedValue('success result');
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith('success result');
    });

    it('should call onError callback with error', async () => {
      const error = new Error('Failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should call both logging and callbacks', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(mockFn, {
          component: 'TestComponent',
          operation: 'testOperation',
          onSuccess
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(logger.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('result');
    });

    it('should not throw if callbacks are missing', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('useAsyncOperation - edge cases', () => {
    it('should handle async function that returns undefined', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(undefined);
      expect(result.current.error).toBe(null);
    });

    it('should handle async function that returns null', async () => {
      const mockFn = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle async function that returns false', async () => {
      const mockFn = jest.fn().mockResolvedValue(false);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(false);
    });

    it('should handle async function that returns zero', async () => {
      const mockFn = jest.fn().mockResolvedValue(0);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(0);
    });

    it('should handle async function that returns empty string', async () => {
      const mockFn = jest.fn().mockResolvedValue('');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe('');
    });

    it('should handle async function with complex return value', async () => {
      const complexResult = {
        data: [1, 2, 3],
        meta: { count: 3, page: 1 },
        nested: { deep: { value: 'test' } }
      };
      const mockFn = jest.fn().mockResolvedValue(complexResult);
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toEqual(complexResult);
    });

    it('should handle many arguments', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));

      await act(async () => {
        await result.current.execute(1, 2, 3, 4, 5, 'six', { seven: 7 });
      });

      expect(mockFn).toHaveBeenCalledWith(1, 2, 3, 4, 5, 'six', { seven: 7 });
    });
  });

  // ============================================================================
  // Integration Scenarios
  // ============================================================================
  describe('useAsyncOperation - integration scenarios', () => {
    it('should handle form submission pattern', async () => {
      const submitForm = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(submitForm, {
          component: 'FormComponent',
          operation: 'submitForm',
          onSuccess
        })
      );

      const formData = { name: 'Test', email: 'test@example.com' };

      await act(async () => {
        await result.current.execute(formData);
      });

      expect(submitForm).toHaveBeenCalledWith(formData);
      expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Test' });
      expect(logger.success).toHaveBeenCalled();
    });

    it('should handle authentication pattern', async () => {
      const authenticate = jest.fn().mockResolvedValue({ token: 'abc123' });
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(authenticate, {
          component: 'AuthScreen',
          operation: 'authenticate',
          onSuccess
        })
      );

      await act(async () => {
        await result.current.execute('username', 'password');
      });

      expect(authenticate).toHaveBeenCalledWith('username', 'password');
      expect(onSuccess).toHaveBeenCalledWith({ token: 'abc123' });
    });

    it('should handle data fetching pattern', async () => {
      const fetchData = jest.fn().mockResolvedValue([1, 2, 3]);
      const { result } = renderHook(() =>
        useAsyncOperation(fetchData, {
          component: 'DataScreen',
          operation: 'fetchData'
        })
      );

      let data;
      await act(async () => {
        data = await result.current.execute();
      });

      expect(data).toEqual([1, 2, 3]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  // ============================================================================
  // useAsyncLoading() - Simplified Hook
  // ============================================================================
  describe('useAsyncLoading - basic functionality', () => {
    it('should return execute and loading', () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      expect(result.current).toHaveProperty('execute');
      expect(result.current).toHaveProperty('loading');
      expect(typeof result.current.execute).toBe('function');
    });

    it('should not return error or reset', () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      expect(result.current).not.toHaveProperty('error');
      expect(result.current).not.toHaveProperty('reset');
    });

    it('should initialize with loading false', () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      expect(result.current.loading).toBe(false);
    });

    it('should execute async function and return result', async () => {
      const mockFn = jest.fn().mockResolvedValue('success result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(returnValue).toBe('success result');
    });

    it('should pass arguments to async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await act(async () => {
        await result.current.execute('arg1', 'arg2', 123);
      });

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });

  describe('useAsyncLoading - loading state', () => {
    it('should set loading to true during execution', async () => {
      const mockFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result'), 50)));
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading back to false after success', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading back to false after error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await expect(act(async () => {
        await result.current.execute();
      })).rejects.toThrow('Failed');

      expect(result.current.loading).toBe(false);
    });
  });

  describe('useAsyncLoading - error handling', () => {
    it('should throw errors instead of catching them', async () => {
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await expect(act(async () => {
        await result.current.execute();
      })).rejects.toThrow('Operation failed');
    });

    it('should not have error state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      try {
        await act(async () => {
          await result.current.execute();
        });
      } catch (e) {
        // Expected to throw
      }

      expect(result.current).not.toHaveProperty('error');
    });
  });

  describe('useAsyncLoading - no logging', () => {
    it('should not log success', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(logger.success).not.toHaveBeenCalled();
    });

    it('should not log errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      try {
        await act(async () => {
          await result.current.execute();
        });
      } catch (e) {
        // Expected to throw
      }

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('useAsyncLoading - edge cases', () => {
    it('should handle falsy return values', async () => {
      const mockFn = jest.fn().mockResolvedValue(0);
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe(0);
    });

    it('should handle multiple sequential executions', async () => {
      const mockFn = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.loading).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should work with synchronous-looking async functions', async () => {
      const mockFn = jest.fn(async (x) => x * 2);
      const { result } = renderHook(() => useAsyncLoading(mockFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute(5);
      });

      expect(returnValue).toBe(10);
    });
  });
});
