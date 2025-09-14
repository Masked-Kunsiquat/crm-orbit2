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
        const results = [];
        try {
          await this.db.execAsync('BEGIN TRANSACTION;');
          for (const stmt of statements) {
            const { sql, params = [] } = stmt;
            const result = params.length > 0
              ? await this.db.runAsync(sql, params)
              : await this.db.execAsync(sql);
            results.push(result);
          }
          await this.db.execAsync('COMMIT;');
          return results;
        } catch (error) {
          try {
            await this.db.execAsync('ROLLBACK;');
          } catch (rollbackError) {
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
            execute: async (sql, params = []) => {
              return params.length > 0
                ? await this.db.runAsync(sql, params)
                : await this.db.execAsync(sql);
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
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
