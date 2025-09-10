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
import { DatabaseError } from './errors';

// Re-export for consumers that import from this module
export { DatabaseError } from './errors';

let _db = null;
let _initialized = false;

const DEFAULT_DB_NAME = 'crm_orbit.db';

/**
 * Normalize the Expo SQLite/WebSQL result shape to a simple object.
 * @private
 * @param {any} result WebSQL/SQLite result set
 * @returns {{rows: any[], rowsAffected: number, insertId: (number|null)}}
 */
function normalizeResult(result) {
  const rowsArray = result?.rows?._array
    ? result.rows._array
    : (() => {
        const out = [];
        if (result && result.rows && typeof result.rows.length === 'number') {
          for (let i = 0; i < result.rows.length; i += 1) {
            out.push(result.rows.item(i));
          }
        }
        return out;
      })();
  return {
    rows: rowsArray || [],
    rowsAffected: result?.rowsAffected ?? 0,
    insertId: result?.insertId ?? null,
  };
}

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
 * Open (or reuse) the SQLite database.
 * @private
 * @param {string} [dbName]
 * @returns {any} SQLite database instance
 * @throws {DatabaseError} When opening fails
 */
function openDatabase(dbName = DEFAULT_DB_NAME) {
  try {
    // expo-sqlite returns a Database object compatible with `transaction`
    _db = SQLite.openDatabase(dbName);
    return _db;
  } catch (err) {
    throw new DatabaseError('Failed to open database', 'OPEN_FAILED', err, { dbName });
  }
}

/**
 * Execute a single SQL statement inside a short-lived transaction.
 * @param {string} sql SQL string with `?` placeholders.
 * @param {any[]} [params=[]] Values for placeholders.
 * @returns {Promise<{rows:any[], rowsAffected:number, insertId:number|null}>}
 * @throws {DatabaseError}
 */
export async function execute(sql, params = []) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    try {
      db.transaction(
        (tx) => {
          tx.executeSql(
            sql,
            params,
            (_tx, result) => resolve(normalizeResult(result)),
            (_tx, error) => {
              reject(new DatabaseError('SQL execution failed', 'SQL_ERROR', error, { sql, params }));
              // Do not return true; allow the transaction to abort.
            }
          );
        },
        (txError) => reject(new DatabaseError('Transaction failed', 'TX_ERROR', txError)),
      );
    } catch (err) {
      reject(new DatabaseError('Unexpected DB error', 'UNEXPECTED_DB_ERROR', err, { sql, params }));
    }
  });
}

/**
 * Execute multiple SQL statements inside a single transaction.
 * If any step fails, the transaction aborts and changes roll back.
 * @param {{sql: string, params?: any[]}[]} statements Ordered list of statements.
 * @returns {Promise<Array<{rows:any[], rowsAffected:number, insertId:number|null}>>}
 * @throws {DatabaseError}
 */
export async function batch(statements) {
  // statements: Array<{ sql: string, params?: any[] }>
  const db = getDB();
  return new Promise((resolve, reject) => {
    if (!Array.isArray(statements) || statements.length === 0) {
      resolve([]);
      return;
    }
    const results = new Array(statements.length);
    let stepError = null;
    try {
      db.transaction(
        (tx) => {
          statements.forEach(({ sql, params = [] }, index) => {
            tx.executeSql(
              sql,
              params,
              (_tx, result) => {
                results[index] = normalizeResult(result);
              },
              (_tx, error) => {
                stepError = new DatabaseError('SQL batch step failed', 'SQL_ERROR', error, {
                  index,
                  sql,
                  params,
                });
                // Do not return true; abort and rollback the transaction.
              }
            );
          });
        },
        (txError) => reject(stepError || new DatabaseError('Batch transaction failed', 'TX_ERROR', txError)),
        () => resolve(results)
      );
    } catch (err) {
      reject(new DatabaseError('Unexpected DB error (batch)', 'UNEXPECTED_DB_ERROR', err));
    }
  });
}

/**
 * Run a WebSQL transaction and provide a Promise-based `tx.execute` helper.
 *
 * Important: WebSQL requires that all `tx.executeSql` calls are scheduled
 * synchronously inside the transaction callback. Callers must schedule all
 * `wrappedTx.execute(...)` calls synchronously (avoid `await` between them),
 * or calls may be scheduled outside the transaction. Consider migrating to an
 * async transaction API in a future PR for true async/await semantics.
 *
 * @template T
 * @param {(tx: { execute: (sql: string, params?: any[]) => Promise<any> }) => (T|Promise<T>)} work
 * @returns {Promise<T>}
 * @throws {DatabaseError}
 */
export async function transaction(work) {
  // work: async (tx) => { await tx.execute(sql, params) ... }
  const db = getDB();
  return new Promise((resolve, reject) => {
    try {
      let workResult;
      let workError;
      db.transaction(
        (tx) => {
          const wrappedTx = {
            execute: (sql, params = []) =>
              new Promise((res, rej) => {
                try {
                  tx.executeSql(
                    sql,
                    params,
                    (_t, result) => res(normalizeResult(result)),
                    (_t, error) => {
                      rej(new DatabaseError('SQL execution failed', 'SQL_ERROR', error, { sql, params }));
                      // Do not return true; allow the transaction to abort.
                    }
                  );
                } catch (e) {
                  rej(new DatabaseError('Unexpected SQL exception', 'SQL_EXEC_EXCEPTION', e, { sql, params }));
                }
              }),
          };

          // Important: Call work synchronously so all tx.executeSql calls are
          // scheduled inside this callback. Callers must schedule all
          // wrappedTx.execute calls synchronously (no await between them)
          // because WebSQL requires synchronous scheduling. Consider migrating
          // to an async transaction API in a future PR for true async/await semantics.
          try {
            const maybePromise = work(wrappedTx);
            if (maybePromise && typeof maybePromise.then === 'function') {
              // Do not await here; attach handlers to capture result/error.
              maybePromise
                .then((val) => {
                  workResult = val;
                })
                .catch((err) => {
                  workError = err;
                });
            } else {
              workResult = maybePromise;
            }
          } catch (err) {
            workError = err;
          }
        },
        (txError) => reject(new DatabaseError('Transaction failed', 'TX_ERROR', txError)),
        () => {
          // Resolve with user work result if set, else undefined
          // If user code errored without causing SQL error, propagate that error
          // to signal the caller but note that SQL may have committed.
          // This is a limitation of WebSQL-style transactions.
          if (workError) {
            reject(workError);
          } else {
            resolve(workResult);
          }
        }
      );
    } catch (err) {
      reject(new DatabaseError('Unexpected DB error (transaction)', 'UNEXPECTED_DB_ERROR', err));
    }
  });
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

  if (_initialized) return _db;

  const db = openDatabase(name);

  // Basic PRAGMA setup
  try {
    if (enableWAL) {
      // journal_mode may not be supported on some platforms; ignore failure
      try { await execute('PRAGMA journal_mode = WAL;'); } catch (_) {}
    }
    if (enableForeignKeys) {
      await execute('PRAGMA foreign_keys = ON;');
    }
  } catch (err) {
    throw new DatabaseError('Failed to configure database PRAGMAs', 'PRAGMA_FAILED', err);
  }

  // Run migrations if requested
  if (runMigrationsOnInit && typeof runMigrations === 'function') {
    try {
      onLog && onLog('Running database migrations...');
      await runMigrations({ db, execute, batch, transaction, onLog });
      onLog && onLog('Migrations complete.');
    } catch (err) {
      throw new DatabaseError('Migration execution failed', 'MIGRATION_FAILED', err);
    }
  }

  _initialized = true;
  return db;
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
const notImplemented = (moduleName) =>
  new Proxy(
    {},
    {
      get: () => () => {
        throw new DatabaseError(`${moduleName} module not implemented`, 'MODULE_NOT_IMPLEMENTED');
      },
    }
  );

export const contactsDB = notImplemented('contacts');
export const categoriesDB = notImplemented('categories');
export const companiesDB = notImplemented('companies');
export const eventsDB = notImplemented('events');
export const interactionsDB = notImplemented('interactions');
export const notesDB = notImplemented('notes');
export const attachmentsDB = notImplemented('attachments');
export const settingsDB = notImplemented('settings');

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
  categories: categoriesDB,
  companies: companiesDB,
  events: eventsDB,
  interactions: interactionsDB,
  notes: notesDB,
  attachments: attachmentsDB,
  settings: settingsDB,
};

export default database;
