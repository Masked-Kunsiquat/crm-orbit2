// Database Orchestrator
// - Initializes expo-sqlite connection
// - Manages DB lifecycle and helpers
// - Prepares and triggers migrations
// - Exports unified API surface for DB modules
/**
 * Database Orchestrator for Expo SQLite.
 *
 * Responsibilities:
 * - Initialize SQLite connection and configure PRAGMAs
 * - Provide Promise-friendly helpers: `execute`, `batch`, `transaction`
 * - Run migrations during initialization
 * - Export a unified API surface for feature modules
 *
 * Notes:
 * - WebSQL transaction callbacks are synchronous. See `transaction()` docs for details
 *   on how to schedule SQL calls to ensure they run inside the same transaction.
 */

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations/migrationRunner';
import { createContactsDB } from './contacts';
import { createContactsInfoDB } from './contactsInfo';
import { createCategoriesDB } from './categories';
import { createCategoriesRelationsDB } from './categoriesRelations';
import { createCompaniesDB } from './companies';
import { createEventsDB } from './events';
import { createEventsRecurringDB } from './eventsRecurring';
import { createEventsRemindersDB } from './eventsReminders';
import { createInteractionsDB } from './interactions';
import { createInteractionsStatsDB } from './interactionsStats';
import { createInteractionsSearchDB } from './interactionsSearch';
import { createNotesDB } from './notes';
import { createAttachmentsDB } from './attachments';
import { createSettingsDB } from './settings';
import { DatabaseError, logger } from '../errors';
// Use modern expo-sqlite async API
const openDatabaseAsync = SQLite.openDatabaseAsync || (() => {
  const availableMethods = Object.keys(SQLite);
  logger.error('Database', 'checkAPI', new Error('Modern expo-sqlite API not available'), {
    availableMethods
  });
  throw new Error('SQLite.openDatabaseAsync method not available');
});

// Re-export for consumers that import from this module
export { DatabaseError } from '../errors';

let _db = null;
let _initialized = false;
let _initInflight = null;

const DEFAULT_DB_NAME = 'crm_orbit.db';


/**
 * Get the open database instance.
 * @throws {DatabaseError} If database has not been initialized.
 * @returns {any} SQLite database instance
 */
function getDB() {
  if (!_db) {
    throw new DatabaseError(
      'Database has not been initialized. Call initDatabase() first.',
      'DB_NOT_INITIALIZED'
    );
  }
  return _db;
}

/**
 * Open (or reuse) the SQLite database using modern async API.
 * @private
 * @param {string} [dbName]
 * @returns {any} SQLite database instance
 * @throws {DatabaseError} When opening fails
 */
async function openDatabaseConnection(dbName = DEFAULT_DB_NAME) {
  try {
    _db = await openDatabaseAsync(dbName);
    logger.success('Database', 'openDatabaseConnection', { dbName });
    return _db;
  } catch (err) {
    logger.error('Database', 'openDatabaseConnection', err, { dbName });
    throw new DatabaseError('Failed to open database', 'OPEN_FAILED', err, {
      dbName,
    });
  }
}

/**
 * Execute a single SQL statement using modern async API.
 * @param {string} sql SQL string with `?` placeholders.
 * @param {any[]} [params=[]] Values for placeholders.
 * @returns {Promise<{rows:any[], rowsAffected:number, insertId:number|null}>}
 * @throws {DatabaseError}
 */
export async function execute(sql, params = []) {
  const db = getDB();
  try {
    let result;
    const firstToken = sql.trim().split(/\s+/)[0]?.toUpperCase();
    const returnsRows = ['SELECT', 'PRAGMA', 'WITH', 'EXPLAIN', 'VALUES'].includes(firstToken);

    if (returnsRows) {
      // Use getAllAsync for SELECT queries
      const rows = await db.getAllAsync(sql, params);
      result = {
        rows: rows || [],
        rowsAffected: 0,
        insertId: null,
      };
    } else {
      // Use runAsync for INSERT/UPDATE/DELETE/CREATE queries
      const runResult = await db.runAsync(sql, params);
      result = {
        rows: [],
        rowsAffected: runResult.changes || 0,
        insertId: runResult.lastInsertRowId || null,
      };
    }
    return result;
  } catch (err) {
    logger.error('Database', 'execute', err, { sql });
    throw new DatabaseError('SQL execution failed', 'SQL_ERROR', err, {
      sql,
      params,
    });
  }
}

/**
 * Execute multiple SQL statements inside a single transaction.
 * If any step fails, the transaction aborts and changes roll back.
 * @param {{sql: string, params?: any[]}[]} statements Ordered list of statements.
 * @returns {Promise<Array<{rows:any[], rowsAffected:number, insertId:number|null}>>}
 * @throws {DatabaseError}
 */
export async function batch(statements) {
  const db = getDB();
  if (!Array.isArray(statements) || statements.length === 0) {
    return [];
  }

  try {
    const results = [];
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < statements.length; i++) {
        const { sql, params = [] } = statements[i];
        try {
          let result;
          const firstToken = sql.trim().split(/\s+/)[0]?.toUpperCase();
          const returnsRows = ['SELECT', 'PRAGMA', 'WITH', 'EXPLAIN', 'VALUES'].includes(firstToken);

          if (returnsRows) {
            const rows = await db.getAllAsync(sql, params);
            result = {
              rows: rows || [],
              rowsAffected: 0,
              insertId: null,
            };
          } else {
            const runResult = await db.runAsync(sql, params);
            result = {
              rows: [],
              rowsAffected: runResult.changes || 0,
              insertId: runResult.lastInsertRowId || null,
            };
          }
          results[i] = result;
        } catch (error) {
          logger.error('Database', 'batch-step', error, { index: i, sql });
          throw new DatabaseError(
            'SQL batch step failed',
            'SQL_ERROR',
            error,
            {
              index: i,
              sql,
              params,
            }
          );
        }
      }
    });
    logger.success('Database', 'batch', { count: results.length });
    return results;
  } catch (err) {
    if (err instanceof DatabaseError) {
      throw err;
    }
    logger.error('Database', 'batch', err);
    throw new DatabaseError(
      'Batch transaction failed',
      'TX_ERROR',
      err
    );
  }
}

/**
 * Run a transaction and provide a Promise-based `tx.execute` helper.
 * Uses modern async transaction API for true async/await semantics.
 *
 * @template T
 * @param {(tx: { execute: (sql: string, params?: any[]) => Promise<any> }) => (T|Promise<T>)} work
 * @returns {Promise<T>}
 * @throws {DatabaseError}
 */
export async function transaction(work) {
  const db = getDB();
  try {
    return await db.withTransactionAsync(async () => {
      const wrappedTx = {
        execute: async (sql, params = []) => {
          try {
            let result;
            const firstToken = sql.trim().split(/\s+/)[0]?.toUpperCase();
            const returnsRows = ['SELECT', 'PRAGMA', 'WITH', 'EXPLAIN', 'VALUES'].includes(firstToken);

            if (returnsRows) {
              const rows = await db.getAllAsync(sql, params);
              result = {
                rows: rows || [],
                rowsAffected: 0,
                insertId: null,
              };
            } else {
              const runResult = await db.runAsync(sql, params);
              result = {
                rows: [],
                rowsAffected: runResult.changes || 0,
                insertId: runResult.lastInsertRowId || null,
              };
            }
            return result;
          } catch (error) {
            logger.error('Database', 'transaction-execute', error, { sql });
            throw new DatabaseError(
              'SQL execution failed',
              'SQL_ERROR',
              error,
              { sql, params }
            );
          }
        },
      };

      const result = await work(wrappedTx);
      logger.success('Database', 'transaction');
      return result;
    });
  } catch (err) {
    if (err instanceof DatabaseError) {
      throw err;
    }
    logger.error('Database', 'transaction', err);
    throw new DatabaseError(
      'Transaction failed',
      'TX_ERROR',
      err
    );
  }
}

/**
 * Initialize the database connection, configure PRAGMAs, and run migrations.
 * @param {Object} [options]
 * @param {string} [options.name] Database file name.
 * @param {boolean} [options.enableForeignKeys=true] Enable foreign key checks.
 * @param {boolean} [options.enableWAL=true] Attempt to enable WAL journal mode.
 * @param {boolean} [options.runMigrationsOnInit=true] Run migrations during init.
 * @param {(msg: string) => void} [options.onLog] Optional logger.
 * @returns {Promise<any>} The underlying SQLite database instance.
 * @throws {DatabaseError}
 */
export async function initDatabase(options = {}) {
  const {
    name = DEFAULT_DB_NAME,
    enableForeignKeys = true,
    enableWAL = true,
    runMigrationsOnInit = true,
    onLog = null,
  } = options;

  if (_initialized && _db) return _db;
  if (_initInflight) return _initInflight;

  const startInit = async () => {
    const db = await openDatabaseConnection(name);

    // Basic PRAGMA setup using modern API
    try {
      if (enableWAL) {
        // journal_mode may not be supported on some platforms; ignore failure
        try {
          await db.execAsync('PRAGMA journal_mode = WAL;');
        } catch (_) {}
      }
      if (enableForeignKeys) {
        await db.execAsync('PRAGMA foreign_keys = ON;');
        try {
          const checkResult = await db.getAllAsync('PRAGMA foreign_keys;');
          const enabled = checkResult?.[0]?.foreign_keys === 1;
          if (!enabled)
            onLog && onLog('Warning: PRAGMA foreign_keys not enabled.');
        } catch {}
      }
    } catch (err) {
      logger.error('Database', 'configurePragmas', err);
      throw new DatabaseError(
        'Failed to configure database PRAGMAs',
        'PRAGMA_FAILED',
        err
      );
    }

    // Run migrations if requested
    if (runMigrationsOnInit && typeof runMigrations === 'function') {
      try {
        onLog && onLog('Running database migrations...');
        await runMigrations({ db, execute, batch, transaction, onLog });
        onLog && onLog('Migrations complete.');
        logger.success('Database', 'runMigrations');
      } catch (err) {
        logger.error('Database', 'runMigrations', err);
        throw new DatabaseError(
          'Migration execution failed',
          'MIGRATION_FAILED',
          err,
          { originalCode: err?.code }
        );
      }
    }

    _initialized = true;
    logger.success('Database', 'initDatabase', { dbName: name });
    return db;
  };

  _initInflight = startInit().finally(() => {
    _initInflight = null;
  });
  return _initInflight;
}

/**
 * Whether the database has been successfully initialized.
 * @returns {boolean}
 */
export function isInitialized() {
  return _initialized && !!_db;
}

// Unified API surface (module placeholders until implemented)
/**
 * Create a placeholder proxy for not-yet-implemented database modules.
 * @private
 */
const notImplemented = moduleName =>
  new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === Symbol.toStringTag) return `${moduleName}DB`;
        // Named stub for better stack traces and devtools
        const fn = function notImplementedStub() {
          throw new DatabaseError(
            `${moduleName}.${String(prop)} not implemented`,
            'MODULE_NOT_IMPLEMENTED'
          );
        };
        return fn;
      },
    }
  );

export const contactsDB = createContactsDB({ execute, batch, transaction });
export const contactsInfoDB = createContactsInfoDB({
  execute,
  batch,
  transaction,
});
export const categoriesDB = createCategoriesDB({ execute, batch, transaction });
export const categoriesRelationsDB = createCategoriesRelationsDB({
  execute,
  batch,
  transaction,
});
export const companiesDB = createCompaniesDB({ execute, batch, transaction });
export const eventsDB = createEventsDB({ execute, batch, transaction });
export const eventsRecurringDB = createEventsRecurringDB({
  execute,
  batch,
  transaction,
});
export const eventsRemindersDB = createEventsRemindersDB({
  execute,
  batch,
  transaction,
});
export const interactionsDB = createInteractionsDB({
  execute,
  batch,
  transaction,
});
export const interactionsStatsDB = createInteractionsStatsDB({ execute });
export const interactionsSearchDB = createInteractionsSearchDB({ execute });
export const notesDB = createNotesDB({ execute, batch, transaction });
export const attachmentsDB = createAttachmentsDB({
  execute,
  batch,
  transaction,
});
export const settingsDB = createSettingsDB({ execute, batch, transaction });

/**
 * Unified database API surface available to the rest of the app.
 */
const database = {
  // lifecycle
  init: initDatabase,
  isInitialized,
  getDB,

  // low-level helpers
  execute,
  batch,
  transaction,

  // modules
  contacts: contactsDB,
  contactsInfo: contactsInfoDB,
  categories: categoriesDB,
  categoriesRelations: categoriesRelationsDB,
  companies: companiesDB,
  events: eventsDB,
  eventsRecurring: eventsRecurringDB,
  eventsReminders: eventsRemindersDB,
  interactions: interactionsDB,
  interactionsStats: interactionsStatsDB,
  interactionsSearch: interactionsSearchDB,
  notes: notesDB,
  attachments: attachmentsDB,
  settings: settingsDB,
};

export default database;
