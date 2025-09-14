/**
 * Expo SQLite adapter for migrations
 *
 * Provides migration context with expo-sqlite compatibility helpers.
 * Handles transaction management, batch operations, and abort signal support.
 *
 * @module ExpoSqliteAdapter
 */
import { DatabaseError } from '../errors.js';

/**
 * Creates a migration context for expo-sqlite database operations
 * @param {object} db - The expo-sqlite database instance
 * @param {object} options - Configuration options
 * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation
 * @param {Function} [options.onLog] - Optional logging callback
 * @returns {object} Migration context with execute, batch, transaction, and onLog methods
 */
export function createMigrationContext(db, options = {}) {
  const { signal, onLog = (msg) => console.log(msg) } = options;

  // Helper to respect abort signal
  const throwIfAborted = () => {
    if (signal && signal.aborted) {
      throw new DatabaseError('Initialization aborted', 'INITIALIZATION_ABORTED');
    }
  };

  // Helper to detect if parameters are provided (array or object)
  const hasParams = (p) =>
    p != null && ((Array.isArray(p) && p.length > 0) || (typeof p === 'object' && Object.keys(p).length > 0));

  return {
    db,
    execute: async (sql, params = []) => {
      throwIfAborted();
      try {
        if (hasParams(params)) {
          return await db.runAsync(sql, params);
        } else {
          return await db.execAsync(sql);
        }
      } catch (error) {
        // Wrap in DatabaseError with original error and context
        const wrappedError = new DatabaseError(
          `Migration SQL execution failed: ${error.message}`,
          'MIGRATION_SQL_ERROR',
          error,
          { sql, params }
        );

        // Log through the onLog handler instead of console.error
        onLog(`[ERROR] Migration SQL error: ${wrappedError.message}`, {
          level: 'error',
          sql,
          params,
          error: wrappedError
        });

        throw wrappedError;
      }
    },
    batch: async (statements) => {
      throwIfAborted();
      const items = Array.isArray(statements) ? statements : [];
      const normalize = (entry) => {
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
        await db.execAsync('COMMIT;');
        return results;
      } catch (error) {
        try { await db.execAsync('ROLLBACK;'); } catch (rollbackError) {
          onLog(`[ERROR] Migration rollback error: ${rollbackError?.message || rollbackError}`, {
            level: 'error',
            error: rollbackError
          });
        }
        throw error;
      }
    },
    transaction: async (work) => {
      throwIfAborted();
      try {
        await db.execAsync('BEGIN TRANSACTION;');
      } catch (error) {
        const wrappedError = new DatabaseError(
          `Transaction BEGIN failed: ${error.message}`,
          'TRANSACTION_BEGIN_ERROR',
          error
        );
        onLog(`[ERROR] Transaction BEGIN error: ${wrappedError.message}`, {
          level: 'error',
          error: wrappedError
        });
        throw wrappedError;
      }

      try {
        const txContext = {
          execute: async (sql, params = [], options = {}) => {
            const contextSignal = options.signal || signal;
            // Check abort status before starting
            if (contextSignal && contextSignal.aborted) {
              throw new DatabaseError('Transaction execute operation aborted', 'INITIALIZATION_ABORTED');
            }

            try {
              const result = hasParams(params)
                ? await db.runAsync(sql, params)
                : await db.execAsync(sql);

              // Check abort status after operation
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Transaction execute operation aborted', 'INITIALIZATION_ABORTED');
              }

              return result;
            } catch (error) {
              // Re-check abort status in case operation was cancelled
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Transaction execute operation aborted', 'INITIALIZATION_ABORTED');
              }
              throw error;
            }
          },
          batch: async (statements, options = {}) => {
            const contextSignal = options.signal || signal;
            // Check abort status before starting batch
            if (contextSignal && contextSignal.aborted) {
              throw new DatabaseError('Transaction batch operation aborted', 'INITIALIZATION_ABORTED');
            }

            // Execute statements sequentially within transaction
            const items = Array.isArray(statements) ? statements : [];
            const normalize = (entry) => {
              if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
              if (entry && typeof entry === 'object' && 'sql' in entry) return entry;
              return { sql: String(entry), params: [] };
            };
            const results = [];

            for (const entry of items) {
              // Check abort status before each statement
              if (contextSignal && contextSignal.aborted) {
                throw new DatabaseError('Transaction batch operation aborted', 'INITIALIZATION_ABORTED');
              }

              const { sql, params = [] } = normalize(entry);
              try {
                const result = hasParams(params)
                  ? await db.runAsync(sql, params)
                  : await db.execAsync(sql);

                // Check abort status after each operation
                if (contextSignal && contextSignal.aborted) {
                  throw new DatabaseError('Transaction batch operation aborted', 'INITIALIZATION_ABORTED');
                }

                results.push(result);
              } catch (error) {
                // Break out of loop on abort to avoid executing further statements
                if (contextSignal && contextSignal.aborted) {
                  throw new DatabaseError('Transaction batch operation aborted', 'INITIALIZATION_ABORTED');
                }
                throw error;
              }
            }
            return results;
          }
        };
        const result = await work(txContext);

        // Check abort signal before committing
        if (signal && signal.aborted) {
          throw new DatabaseError('Transaction aborted before commit', 'COMMIT_ABORTED');
        }

        try {
          await db.execAsync('COMMIT;');
        } catch (error) {
          const wrappedError = new DatabaseError(
            `Transaction COMMIT failed: ${error.message}`,
            'TRANSACTION_COMMIT_ERROR',
            error
          );
          onLog(`[ERROR] Transaction COMMIT error: ${wrappedError.message}`, {
            level: 'error',
            error: wrappedError
          });
          throw wrappedError;
        }

        return result;
      } catch (error) {
        try {
          await db.execAsync('ROLLBACK;');
        } catch (rollbackError) {
          const wrappedRollbackError = new DatabaseError(
            `Transaction ROLLBACK failed: ${rollbackError.message}`,
            'TRANSACTION_ROLLBACK_ERROR',
            rollbackError
          );
          onLog(`[ERROR] Transaction ROLLBACK error: ${wrappedRollbackError.message}`, {
            level: 'error',
            error: wrappedRollbackError
          });
        }

        // Ensure we throw a DatabaseError
        if (error instanceof DatabaseError) {
          throw error;
        } else {
          const wrappedError = new DatabaseError(
            `Transaction failed: ${error.message}`,
            'TRANSACTION_ERROR',
            error
          );
          onLog(`[ERROR] Transaction error: ${wrappedError.message}`, {
            level: 'error',
            error: wrappedError
          });
          throw wrappedError;
        }
      }
    },
    onLog
  };
}

export default createMigrationContext;