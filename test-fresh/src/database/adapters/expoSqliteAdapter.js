/**
 * Expo SQLite adapter for migrations
 *
 * Provides migration context with expo-sqlite compatibility helpers.
 * Handles transaction management, batch operations, and abort signal support.
 *
 * @module ExpoSqliteAdapter
 */
import { DatabaseError, logger } from '../../errors';

/**
 * Creates a migration context for expo-sqlite database operations
 * @param {object} db - The expo-sqlite database instance
 * @param {object} options - Configuration options
 * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation
 * @param {Function} [options.onLog] - Optional logging callback
 * @returns {object} Migration context with execute, batch, transaction, and onLog methods
 */
export function createMigrationContext(db, options = {}) {
  const { signal, onLog = msg => console.log(msg) } = options;

  // Helper to respect abort signal
  const throwIfAborted = () => {
    if (signal && signal.aborted) {
      throw new DatabaseError('Operation aborted', 'ABORT_ERR');
    }
  };

  // Helper to detect if parameters are provided (array or object)
  const hasParams = p =>
    p != null &&
    ((Array.isArray(p) && p.length > 0) ||
      (typeof p === 'object' && Object.keys(p).length > 0));

  return {
    db,
    execute: async (sql, params, options = {}) => {
      const contextSignal = options.signal || signal;
      if (contextSignal && contextSignal.aborted) {
        throw new DatabaseError('Operation aborted', 'ABORT_ERR');
      }
      try {
        let result;
        if (hasParams(params)) {
          result = await db.runAsync(sql, params);
        } else {
          result = await db.execAsync(sql);
        }
        if (contextSignal && contextSignal.aborted) {
          throw new DatabaseError('Operation aborted', 'ABORT_ERR');
        }
        return result;
      } catch (error) {
        // Re-check abort status in case operation was cancelled
        if (contextSignal && contextSignal.aborted) {
          throw new DatabaseError('Operation aborted', 'ABORT_ERR');
        }

        // Wrap in DatabaseError with original error and context
        const wrappedError = new DatabaseError(
          `Migration SQL execution failed: ${error?.message ?? String(error)}`,
          'MIGRATION_SQL_ERROR',
          error,
          { sql, params }
        );

        // Log through both logger and onLog
        logger.error('ExpoSqliteAdapter', 'execute', error, { sql });
        onLog(`[ERROR] Migration SQL error: ${wrappedError.message}`, {
          level: 'error',
          sql,
          params,
          error: wrappedError,
        });

        throw wrappedError;
      }
    },
    batch: async statements => {
      throwIfAborted();
      if (!Array.isArray(statements)) {
        const err = new DatabaseError(
          'Batch expects an array of statements',
          'BATCH_INVALID_INPUT',
          null,
          { statements }
        );
        logger.error('ExpoSqliteAdapter', 'batch', err);
        onLog(`[ERROR] ${err.message}`, {
          level: 'error',
          context: { statements },
        });
        throw err;
      }
      const items = statements;
      const normalize = entry => {
        if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
        if (entry && typeof entry === 'object' && 'sql' in entry) return entry;
        return { sql: String(entry), params: [] };
      };
      const results = [];
      try {
        await db.execAsync('BEGIN TRANSACTION;');
        for (const entry of items) {
          throwIfAborted();
          const { sql, params = [] } = normalize(entry);
          const res = hasParams(params)
            ? await db.runAsync(sql, params)
            : await db.execAsync(sql);
          results.push(res);
        }
        throwIfAborted();
        await db.execAsync('COMMIT;');
        logger.success('ExpoSqliteAdapter', 'batch', { count: results.length });
        return results;
      } catch (error) {
        try {
          await db.execAsync('ROLLBACK;');
        } catch (rollbackError) {
          const wrappedRollbackError = new DatabaseError(
            `Batch rollback failed: ${rollbackError?.message || rollbackError}`,
            'BATCH_ROLLBACK_ERROR',
            rollbackError,
            { statements }
          );
          logger.error('ExpoSqliteAdapter', 'batch-rollback', rollbackError);
          onLog(
            `[ERROR] Batch rollback error: ${wrappedRollbackError.message}`,
            {
              level: 'error',
              error: wrappedRollbackError,
              context: { statements },
            }
          );
        }

        // Wrap the original error
        const wrappedError = new DatabaseError(
          `Batch operation failed: ${error?.message ?? String(error)}`,
          'BATCH_FAILED',
          error,
          { statements }
        );

        logger.error('ExpoSqliteAdapter', 'batch', error);
        onLog(`[ERROR] Batch operation error: ${wrappedError.message}`, {
          level: 'error',
          error: wrappedError,
          context: { statements },
        });

        throw wrappedError;
      }
    },
    transaction: async work => {
      throwIfAborted();
      try {
        await db.execAsync('BEGIN TRANSACTION;');
      } catch (error) {
        const wrappedError = new DatabaseError(
          `Transaction BEGIN failed: ${error?.message ?? String(error)}`,
          'TRANSACTION_BEGIN_ERROR',
          error
        );
        logger.error('ExpoSqliteAdapter', 'transaction-begin', error);
        onLog(`[ERROR] Transaction BEGIN error: ${wrappedError.message}`, {
          level: 'error',
          error: wrappedError,
        });
        throw wrappedError;
      }

      try {
        const txContext = {
          execute: async (sql, params = [], options = {}) => {
            const contextSignal = options.signal || signal;
            // Check abort status before starting
            if (contextSignal && contextSignal.aborted) {
              throw new DatabaseError('Operation aborted', 'ABORT_ERR');
            }

            try {
              const result = hasParams(params)
                ? await db.runAsync(sql, params)
                : await db.execAsync(sql);

              // Check abort status after operation
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Operation aborted', 'ABORT_ERR');
              }

              return result;
            } catch (error) {
              // Re-check abort status in case operation was cancelled
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Operation aborted', 'ABORT_ERR');
              }
              throw error;
            }
          },
          batch: async (statements, options = {}) => {
            const contextSignal = options.signal || signal;
            // Check abort status before starting batch
            if (contextSignal && contextSignal.aborted) {
              throw new DatabaseError('Operation aborted', 'ABORT_ERR');
            }

            // Validate input and execute sequentially within transaction
            if (!Array.isArray(statements)) {
              const err = new DatabaseError(
                'Batch expects an array of statements',
                'BATCH_INVALID_INPUT',
                null,
                { statements }
              );
              logger.error('ExpoSqliteAdapter', 'transaction-batch', err);
              onLog(`[ERROR] ${err.message}`, {
                level: 'error',
                context: { statements },
              });
              throw err;
            }
            const items = statements;
            const normalize = entry => {
              if (Array.isArray(entry))
                return { sql: entry[0], params: entry[1] };
              if (entry && typeof entry === 'object' && 'sql' in entry)
                return entry;
              return { sql: String(entry), params: [] };
            };
            const results = [];

            for (const entry of items) {
              // Check abort status before each statement
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Operation aborted', 'ABORT_ERR');
              }

              const { sql, params = [] } = normalize(entry);
              try {
                const result = hasParams(params)
                  ? await db.runAsync(sql, params)
                  : await db.execAsync(sql);

                // Check abort status after each operation
                if (contextSignal && contextSignal.aborted) {
                  throw new DatabaseError('Operation aborted', 'ABORT_ERR');
                }

                results.push(result);
              } catch (error) {
                // Break out of loop on abort to avoid executing further statements
                if (contextSignal && contextSignal.aborted) {
                  throw new DatabaseError('Operation aborted', 'ABORT_ERR');
                }
                throw error;
              }
            }
            return results;
          },
        };
        const result = await work(txContext);

        // Check abort signal before committing
        if (signal && signal.aborted) {
          throw new DatabaseError(
            'Transaction aborted before commit',
            'COMMIT_ABORTED'
          );
        }

        try {
          await db.execAsync('COMMIT;');
          logger.success('ExpoSqliteAdapter', 'transaction');
        } catch (error) {
          const wrappedError = new DatabaseError(
            `Transaction COMMIT failed: ${error?.message ?? String(error)}`,
            'TRANSACTION_COMMIT_ERROR',
            error
          );
          logger.error('ExpoSqliteAdapter', 'transaction-commit', error);
          onLog(`[ERROR] Transaction COMMIT error: ${wrappedError.message}`, {
            level: 'error',
            error: wrappedError,
          });
          throw wrappedError;
        }

        return result;
      } catch (error) {
        try {
          await db.execAsync('ROLLBACK;');
        } catch (rollbackError) {
          const wrappedRollbackError = new DatabaseError(
            `Transaction ROLLBACK failed: ${rollbackError?.message ?? String(rollbackError)}`,
            'TRANSACTION_ROLLBACK_ERROR',
            rollbackError
          );
          logger.error('ExpoSqliteAdapter', 'transaction-rollback', rollbackError);
          onLog(
            `[ERROR] Transaction ROLLBACK error: ${wrappedRollbackError.message}`,
            {
              level: 'error',
              error: wrappedRollbackError,
            }
          );
        }

        // Ensure we throw a DatabaseError
        if (error instanceof DatabaseError) {
          logger.error('ExpoSqliteAdapter', 'transaction', error);
          throw error;
        } else {
          const wrappedError = new DatabaseError(
            `Transaction failed: ${error?.message ?? String(error)}`,
            'TRANSACTION_ERROR',
            error
          );
          logger.error('ExpoSqliteAdapter', 'transaction', error);
          onLog(`[ERROR] Transaction error: ${wrappedError.message}`, {
            level: 'error',
            error: wrappedError,
          });
          throw wrappedError;
        }
      }
    },
    onLog,
  };
}

export default createMigrationContext;
