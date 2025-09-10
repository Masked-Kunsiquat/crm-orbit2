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

  // Normalize entries to a consistent shape
  function normalizeStatements(list) {
    return (Array.isArray(list) ? list : []).map((entry) => {
      if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
      if (entry && typeof entry === 'object' && 'sql' in entry) return { sql: entry.sql, params: entry.params };
      return { sql: entry, params: undefined };
    });
  }

  if (hasBatch) {
    const statements = normalizeStatements(items);
    await exec.batch(statements);
    return;
  }

  // Fallback to sequential execute
  for (const { sql, params } of normalizeStatements(items)) {
    await exec.execute(sql, params);
  }
}

/**
 * Execute all statements strictly in order, bypassing batch behavior.
 * Useful when order matters or when avoiding parallel scheduling in transactions.
 * @param {{execute?: Function}} exec
 * @param {Array<string | [string, any[]] | {sql: string, params?: any[]}>} items
 */
export async function runAllSequential(exec, items) {
  if (!exec || typeof exec.execute !== 'function') {
    throw new Error('runAllSequential: exec.execute is not available');
  }
  // Reuse the same normalization as runAll
  const normalizeStatements = (list) =>
    (Array.isArray(list) ? list : []).map((entry) => {
      if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
      if (entry && typeof entry === 'object' && 'sql' in entry) return { sql: entry.sql, params: entry.params };
      return { sql: entry, params: undefined };
    });
  for (const { sql, params } of normalizeStatements(items)) {
    await exec.execute(sql, params);
  }
}
