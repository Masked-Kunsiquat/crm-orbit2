/**
 * Error Logger Unit Tests
 *
 * Comprehensive tests for error logging utilities
 * Tests cover: logger.error(), logger.warn(), logger.info(), logger.debug(),
 * logger.success(), withErrorHandling(), logErrors()
 */

import { logger, withErrorHandling, logErrors } from '../errorLogger';

describe('errorLogger', () => {
  // Save original console methods
  let originalConsoleError;
  let originalConsoleWarn;
  let originalConsoleLog;
  let originalConsoleDebug;
  let originalDEV;

  beforeEach(() => {
    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    originalConsoleDebug = console.debug;

    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
    console.debug = jest.fn();

    // Mock __DEV__ global
    originalDEV = global.__DEV__;
    global.__DEV__ = true; // Enable development mode for tests
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;

    // Restore __DEV__
    global.__DEV__ = originalDEV;
  });

  // ============================================================================
  // logger.error()
  // ============================================================================

  describe('logger.error', () => {
    it('should log error with component and operation context', () => {
      const error = new Error('Test error');
      logger.error('TestComponent', 'testOperation', error);

      expect(console.error).toHaveBeenCalled();
      const [message, formattedError, context] = console.error.mock.calls[0];
      expect(message).toContain('TestComponent');
      expect(message).toContain('testOperation');
      expect(message).toContain('failed');
      expect(formattedError).toHaveProperty('name', 'Error');
      expect(formattedError).toHaveProperty('message', 'Test error');
    });

    it('should format Error objects with name, message, code, and stack', () => {
      const error = new Error('Test error');
      error.code = 'ERR_TEST';
      logger.error('TestComponent', 'testOperation', error);

      const formattedError = console.error.mock.calls[0][1];
      expect(formattedError).toHaveProperty('name');
      expect(formattedError).toHaveProperty('message', 'Test error');
      expect(formattedError).toHaveProperty('code', 'ERR_TEST');
      expect(formattedError).toHaveProperty('stack');
    });

    it('should handle string errors', () => {
      logger.error('TestComponent', 'testOperation', 'Simple error string');

      const formattedError = console.error.mock.calls[0][1];
      expect(formattedError).toBe('Simple error string');
    });

    it('should handle null/undefined errors', () => {
      logger.error('TestComponent', 'testOperation', null);
      expect(console.error.mock.calls[0][1]).toBe('Unknown error');

      logger.error('TestComponent', 'testOperation', undefined);
      expect(console.error.mock.calls[1][1]).toBe('Unknown error');
    });

    it('should include additional context', () => {
      const error = new Error('Test error');
      const context = { userId: 123, action: 'create' };
      logger.error('TestComponent', 'testOperation', error, context);

      const loggedContext = console.error.mock.calls[0][2];
      expect(loggedContext).toEqual(context);
    });

    it('should handle empty context', () => {
      const error = new Error('Test error');
      logger.error('TestComponent', 'testOperation', error);

      const loggedContext = console.error.mock.calls[0][2];
      expect(loggedContext).toEqual({});
    });

    it('should include timestamp in log message', () => {
      const error = new Error('Test error');
      logger.error('TestComponent', 'testOperation', error);

      const message = console.error.mock.calls[0][0];
      // Timestamp format: [2025-11-11T...]
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should log full error object in development mode', () => {
      global.__DEV__ = true;
      const error = new Error('Test error');
      logger.error('TestComponent', 'testOperation', error);

      // Should have 2 console.error calls: formatted + full error
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error.mock.calls[1][0]).toBe('Full error:');
      expect(console.error.mock.calls[1][1]).toBe(error);
    });

    it('should not log full error object in production mode', () => {
      global.__DEV__ = false;
      const error = new Error('Test error');
      logger.error('TestComponent', 'testOperation', error);

      // Should only have 1 console.error call
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should handle errors with custom properties', () => {
      const error = new Error('Custom error');
      error.statusCode = 500;
      error.details = { field: 'email' };
      logger.error('TestComponent', 'testOperation', error);

      const formattedError = console.error.mock.calls[0][1];
      expect(formattedError).toHaveProperty('message', 'Custom error');
    });
  });

  // ============================================================================
  // logger.warn()
  // ============================================================================

  describe('logger.warn', () => {
    it('should log warning with component and message', () => {
      logger.warn('TestComponent', 'Test warning message');

      expect(console.warn).toHaveBeenCalled();
      const message = console.warn.mock.calls[0][0];
      expect(message).toContain('TestComponent');
      expect(message).toContain('Test warning message');
    });

    it('should include timestamp in warning message', () => {
      logger.warn('TestComponent', 'Test warning');

      const message = console.warn.mock.calls[0][0];
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should include additional context', () => {
      const context = { reason: 'validation', field: 'email' };
      logger.warn('TestComponent', 'Test warning', context);

      const loggedContext = console.warn.mock.calls[0][1];
      expect(loggedContext).toEqual(context);
    });

    it('should handle empty context', () => {
      logger.warn('TestComponent', 'Test warning');

      const loggedContext = console.warn.mock.calls[0][1];
      expect(loggedContext).toEqual({});
    });

    it('should always log warnings regardless of environment', () => {
      global.__DEV__ = false;
      logger.warn('TestComponent', 'Production warning');

      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // logger.info()
  // ============================================================================

  describe('logger.info', () => {
    it('should log info message in development mode', () => {
      global.__DEV__ = true;
      logger.info('TestComponent', 'Test info message');

      expect(console.log).toHaveBeenCalled();
      const message = console.log.mock.calls[0][0];
      expect(message).toContain('TestComponent');
      expect(message).toContain('Test info message');
    });

    it('should not log info message in production mode', () => {
      global.__DEV__ = false;
      logger.info('TestComponent', 'Test info message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should include timestamp in info message', () => {
      global.__DEV__ = true;
      logger.info('TestComponent', 'Test info');

      const message = console.log.mock.calls[0][0];
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should include additional context', () => {
      global.__DEV__ = true;
      const context = { step: 1, total: 5 };
      logger.info('TestComponent', 'Processing', context);

      const loggedContext = console.log.mock.calls[0][1];
      expect(loggedContext).toEqual(context);
    });

    it('should handle empty context', () => {
      global.__DEV__ = true;
      logger.info('TestComponent', 'Test info');

      const loggedContext = console.log.mock.calls[0][1];
      expect(loggedContext).toEqual({});
    });
  });

  // ============================================================================
  // logger.debug()
  // ============================================================================

  describe('logger.debug', () => {
    it('should log debug message in development mode', () => {
      global.__DEV__ = true;
      const data = { key: 'value', nested: { prop: 123 } };
      logger.debug('TestComponent', 'Debug message', data);

      expect(console.debug).toHaveBeenCalled();
      const message = console.debug.mock.calls[0][0];
      expect(message).toContain('TestComponent');
      expect(message).toContain('Debug message');
      expect(console.debug.mock.calls[0][1]).toEqual(data);
    });

    it('should not log debug message in production mode', () => {
      global.__DEV__ = false;
      logger.debug('TestComponent', 'Debug message', { key: 'value' });

      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should include timestamp in debug message', () => {
      global.__DEV__ = true;
      logger.debug('TestComponent', 'Debug');

      const message = console.debug.mock.calls[0][0];
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle empty data', () => {
      global.__DEV__ = true;
      logger.debug('TestComponent', 'Debug message');

      const data = console.debug.mock.calls[0][1];
      expect(data).toEqual({});
    });

    it('should handle various data types', () => {
      global.__DEV__ = true;

      logger.debug('TestComponent', 'Array data', [1, 2, 3]);
      expect(console.debug.mock.calls[0][1]).toEqual([1, 2, 3]);

      logger.debug('TestComponent', 'String data', 'test');
      expect(console.debug.mock.calls[1][1]).toBe('test');

      logger.debug('TestComponent', 'Number data', 42);
      expect(console.debug.mock.calls[2][1]).toBe(42);
    });
  });

  // ============================================================================
  // logger.success()
  // ============================================================================

  describe('logger.success', () => {
    it('should log success message in development mode', () => {
      global.__DEV__ = true;
      logger.success('TestComponent', 'testOperation');

      expect(console.log).toHaveBeenCalled();
      const message = console.log.mock.calls[0][0];
      expect(message).toContain('TestComponent');
      expect(message).toContain('testOperation');
      expect(message).toContain('succeeded');
    });

    it('should not log success message in production mode', () => {
      global.__DEV__ = false;
      logger.success('TestComponent', 'testOperation');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should include timestamp in success message', () => {
      global.__DEV__ = true;
      logger.success('TestComponent', 'testOperation');

      const message = console.log.mock.calls[0][0];
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should include additional context', () => {
      global.__DEV__ = true;
      const context = { id: 123, duration: '50ms' };
      logger.success('TestComponent', 'testOperation', context);

      const loggedContext = console.log.mock.calls[0][1];
      expect(loggedContext).toEqual(context);
    });

    it('should handle empty context', () => {
      global.__DEV__ = true;
      logger.success('TestComponent', 'testOperation');

      const loggedContext = console.log.mock.calls[0][1];
      expect(loggedContext).toEqual({});
    });
  });

  // ============================================================================
  // withErrorHandling()
  // ============================================================================

  describe('withErrorHandling', () => {
    it('should wrap async function and log success', async () => {
      global.__DEV__ = true;
      const mockFn = jest.fn(async (x) => x * 2);
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp');

      const result = await wrapped(5);

      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(console.log).toHaveBeenCalled();
      const successMessage = console.log.mock.calls[0][0];
      expect(successMessage).toContain('succeeded');
    });

    it('should catch errors and log them', async () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw mockError;
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp');

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should rethrow errors by default', async () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw mockError;
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp');

      await expect(wrapped()).rejects.toThrow('Test error');
    });

    it('should return fallback value when rethrow is false', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp', {
        rethrow: false,
        fallback: 'default-value',
      });

      const result = await wrapped();
      expect(result).toBe('default-value');
    });

    it('should call custom onError handler', async () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw mockError;
      });
      const onError = jest.fn();
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp', {
        rethrow: false,
        onError,
      });

      await wrapped();
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should pass arguments to wrapped function', async () => {
      const mockFn = jest.fn(async (a, b, c) => a + b + c);
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp');

      const result = await wrapped(1, 2, 3);
      expect(result).toBe(6);
      expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should include args in error context in development mode', async () => {
      global.__DEV__ = true;
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp', {
        rethrow: false,
      });

      await wrapped('arg1', 'arg2');

      const errorContext = console.error.mock.calls[0][2];
      expect(errorContext).toHaveProperty('args');
      expect(errorContext.args).toEqual(['arg1', 'arg2']);
    });

    it('should not include args in error context in production mode', async () => {
      global.__DEV__ = false;
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp', {
        rethrow: false,
      });

      await wrapped('arg1', 'arg2');

      const errorContext = console.error.mock.calls[0][2];
      expect(errorContext.args).toBeUndefined();
    });

    it('should handle synchronous errors', async () => {
      const mockFn = jest.fn(() => {
        throw new Error('Sync error');
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp');

      await expect(wrapped()).rejects.toThrow('Sync error');
    });

    it('should return fallback of null by default when rethrow is false', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = withErrorHandling(mockFn, 'TestComponent', 'testOp', {
        rethrow: false,
      });

      const result = await wrapped();
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // logErrors() decorator
  // ============================================================================

  describe('logErrors', () => {
    it('should wrap method with error handling', async () => {
      global.__DEV__ = true;

      const descriptor = {
        value: jest.fn(async (x) => x * 2),
      };

      logErrors('TestComponent', 'testMethod')({}, 'testMethod', descriptor);

      const result = await descriptor.value(5);
      expect(result).toBe(10);
      expect(console.log).toHaveBeenCalled();
    });

    it('should log errors from decorated method', async () => {
      const descriptor = {
        value: jest.fn(async () => {
          throw new Error('Decorated error');
        }),
      };

      logErrors('TestComponent', 'testMethod')({}, 'testMethod', descriptor);

      await expect(descriptor.value()).rejects.toThrow('Decorated error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should preserve original method behavior', async () => {
      const originalMethod = jest.fn(async (a, b) => a + b);
      const descriptor = { value: originalMethod };

      logErrors('TestComponent', 'add')({}, 'add', descriptor);

      const result = await descriptor.value(3, 4);
      expect(result).toBe(7);
    });

    it('should return modified descriptor', () => {
      const descriptor = {
        value: jest.fn(async () => 'test'),
      };

      const result = logErrors('TestComponent', 'testMethod')({}, 'testMethod', descriptor);

      expect(result).toBe(descriptor);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('function');
    });
  });

  // ============================================================================
  // Environment Detection
  // ============================================================================

  describe('environment detection', () => {
    it('should detect development via __DEV__ global', () => {
      global.__DEV__ = true;
      logger.info('TestComponent', 'Should log');
      expect(console.log).toHaveBeenCalled();
    });

    it('should detect production when __DEV__ is false', () => {
      global.__DEV__ = false;
      logger.info('TestComponent', 'Should not log');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle missing __DEV__ global', () => {
      const originalDEV = global.__DEV__;
      delete global.__DEV__;

      // Should not throw error
      expect(() => {
        logger.info('TestComponent', 'Test');
      }).not.toThrow();

      global.__DEV__ = originalDEV;
    });
  });
});
