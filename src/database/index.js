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

import * as ExpoSQLite from 'expo-sqlite';
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
import { DatabaseError } from './errors';
// Support both module shapes: named export and default export
const expoOpenDatabase =
  (ExpoSQLite &&
    typeof ExpoSQLite.openDatabase === 'function' &&
    ExpoSQLite.openDatabase) ||
  (ExpoSQLite &&
    ExpoSQLite.default &&
    typeof ExpoSQLite.default.openDatabase === 'function' &&
    ExpoSQLite.default.openDatabase);

// Re-export for consumers that import from this module
export { DatabaseError } from './errors';

let _db = null;
let _initialized = false;
let _initInflight = null;

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
    _db = expoOpenDatabase(dbName);
    return _db;
  } catch (err) {
    throw new DatabaseError('Failed to open database', 'OPEN_FAILED', err, {
      dbName,
    });
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
        tx => {
          tx.executeSql(
            sql,
            params,
            (_tx, result) => resolve(normalizeResult(result)),
            (_tx, error) => {
              reject(
                new DatabaseError('SQL execution failed', 'SQL_ERROR', error, {
                  sql,
                  params,
                })
              );
              // Do not return true; allow the transaction to abort.
            }
          );
        },
        txError =>
          reject(new DatabaseError('Transaction failed', 'TX_ERROR', txError))
      );
    } catch (err) {
      reject(
        new DatabaseError('Unexpected DB error', 'UNEXPECTED_DB_ERROR', err, {
          sql,
          params,
        })
      );
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
        tx => {
          statements.forEach(({ sql, params = [] }, index) => {
            tx.executeSql(
              sql,
              params,
              (_tx, result) => {
                results[index] = normalizeResult(result);
              },
              (_tx, error) => {
                stepError = new DatabaseError(
                  'SQL batch step failed',
                  'SQL_ERROR',
                  error,
                  {
                    index,
                    sql,
                    params,
                  }
                );
                // Do not return true; abort and rollback the transaction.
              }
            );
          });
        },
        txError =>
          reject(
            stepError ||
              new DatabaseError('Batch transaction failed', 'TX_ERROR', txError)
          ),
        () => resolve(results)
      );
    } catch (err) {
      reject(
        new DatabaseError(
          'Unexpected DB error (batch)',
          'UNEXPECTED_DB_ERROR',
          err
        )
      );
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
      let workPromise = null;
      db.transaction(
        tx => {
          const wrappedTx = {
            execute: (sql, params = []) =>
              new Promise((res, rej) => {
                try {
                  tx.executeSql(
                    sql,
                    params,
                    (_t, result) => res(normalizeResult(result)),
                    (_t, error) => {
                      rej(
                        new DatabaseError(
                          'SQL execution failed',
                          'SQL_ERROR',
                          error,
                          { sql, params }
                        )
                      );
                      // Do not return true; allow the transaction to abort.
                    }
                  );
                } catch (e) {
                  rej(
                    new DatabaseError(
                      'Unexpected SQL exception',
                      'SQL_EXEC_EXCEPTION',
                      e,
                      { sql, params }
                    )
                  );
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
              // Capture for adoption after commit/rollback; do not await here.
              workPromise = maybePromise;
            } else {
              workResult = maybePromise;
            }
          } catch (err) {
            workError = err;
          }
        },
        txError => {
          // Ensure the user's returned promise settles before we reject,
          // so callers see consistent behavior.
          if (workPromise && typeof workPromise.finally === 'function') {
            workPromise.finally(() => {
              reject(
                new DatabaseError('Transaction failed', 'TX_ERROR', txError)
              );
            });
          } else {
            reject(
              new DatabaseError('Transaction failed', 'TX_ERROR', txError)
            );
          }
        },
        () => {
          // Adopt the user's returned promise after commit to ensure we
          // resolve/reject only after the user work has settled.
          if (workError) {
            if (workPromise && typeof workPromise.finally === 'function') {
              workPromise.finally(() => reject(workError));
            } else {
              reject(workError);
            }
            return;
          }
          if (workPromise && typeof workPromise.then === 'function') {
            workPromise.then(resolve).catch(reject);
          } else {
            resolve(workResult);
          }
        }
      );
    } catch (err) {
      reject(
        new DatabaseError(
          'Unexpected DB error (transaction)',
          'UNEXPECTED_DB_ERROR',
          err
        )
      );
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

  if (_initialized && _db) return _db;
  if (_initInflight) return _initInflight;

  const startInit = async () => {
    const db = openDatabase(name);

    // Basic PRAGMA setup
    try {
      if (enableWAL) {
        // journal_mode may not be supported on some platforms; ignore failure
        try {
          await execute('PRAGMA journal_mode = WAL;');
        } catch (_) {}
      }
      if (enableForeignKeys) {
        await execute('PRAGMA foreign_keys = ON;');
        try {
          const check = await execute('PRAGMA foreign_keys;');
          const enabled = check.rows?.[0]?.foreign_keys === 1;
          if (!enabled)
            onLog && onLog('Warning: PRAGMA foreign_keys not enabled.');
        } catch {}
      }
    } catch (err) {
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
      } catch (err) {
        throw new DatabaseError(
          'Migration execution failed',
          'MIGRATION_FAILED',
          err,
          { originalCode: err?.code }
        );
      }
    }

    _initialized = true;
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
