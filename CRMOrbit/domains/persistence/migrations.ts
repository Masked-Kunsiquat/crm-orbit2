export type Migration = {
  version: number;
  name: string;
  sql: string;
  rollback?: string; // Optional SQL to rollback this migration
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "create_event_log",
    sql: `create table if not exists event_log (
      id text primary key,
      type text not null,
      entity_id text,
      payload text not null,
      timestamp text not null,
      device_id text not null
    );`,
    rollback: "drop table if exists event_log;",
  },
  {
    version: 2,
    name: "create_automerge_snapshots",
    sql: `create table if not exists automerge_snapshots (
      id text primary key,
      doc text not null,
      timestamp text not null
    );`,
    rollback: "drop table if exists automerge_snapshots;",
  },
];

export type MigrationDb = {
  execute: (sql: string, params?: unknown[]) => Promise<void>;
  getFirstRow: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
};

/**
 * Get the current schema version from the database.
 * Returns 0 if the schema_version table doesn't exist yet.
 * Throws for other errors (permissions, connection issues, etc.)
 */
const getSchemaVersion = async (db: MigrationDb): Promise<number> => {
  try {
    const result = await db.getFirstRow<{ version: number }>(
      "select version from schema_version limit 1",
    );
    return result?.version ?? 0;
  } catch (error) {
    // Only return 0 if the error is specifically about a missing table
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isMissingTableError =
      errorMessage.includes("no such table") || // SQLite
      errorMessage.includes("doesn't exist") || // MySQL
      errorMessage.includes("does not exist") || // PostgreSQL
      errorMessage.includes("42P01"); // PostgreSQL error code

    if (isMissingTableError) {
      // Table doesn't exist yet, return 0
      return 0;
    }

    // For any other error (permissions, connection, corruption), rethrow
    throw error;
  }
};

/**
 * Update the schema version in the database atomically.
 * Uses INSERT OR REPLACE to ensure atomicity and prevent SQL injection.
 */
const updateSchemaVersion = async (
  db: MigrationDb,
  version: number,
): Promise<void> => {
  // Use INSERT OR REPLACE with parameterized query for atomicity and security
  // The id=1 ensures we always update the same row
  await db.execute(
    "insert or replace into schema_version (id, version) values (?, ?)",
    [1, version],
  );
};

/**
 * Run all pending database migrations.
 * Tracks which migrations have been applied using a schema_version table.
 */
export const runMigrations = async (db: MigrationDb): Promise<void> => {
  // Create schema_version table if it doesn't exist
  // Include id as primary key to enable INSERT OR REPLACE for atomic updates
  await db.execute(
    "create table if not exists schema_version (id integer primary key, version integer not null)",
  );

  const currentVersion = await getSchemaVersion(db);

  // Run all migrations that haven't been applied yet
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await db.execute(migration.sql);
      await updateSchemaVersion(db, migration.version);
    }
  }
};

/**
 * Rollback database migrations to a specific version.
 * WARNING: This will execute rollback SQL which may result in data loss.
 * Only use this for development/testing purposes.
 *
 * @param db - The database connection
 * @param targetVersion - The version to rollback to (0 means rollback all migrations)
 * @param migrations - Optional migrations array (defaults to MIGRATIONS, primarily for testing)
 */
export const rollbackMigrations = async (
  db: MigrationDb,
  targetVersion: number,
  migrations: Migration[] = MIGRATIONS,
): Promise<void> => {
  const currentVersion = await getSchemaVersion(db);

  if (targetVersion >= currentVersion) {
    throw new Error(
      `Cannot rollback to version ${targetVersion} (current version is ${currentVersion})`,
    );
  }

  // Find all migrations to rollback (in reverse order)
  const migrationsToRollback = migrations
    .filter((m) => m.version > targetVersion && m.version <= currentVersion)
    .reverse();

  // Execute rollback for each migration, updating schema version incrementally
  for (let index = 0; index < migrationsToRollback.length; index += 1) {
    const migration = migrationsToRollback[index];
    if (!migration.rollback) {
      throw new Error(
        `Migration ${migration.version} (${migration.name}) does not have a rollback defined`,
      );
    }
    await db.execute(migration.rollback);

    const nextVersion =
      migrationsToRollback[index + 1]?.version ?? targetVersion;
    await updateSchemaVersion(db, nextVersion);
  }
};
