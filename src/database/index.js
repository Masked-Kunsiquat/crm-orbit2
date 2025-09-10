// Database Orchestrator
// - Initializes expo-sqlite connection
// - Manages DB lifecycle and helpers
// - Prepares and triggers migrations
// - Exports unified API surface for DB modules

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations/migrationRunner';

// Custom error for database operations
export class DatabaseError extends Error {
  constructor(message, code = 'DB_ERROR', originalError = null, context = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
    this.context = context || undefined;
  }
}

let _db = null;
let _initialized = false;

const DEFAULT_DB_NAME = 'crm_orbit.db';

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

function getDB() {
  if (!_db) {
    throw new DatabaseError(
      'Database has not been initialized. Call initDatabase() first.',
      'DB_NOT_INITIALIZED'
    );
  }
  return _db;
}

function openDatabase(dbName = DEFAULT_DB_NAME) {
  try {
    // expo-sqlite returns a Database object compatible with `transaction`
    _db = SQLite.openDatabase(dbName);
    return _db;
  } catch (err) {
    throw new DatabaseError('Failed to open database', 'OPEN_FAILED', err, { dbName });
  }
}

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
              return true; // signal error handled
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

export async function batch(statements) {
  // statements: Array<{ sql: string, params?: any[] }>
  const db = getDB();
  return new Promise((resolve, reject) => {
    const results = new Array(statements.length);
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
                reject(
                  new DatabaseError('SQL batch step failed', 'SQL_ERROR', error, {
                    index,
                    sql,
                    params,
                  })
                );
                return true;
              }
            );
          });
        },
        (txError) => reject(new DatabaseError('Batch transaction failed', 'TX_ERROR', txError)),
        () => resolve(results)
      );
    } catch (err) {
      reject(new DatabaseError('Unexpected DB error (batch)', 'UNEXPECTED_DB_ERROR', err));
    }
  });
}

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
                      return true;
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

export function isInitialized() {
  return _initialized && !!_db;
}

// Unified API surface (module placeholders until implemented)
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
