// Minimal migration runner stub
// Extend this to load and apply versioned migrations in order.
/**
 * Minimal migration runner.
 *
 * Ensures the `migrations` meta table exists. Intended to be extended to
 * discover and execute versioned migration modules in order, recording each
 * applied version.
 */

// Avoid importing from ../index to prevent circular dependencies at init time.

/**
 * Run pending database migrations.
 * Currently a no-op beyond ensuring the meta table exists.
 *
 * @param {Object} ctx
 * @param {any} ctx.db Raw SQLite DB instance.
 * @param {(sql: string, params?: any[]) => Promise<any>} ctx.execute Execute a single statement.
 * @param {(stmts: Array<{sql: string, params?: any[]}>) => Promise<any[]>} ctx.batch Execute statements in one transaction.
 * @param {(work: Function) => Promise<any>} ctx.transaction WebSQL transaction helper.
 * @param {(msg: string) => void} [ctx.onLog] Optional logger.
 * @returns {Promise<void>} Resolves when migrations have been processed.
 * @throws {Error} When metadata table creation fails.
 */
export async function runMigrations({ db, execute, batch, transaction, onLog }) {
  // Placeholder: ensure a basic migrations table exists for future versions
  try {
    await execute(
      `CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        PRIMARY KEY (version),
        CONSTRAINT uq_migrations UNIQUE (version, name)
      );`
    );
  } catch (err) {
    const e = new Error('Failed to ensure migrations table');
    e.code = 'MIGRATION_META_FAILED';
    e.originalError = err;
    throw e;
  }

  // No-op for now; concrete migrations will be implemented later
  onLog && onLog('[migrations] No migrations to run (migrations table ensured).');
}

export default { runMigrations };
