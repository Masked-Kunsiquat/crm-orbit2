// Shared helpers for migration files

/**
 * Normalize execution helpers from various contexts.
 * Supports either a context with { batch, execute } or a plain object exposing those.
 * @param {any} dbOrCtx
 */
export function getExec(dbOrCtx) {
  const hasBatch = dbOrCtx && typeof dbOrCtx.batch === 'function';
  const hasExecute = dbOrCtx && typeof dbOrCtx.execute === 'function';
  if (hasBatch || hasExecute) {
    return {
      batch: hasBatch ? dbOrCtx.batch.bind(dbOrCtx) : null,
      execute: hasExecute ? dbOrCtx.execute.bind(dbOrCtx) : null,
    };
  }
  // Fallback no-op; caller must provide helpers via migration runner
  return { batch: null, execute: null };
}

/**
 * Execute a list of statements using batch when available; otherwise sequential execute.
 * Each item may be one of:
 * - string: raw SQL
 * - [sql, params]: tuple
 * - { sql, params? }: object
 * @param {{batch?: Function, execute?: Function}} exec
 * @param {Array<string | [string, any[]] | {sql: string, params?: any[]}>} items
 */
export async function runAll(exec, items) {
  const hasBatch = !!exec.batch;
  const hasExecute = !!exec.execute;

  if (!hasBatch && !hasExecute) {
    throw new Error('No execute/batch helpers available for migration.');
  }

  if (hasBatch) {
    const statements = items.map((entry) => {
      if (entry && typeof entry === 'object') {
        // { sql, params } or already normalized object
        if (Array.isArray(entry)) {
          return { sql: entry[0], params: entry[1] };
        }
        if ('sql' in entry) return entry;
      }
      // string
      return { sql: entry };
    });
    await exec.batch(statements);
    return;
  }

  // Fallback to sequential execute
  for (const entry of items) {
    if (Array.isArray(entry)) {
      await exec.execute(entry[0], entry[1]);
    } else if (entry && typeof entry === 'object' && 'sql' in entry) {
      await exec.execute(entry.sql, entry.params);
    } else {
      await exec.execute(entry);
    }
  }
}

/**
 * Execute all statements strictly in order, bypassing batch behavior.
 * Useful when order matters or when avoiding parallel scheduling in transactions.
 * @param {{execute?: Function}} exec
 * @param {Array<string | [string, any[]] | {sql: string, params?: any[]}>} items
 */
export async function runAllSequential(exec, items) {
  for (const entry of items) {
    if (Array.isArray(entry)) {
      await exec.execute(entry[0], entry[1]);
    } else if (entry && typeof entry === 'object' && 'sql' in entry) {
      await exec.execute(entry.sql, entry.params);
    } else {
      await exec.execute(entry);
    }
  }
}

