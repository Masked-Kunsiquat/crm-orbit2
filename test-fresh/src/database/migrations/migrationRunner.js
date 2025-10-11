// Migration runner
// Discovers versioned migration modules and applies pending ones in order.

import { DatabaseError } from '../errors.js';
import MIGRATIONS from './registry.js';

async function ensureMeta({ execute }) {
  try {
    await execute(
      `CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        PRIMARY KEY (version)
      );`
    );
  } catch (err) {
    throw new DatabaseError(
      'Failed to ensure migrations table',
      'MIGRATION_META_FAILED',
      err
    );
  }
}

async function getAppliedVersions({ execute }) {
  try {
    const res = await execute(
      'SELECT version FROM migrations ORDER BY version ASC;'
    );
    const rows =
      (res && Array.isArray(res) && res) ||
      res?.rows?._array ||
      (Array.isArray(res?.rows) ? res.rows : []);
    return rows.map(r => r.version);
  } catch (err) {
    throw new DatabaseError(
      'Failed to read applied migrations',
      'MIGRATION_QUERY_FAILED',
      err
    );
  }
}

function validateMigrations(list) {
  if (!Array.isArray(list)) {
    throw new DatabaseError(
      'Invalid migration registry',
      'MIGRATION_REGISTRY_INVALID'
    );
  }
  const seen = new Set();
  list.forEach(m => {
    if (
      !m ||
      typeof m.version !== 'number' ||
      typeof m.up !== 'function' ||
      typeof m.down !== 'function'
    ) {
      throw new DatabaseError(
        'Invalid migration entry',
        'MIGRATION_ENTRY_INVALID'
      );
    }
    if (seen.has(m.version)) {
      throw new DatabaseError(
        `Duplicate migration version: ${m.version}`,
        'MIGRATION_DUPLICATE'
      );
    }
    seen.add(m.version);
  });
}

async function recordApplied({ execute }, migration) {
  try {
    await execute('INSERT INTO migrations (version, name) VALUES (?, ?);', [
      migration.version,
      migration.name || `migration_${migration.version}`,
    ]);
  } catch (err) {
    throw new DatabaseError(
      'Failed to record applied migration',
      'MIGRATION_RECORD_FAILED',
      err,
      {
        version: migration.version,
        name: migration.name,
      }
    );
  }
}

/**
 * Run pending database migrations in ascending version order.
 *
 * @param {Object} ctx
 * @param {any} ctx.db Raw SQLite DB instance.
 * @param {(sql: string, params?: any[]) => Promise<any>} ctx.execute Execute a single statement.
 * @param {(stmts: Array<{sql: string, params?: any[]}>) => Promise<any[]>} ctx.batch Execute statements in one transaction.
 * @param {(work: Function) => Promise<any>} ctx.transaction WebSQL transaction helper.
 * @param {(msg: string) => void} [ctx.onLog] Optional logger.
 * @returns {Promise<void>}
 */
export async function runMigrations(ctx) {
  const { execute, batch, transaction, onLog } = ctx;
  if (typeof execute !== 'function') {
    throw new DatabaseError(
      'execute helper is required',
      'MIGRATION_HELPER_MISSING'
    );
  }

  // 1) Ensure meta table
  await ensureMeta(ctx);

  // 2) Validate registry and compute pending
  validateMigrations(MIGRATIONS);

  let applied = await getAppliedVersions(ctx);
  const appliedSet = new Set(applied);

  // Registry is already sorted; filter pending only
  const toRun = MIGRATIONS.filter(m => !appliedSet.has(m.version));

  // Centralized logger
  const log = onLog || (() => {});

  if (!toRun.length) {
    log('[migrations] No pending migrations.');
    return;
  }

  log(`[migrations] Pending: ${toRun.map(m => m.version).join(', ')}`);

  // 3) Apply each migration sequentially
  for (const migration of toRun) {
    const name = migration.name || `migration_${migration.version}`;
    log(`[migrations] Applying v${migration.version} (${name})...`);
    try {
      if (typeof transaction === 'function') {
        // Wrap migration + recording in one atomic transaction
        await transaction(async tx => {
          // tx-aware batch that schedules all statements synchronously
          const txBatch = async stmts => {
            const items = Array.isArray(stmts) ? stmts : [];
            const promises = [];
            for (const entry of items) {
              let sql, params;
              if (Array.isArray(entry)) {
                sql = entry[0];
                params = entry[1];
              } else if (entry && typeof entry === 'object' && 'sql' in entry) {
                sql = entry.sql;
                params = entry.params;
              } else {
                sql = entry;
                params = undefined;
              }
              // Schedule inside this transaction; do not await here
              promises.push(tx.execute(sql, params));
            }
            // Adopt results after commit via outer transaction wrapper
            return Promise.all(promises);
          };

          // Run migration using transactional context
          await migration.up({
            execute: tx.execute,
            batch: txBatch,
            transaction,
          });

          // Record as applied within the same transaction
          // Use direct SQL execution instead of recordApplied function to avoid context issues
          try {
            await tx.execute(
              'INSERT INTO migrations (version, name) VALUES (?, ?);',
              [
                migration.version,
                migration.name || `migration_${migration.version}`,
              ]
            );
          } catch (recordError) {
            // Handle UNIQUE constraint violations gracefully - migration may have been recorded previously
            if (
              recordError?.message?.includes('UNIQUE constraint failed') ||
              recordError?.code === 'ERR_INTERNAL_SQLITE_ERROR'
            ) {
              console.warn(
                `Migration v${migration.version} appears to already be recorded, but was detected as pending. This may indicate a previous incomplete migration run.`
              );
              // Log but don't throw - the migration itself was successfully applied above
            } else {
              // For other errors, add debug logging and re-throw
              console.error('Failed to record migration as applied:', {
                version: migration.version,
                name: migration.name,
                error: recordError.message,
                code: recordError.code,
                sql: 'INSERT INTO migrations (version, name) VALUES (?, ?)',
                params: [
                  migration.version,
                  migration.name || `migration_${migration.version}`,
                ],
              });
              throw new DatabaseError(
                'Failed to record applied migration',
                'MIGRATION_RECORD_FAILED',
                recordError,
                {
                  version: migration.version,
                  name: migration.name,
                }
              );
            }
          }
        });
      } else {
        // No transaction helper; use non-atomic fallback
        await migration.up({ execute, batch, transaction });
        await recordApplied(ctx, migration);
      }
      log(`[migrations] Applied v${migration.version} (${name}).`);
    } catch (err) {
      throw new DatabaseError(
        `Migration v${migration.version} (${name}) failed`,
        'MIGRATION_FAILED',
        err,
        { version: migration.version, name }
      );
    }
  }
}

export default { runMigrations };
