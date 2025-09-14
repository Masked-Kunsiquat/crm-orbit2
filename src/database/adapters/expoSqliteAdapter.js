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

  return {
    db,
    execute: async (sql, params = []) => {
      throwIfAborted();
      try {
        if (params && params.length > 0) {
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
          const res = params.length
            ? await db.runAsync(sql, params)
            : await db.execAsync(sql);
          results.push(res);
        }
        await db.execAsync('COMMIT;');
        return results;
      } catch (error) {
        try { await db.execAsync('ROLLBACK;'); } catch (rollbackError) {
          console.error('Migration rollback error:', rollbackError);
        }
        throw error;
      }
    },
    transaction: async (work) => {
      throwIfAborted();
      try {
        await db.execAsync('BEGIN TRANSACTION;');
        const txContext = {
          execute: async (sql, params = [], options = {}) => {
            const contextSignal = options.signal || signal;
            // Check abort status before starting
            if (contextSignal && contextSignal.aborted) {
              throw new DatabaseError('Transaction execute operation aborted', 'INITIALIZATION_ABORTED');
            }

            try {
              const result = params.length > 0
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
                const result = params.length > 0
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
        await db.execAsync('COMMIT;');
        return result;
      } catch (error) {
        try {
          await db.execAsync('ROLLBACK;');
        } catch (rollbackError) {
          console.error('Migration transaction rollback error:', rollbackError);
        }
        throw error;
      }
    },
    onLog
  };
}

export default createMigrationContext;