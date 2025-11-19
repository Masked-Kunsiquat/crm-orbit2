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
    return (Array.isArray(list) ? list : []).map(entry => {
      if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
      if (entry && typeof entry === 'object' && 'sql' in entry)
        return { sql: entry.sql, params: entry.params };
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
  const normalizeStatements = list =>
    (Array.isArray(list) ? list : []).map(entry => {
      if (Array.isArray(entry)) return { sql: entry[0], params: entry[1] };
      if (entry && typeof entry === 'object' && 'sql' in entry)
        return { sql: entry.sql, params: entry.params };
      return { sql: entry, params: undefined };
    });
  for (const { sql, params } of normalizeStatements(items)) {
    await exec.execute(sql, params);
  }
}

/**
 * Recreate a table with schema changes using SQLite's 12-step procedure.
 *
 * This implements the official SQLite method for making arbitrary table schema changes
 * that cannot be done with simple ALTER TABLE commands (e.g., dropping columns, changing
 * column types, adding constraints, reordering columns).
 *
 * **12-Step Procedure** (from SQLite documentation):
 * 1. Disable foreign keys (if enabled)
 * 2. Start transaction
 * 3. Remember indexes, triggers, and views associated with table
 * 4. Create new table with desired schema
 * 5. Transfer data from old table to new table
 * 6. Drop old table
 * 7. Rename new table to old table's name
 * 8. Recreate indexes, triggers, and views
 * 9. Update views that reference the table
 * 10. Verify foreign key constraints (if enabled)
 * 11. Commit transaction
 * 12. Re-enable foreign keys (if originally enabled)
 *
 * @param {Object} ctx - Migration context with execute/batch functions
 * @param {Object} options - Table recreation options
 * @param {string} options.tableName - Name of the table to recreate
 * @param {string} options.newTableSQL - CREATE TABLE statement for new schema
 * @param {string} [options.dataMigrationSQL] - Custom INSERT statement to transfer data.
 *   If not provided, defaults to: INSERT INTO new_X SELECT * FROM X
 * @param {Array<string>} [options.recreateIndexes] - CREATE INDEX statements to recreate
 * @param {Array<string>} [options.recreateTriggers] - CREATE TRIGGER statements to recreate
 * @param {Array<string>} [options.recreateViews] - CREATE VIEW statements to recreate
 * @param {boolean} [options.skipForeignKeyCheck] - Skip foreign key verification (step 10)
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Change column type from TEXT to INTEGER
 * await recreateTable(ctx, {
 *   tableName: 'contacts',
 *   newTableSQL: `
 *     CREATE TABLE contacts_new (
 *       id INTEGER PRIMARY KEY,
 *       name TEXT NOT NULL,
 *       age INTEGER  -- Changed from TEXT to INTEGER
 *     )
 *   `,
 *   dataMigrationSQL: `
 *     INSERT INTO contacts_new (id, name, age)
 *     SELECT id, name, CAST(age AS INTEGER) FROM contacts
 *   `,
 *   recreateIndexes: [
 *     'CREATE INDEX idx_contacts_name ON contacts(name)'
 *   ]
 * });
 *
 * @example
 * // Drop a column
 * await recreateTable(ctx, {
 *   tableName: 'users',
 *   newTableSQL: `
 *     CREATE TABLE users_new (
 *       id INTEGER PRIMARY KEY,
 *       email TEXT NOT NULL
 *       -- removed 'legacy_field' column
 *     )
 *   `,
 *   dataMigrationSQL: `
 *     INSERT INTO users_new (id, email)
 *     SELECT id, email FROM users
 *   `
 * });
 */
export async function recreateTable(ctx, options) {
  const { execute } = ctx;
  if (!execute || typeof execute !== 'function') {
    throw new Error('recreateTable requires ctx.execute function');
  }

  const {
    tableName,
    newTableSQL,
    dataMigrationSQL,
    recreateIndexes = [],
    recreateTriggers = [],
    recreateViews = [],
    skipForeignKeyCheck = false,
  } = options;

  // Validation
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('recreateTable: tableName is required');
  }
  if (!newTableSQL || typeof newTableSQL !== 'string') {
    throw new Error('recreateTable: newTableSQL is required');
  }

  const tempTableName = `${tableName}_new`;

  console.log(`[recreateTable] Starting 12-step procedure for table: ${tableName}`);

  // STEP 1: Check and disable foreign keys if enabled
  console.log('[recreateTable] Step 1: Checking foreign key constraints...');
  const fkResult = await execute('PRAGMA foreign_keys;');
  const foreignKeysEnabled = fkResult.rows?.[0]?.foreign_keys === 1;

  if (foreignKeysEnabled) {
    console.log('[recreateTable] Foreign keys enabled, disabling temporarily...');
    await execute('PRAGMA foreign_keys=OFF;');
  }

  // STEP 2: Start transaction (handled by migration runner, but we log it)
  console.log('[recreateTable] Step 2: Transaction should be active (handled by migration runner)');

  // STEP 3: Remember associated indexes, triggers, and views
  console.log('[recreateTable] Step 3: Querying associated schema objects...');
  const schemaResult = await execute(
    `SELECT type, sql FROM sqlite_schema WHERE tbl_name = ? AND type IN ('index', 'trigger', 'view') ORDER BY type;`,
    [tableName]
  );
  const associatedObjects = schemaResult.rows || [];
  console.log(`[recreateTable] Found ${associatedObjects.length} associated objects (indexes, triggers, views)`);

  // STEP 4: Create new table with desired schema
  console.log('[recreateTable] Step 4: Creating new table with revised schema...');
  // Replace table name in SQL with temp name
  const tempTableSQL = newTableSQL.replace(
    new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\b`, 'i'),
    `CREATE TABLE ${tempTableName}`
  );
  await execute(tempTableSQL);
  console.log(`[recreateTable] Created temporary table: ${tempTableName}`);

  // STEP 5: Transfer data from old table to new table
  console.log('[recreateTable] Step 5: Transferring data...');
  const transferSQL = dataMigrationSQL || `INSERT INTO ${tempTableName} SELECT * FROM ${tableName};`;
  await execute(transferSQL);
  console.log('[recreateTable] Data transfer complete');

  // STEP 6: Drop old table
  console.log('[recreateTable] Step 6: Dropping old table...');
  await execute(`DROP TABLE ${tableName};`);
  console.log(`[recreateTable] Dropped table: ${tableName}`);

  // STEP 7: Rename new table to old name
  console.log('[recreateTable] Step 7: Renaming new table to original name...');
  await execute(`ALTER TABLE ${tempTableName} RENAME TO ${tableName};`);
  console.log(`[recreateTable] Renamed ${tempTableName} to ${tableName}`);

  // STEP 8: Recreate indexes, triggers, and views
  console.log('[recreateTable] Step 8: Recreating associated objects...');

  // Recreate indexes
  if (recreateIndexes.length > 0) {
    console.log(`[recreateTable] Recreating ${recreateIndexes.length} indexes...`);
    for (const indexSQL of recreateIndexes) {
      await execute(indexSQL);
    }
  }

  // Recreate triggers
  if (recreateTriggers.length > 0) {
    console.log(`[recreateTable] Recreating ${recreateTriggers.length} triggers...`);
    for (const triggerSQL of recreateTriggers) {
      await execute(triggerSQL);
    }
  }

  // STEP 9: Recreate views (if any were provided)
  if (recreateViews.length > 0) {
    console.log('[recreateTable] Step 9: Recreating views...');
    for (const viewSQL of recreateViews) {
      await execute(viewSQL);
    }
  }

  // STEP 10: Verify foreign key constraints (if originally enabled)
  if (foreignKeysEnabled && !skipForeignKeyCheck) {
    console.log('[recreateTable] Step 10: Verifying foreign key constraints...');
    const fkCheckResult = await execute('PRAGMA foreign_key_check;');
    const violations = fkCheckResult.rows || [];

    if (violations.length > 0) {
      console.error('[recreateTable] Foreign key constraint violations detected:', violations);
      throw new Error(
        `Foreign key constraint violations detected after table recreation. ` +
        `Table: ${violations[0]?.table}, Violations: ${violations.length}`
      );
    }
    console.log('[recreateTable] Foreign key check passed');
  }

  // STEP 11: Commit transaction (handled by migration runner)
  console.log('[recreateTable] Step 11: Transaction commit (handled by migration runner)');

  // STEP 12: Re-enable foreign keys if they were originally enabled
  if (foreignKeysEnabled) {
    console.log('[recreateTable] Step 12: Re-enabling foreign keys...');
    await execute('PRAGMA foreign_keys=ON;');
  }

  console.log(`[recreateTable] ✅ Successfully recreated table: ${tableName}`);
}

/**
 * Helper to extract CREATE statements from sqlite_schema for a given table.
 * Useful for step 3 of the 12-step procedure when you need to preserve existing
 * indexes, triggers, and views.
 *
 * @param {Object} ctx - Migration context
 * @param {string} tableName - Table name to query
 * @param {string} [type] - Optional type filter ('index', 'trigger', 'view')
 * @returns {Promise<Array<{type: string, name: string, sql: string}>>}
 *
 * @example
 * const indexes = await getTableSchema(ctx, 'contacts', 'index');
 * const recreateIndexes = indexes.map(idx => idx.sql);
 */
export async function getTableSchema(ctx, tableName, type = null) {
  const { execute } = ctx;
  if (!execute || typeof execute !== 'function') {
    throw new Error('getTableSchema requires ctx.execute function');
  }

  let sql = `SELECT type, name, sql FROM sqlite_schema WHERE tbl_name = ?`;
  const params = [tableName];

  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY type, name;`;

  const result = await execute(sql, params);
  return (result.rows || []).filter(row => row.sql); // Filter out auto-indexes (they have null SQL)
}
