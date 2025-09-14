// Database initialization service
//
// MIGRATION STRATEGY:
// This service uses the canonical migration system located at database/migrations/
// to ensure consistency and prevent schema drift. All CREATE TABLE, CREATE INDEX,
// and CREATE TRIGGER statements are defined in versioned migration files:
//
// - database/migrations/001_initial_schema.js - Base schema (tables, indexes, triggers)
// - database/migrations/002_seed_data.js - Initial data population
// - database/migrations/003_performance_indexes.js - Performance optimizations
// - database/migrations/004_add_display_name_column.js - Schema updates
//
// The migration runner (database/migrations/migrationRunner.js) handles:
// - Sequential migration execution with proper transaction management
// - Migration state tracking via the 'migrations' metadata table
// - Error handling and rollback on failure
// - Integration with expo-sqlite database adapters
//
// This approach eliminates duplicate schema definitions and ensures that all
// database initialization paths (new installs, upgrades, tests) use identical
// schema definitions from a single source of truth.
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../database/migrations/migrationRunner.js';

// Note: Schema migrations are now handled by the canonical migration system
// located at database/migrations/. This prevents schema drift and ensures
// consistency across different initialization paths.

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize(options = {}) {
    const { signal } = options || {};
    // Respect a pre-aborted signal to fail fast
    if (signal && signal.aborted) {
      const abortError = new Error('Database initialization aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return true;
    }

    this.initializationPromise = this._performInitialization({ signal });
    return this.initializationPromise;
  }

  async _performInitialization(options = {}) {
    const { signal } = options || {};
    if (signal && signal.aborted) {
      const abortError = new Error('Initialization aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    try {
      console.log('Initializing database...');
      
      // Open database connection
      this.db = await SQLite.openDatabaseAsync('crm.db');

      // Set recommended pragmas for better reliability and performance
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      await this.db.execAsync('PRAGMA synchronous = NORMAL;');
      await this.db.execAsync('PRAGMA recursive_triggers = OFF;');
      // Enable foreign key constraints
      await this.db.execAsync('PRAGMA foreign_keys = ON;');

      // Clear any existing problematic database state for development
      // Requires explicit flag to prevent accidental data loss
      if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.DROP_DEV_TABLES === 'true') {
        try {
          console.log('DROP_DEV_TABLES flag detected - dropping all tables for fresh start');

          // Drop all tables in a single transaction for atomicity
          const tables = [
            'user_preferences', 'contact_categories', 'notes', 'interactions',
            'event_reminders', 'events', 'contact_info', 'contacts',
            'categories', 'companies', 'attachments', 'migrations'
          ];

          await this.db.execAsync('BEGIN TRANSACTION;');
          try {
            for (const table of tables) {
              await this.db.execAsync(`DROP TABLE IF EXISTS ${table};`);
            }
            await this.db.execAsync('COMMIT;');
            console.log('Successfully cleared all existing tables for fresh database start');
          } catch (dropError) {
            await this.db.execAsync('ROLLBACK;');
            throw dropError;
          }
        } catch (e) {
          console.error('Error clearing tables:', e);
          // Re-throw to prevent silent failures
          throw new Error(`Database table clearing failed: ${e.message}`);
        }
      } else if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('Development mode detected but DROP_DEV_TABLES not set - preserving existing data');
        console.log('To drop tables for fresh start, set environment variable: DROP_DEV_TABLES=true');
      }

      // Run canonical migrations to establish complete schema
      await this._runCanonicalMigrations({ signal });
      
      console.log('Database initialized successfully');
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      // Attempt to close any opened DB connection without masking the original error
      if (this.db) {
        try {
          if (typeof this.db.closeAsync === 'function') {
            await this.db.closeAsync();
          } else if (typeof this.db.close === 'function') {
            await this.db.close();
          }
        } catch (closeError) {
          console.error('Error closing database after failed initialization:', closeError);
        } finally {
          this.db = null;
        }
      }
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  async _runCanonicalMigrations(options = {}) {
    const { signal } = options || {};
    if (!this.db) {
      throw new Error('Database not open');
    }

    // Helper to respect abort signal
    const throwIfAborted = () => {
      if (signal && signal.aborted) {
        const abortError = new Error('Initialization aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
    };

    throwIfAborted();

    // Create migration context with expo-sqlite compatibility helpers
    const migrationContext = {
      db: this.db,
      execute: async (sql, params = []) => {
        throwIfAborted();
        try {
          if (params && params.length > 0) {
            return await this.db.runAsync(sql, params);
          } else {
            return await this.db.execAsync(sql);
          }
        } catch (error) {
          console.error('Migration SQL error:', { sql, params, error });
          throw error;
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
          await this.db.execAsync('BEGIN TRANSACTION;');
          for (const entry of items) {
            throwIfAborted();
            const { sql, params = [] } = normalize(entry);
            const res = params.length
              ? await this.db.runAsync(sql, params)
              : await this.db.execAsync(sql);
            results.push(res);
          }
          await this.db.execAsync('COMMIT;');
          return results;
        } catch (error) {
          try { await this.db.execAsync('ROLLBACK;'); } catch (rollbackError) {
            console.error('Migration rollback error:', rollbackError);
          }
          throw error;
        }
      },
      transaction: async (work) => {
        throwIfAborted();
        try {
          await this.db.execAsync('BEGIN TRANSACTION;');
          const txContext = {
            execute: async (sql, params = [], options = {}) => {
              const contextSignal = options.signal || signal;
              // Check abort status before starting
              if (contextSignal && contextSignal.aborted) {
                const abortError = new Error('Transaction execute operation aborted');
                abortError.name = 'AbortError';
                throw abortError;
              }

              try {
                const result = params.length > 0
                  ? await this.db.runAsync(sql, params)
                  : await this.db.execAsync(sql);

                // Check abort status after operation
                if (contextSignal && contextSignal.aborted) {
                  const abortError = new Error('Transaction execute operation aborted');
                  abortError.name = 'AbortError';
                  throw abortError;
                }

                return result;
              } catch (error) {
                // Re-check abort status in case operation was cancelled
                if (contextSignal && contextSignal.aborted) {
                  const abortError = new Error('Transaction execute operation aborted');
                  abortError.name = 'AbortError';
                  throw abortError;
                }
                throw error;
              }
            },
            batch: async (statements, options = {}) => {
              const contextSignal = options.signal || signal;
              // Check abort status before starting batch
              if (contextSignal && contextSignal.aborted) {
                const abortError = new Error('Transaction batch operation aborted');
                abortError.name = 'AbortError';
                throw abortError;
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
                  const abortError = new Error('Transaction batch operation aborted');
                  abortError.name = 'AbortError';
                  throw abortError;
                }

                const { sql, params = [] } = normalize(entry);
                try {
                  const result = params.length > 0
                    ? await this.db.runAsync(sql, params)
                    : await this.db.execAsync(sql);

                  // Check abort status after each operation
                  if (contextSignal && contextSignal.aborted) {
                    const abortError = new Error('Transaction batch operation aborted');
                    abortError.name = 'AbortError';
                    throw abortError;
                  }

                  results.push(result);
                } catch (error) {
                  // Break out of loop on abort to avoid executing further statements
                  if (contextSignal && contextSignal.aborted) {
                    const abortError = new Error('Transaction batch operation aborted');
                    abortError.name = 'AbortError';
                    throw abortError;
                  }
                  throw error;
                }
              }
              return results;
            }
          };
          const result = await work(txContext);
          await this.db.execAsync('COMMIT;');
          return result;
        } catch (error) {
          try {
            await this.db.execAsync('ROLLBACK;');
          } catch (rollbackError) {
            console.error('Migration transaction rollback error:', rollbackError);
          }
          throw error;
        }
      },
      onLog: (msg) => console.log(`[migrations] ${msg}`)
    };

    try {
      await runMigrations(migrationContext);
    } catch (error) {
      console.error('Canonical migration execution failed:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        originalError: error?.originalError,
        context: error?.context
      });
      if (error?.originalError) {
        console.error('Original error:', error.originalError);
      }
      throw error;
    }
  }

  // Schema creation is now handled entirely by the canonical migration system.
  // All CREATE TABLE, CREATE INDEX, and CREATE TRIGGER statements have been
  // moved to database/migrations/001_initial_schema.js to prevent schema drift.

  async getDatabase() {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  isReady() {
    return this.isInitialized;
  }

  async close() {
    if (this.db) {
      try {
        // Handle both async and sync close implementations
        if (typeof this.db.closeAsync === 'function') {
          await this.db.closeAsync();
        } else if (typeof this.db.close === 'function') {
          const result = this.db.close();
          // Await if it returns a promise
          if (result && typeof result.then === 'function') {
            await result;
          }
        } else {
          console.warn('Database close method not available - connection may not be properly closed');
        }
      } catch (error) {
        console.error('Error closing database connection:', error);
        // Don't throw - we still want to clear state even if close fails
      } finally {
        // Always clear internal state regardless of close success/failure
        this.db = null;
        this.isInitialized = false;
        this.initializationPromise = null;
      }
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
