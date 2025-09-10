// Minimal migration runner stub
// Extend this to load and apply versioned migrations in order.

// Avoid importing from ../index to prevent circular dependencies at init time.

export async function runMigrations({ db, execute, batch, transaction, onLog }) {
  // Placeholder: ensure a basic migrations table exists for future versions
  try {
    await execute(
      `CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );
  } catch (err) {
    const e = new Error('Failed to ensure migrations table');
    e.code = 'MIGRATION_META_FAILED';
    e.originalError = err;
    throw e;
  }

  // No-op for now; concrete migrations will be implemented later
  onLog && onLog('No migrations to run.');
}

export default { runMigrations };
