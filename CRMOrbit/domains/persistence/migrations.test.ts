import { runMigrations, rollbackMigrations, MIGRATIONS } from "./migrations";
import type { MigrationDb } from "./migrations";
import type { SQLiteBindParams } from "expo-sqlite";

describe("runMigrations", () => {
  let executedStatements: string[] = [];
  let schemaVersion: number = 0;

  const createMockDb = (): MigrationDb => ({
    execute: async (sql: string, params?: SQLiteBindParams) => {
      executedStatements.push(sql);

      // Simulate schema_version updates with parameterized queries
      if (sql.includes("insert or replace into schema_version")) {
        // params = [1, version]
        if (Array.isArray(params) && params.length >= 2) {
          schemaVersion = Number(params[1]);
        }
      }
    },
    getFirstRow: async <T>(sql: string): Promise<T | null> => {
      if (sql.includes("select version from schema_version")) {
        return (
          schemaVersion > 0 ? ({ version: schemaVersion } as T) : null
        ) as T | null;
      }
      return null;
    },
  });

  beforeEach(() => {
    executedStatements = [];
    schemaVersion = 0;
  });

  it("should create schema_version table on first run", async () => {
    const db = createMockDb();
    await runMigrations(db);

    expect(executedStatements[0]).toContain(
      "create table if not exists schema_version",
    );
  });

  it("should run all migrations on fresh database", async () => {
    const db = createMockDb();
    await runMigrations(db);

    // Should have: create schema_version, migration 1, update version, migration 2, update version
    expect(executedStatements.length).toBeGreaterThanOrEqual(
      1 + MIGRATIONS.length * 2,
    );

    // Verify all migrations were executed
    for (const migration of MIGRATIONS) {
      expect(executedStatements).toContainEqual(migration.sql);
    }

    // Final version should be the highest migration version
    expect(schemaVersion).toBe(Math.max(...MIGRATIONS.map((m) => m.version)));
  });

  it("should skip already applied migrations", async () => {
    const db = createMockDb();

    // Simulate that version 1 is already applied
    schemaVersion = 1;

    await runMigrations(db);

    // Should only run migration 2
    const migration1 = MIGRATIONS.find((m) => m.version === 1);
    const migration2 = MIGRATIONS.find((m) => m.version === 2);

    expect(executedStatements).not.toContainEqual(migration1?.sql);
    expect(executedStatements).toContainEqual(migration2?.sql);
  });

  it("should handle idempotent migrations", async () => {
    const db = createMockDb();

    // Run migrations twice
    await runMigrations(db);
    executedStatements = [];
    await runMigrations(db);

    // Second run should not execute any migrations (except schema_version check)
    const migrationSql = executedStatements.filter(
      (sql) => !sql.includes("schema_version"),
    );
    expect(migrationSql.length).toBe(0);
  });

  it("should track version correctly after each migration", async () => {
    const db = createMockDb();
    const versions: number[] = [];

    // Track version after each statement
    const originalExecute = db.execute;
    db.execute = async (sql: string, params?: SQLiteBindParams) => {
      await originalExecute(sql, params);
      if (sql.includes("insert or replace into schema_version")) {
        versions.push(schemaVersion);
      }
    };

    await runMigrations(db);

    // Should have tracked each migration version
    expect(versions.sort((a, b) => a - b)).toEqual(
      MIGRATIONS.map((m) => m.version).sort((a, b) => a - b),
    );
  });

  it("should maintain migration order", async () => {
    const db = createMockDb();
    await runMigrations(db);

    const migrationExecutionOrder: number[] = [];

    for (const stmt of executedStatements) {
      for (const migration of MIGRATIONS) {
        if (stmt === migration.sql) {
          migrationExecutionOrder.push(migration.version);
        }
      }
    }

    // Should execute in version order
    expect(migrationExecutionOrder).toEqual(
      [...migrationExecutionOrder].sort(),
    );
  });

  it("should throw non-table-missing errors when checking version", async () => {
    const dbWithPermissionError: MigrationDb = {
      execute: async () => {
        // execute succeeds for schema_version table creation
      },
      getFirstRow: async () => {
        throw new Error("permission denied");
      },
    };

    await expect(runMigrations(dbWithPermissionError)).rejects.toThrow(
      "permission denied",
    );
  });

  it("should throw connection errors when checking version", async () => {
    const dbWithConnectionError: MigrationDb = {
      execute: async () => {
        // execute succeeds for schema_version table creation
      },
      getFirstRow: async () => {
        throw new Error("connection timeout");
      },
    };

    await expect(runMigrations(dbWithConnectionError)).rejects.toThrow(
      "connection timeout",
    );
  });

  it("should use parameterized queries to prevent SQL injection", async () => {
    const db = createMockDb();
    const executeCalls: Array<{ sql: string; params?: SQLiteBindParams }> = [];

    // Spy on execute calls
    const originalExecute = db.execute;
    db.execute = async (sql: string, params?: SQLiteBindParams) => {
      executeCalls.push({ sql, params });
      return originalExecute(sql, params);
    };

    await runMigrations(db);

    // Find all version update calls
    const versionUpdates = executeCalls.filter((call) =>
      call.sql.includes("insert or replace into schema_version"),
    );

    // Should have parameterized queries (not string interpolation)
    for (const update of versionUpdates) {
      expect(update.params).toBeDefined();
      if (Array.isArray(update.params)) {
        expect(update.params.length).toBeGreaterThan(0);
      }
      expect(update.sql).not.toMatch(/values \(\d+\)/); // Should not have hardcoded numbers
    }
  });
});

describe("rollbackMigrations", () => {
  let executedStatements: string[] = [];
  let schemaVersion: number = 0;

  const createMockDb = (): MigrationDb => ({
    execute: async (sql: string, params?: SQLiteBindParams) => {
      executedStatements.push(sql);

      // Simulate schema_version updates with parameterized queries
      if (sql.includes("insert or replace into schema_version")) {
        // params = [1, version]
        if (Array.isArray(params) && params.length >= 2) {
          schemaVersion = Number(params[1]);
        }
      }
    },
    getFirstRow: async <T>(sql: string): Promise<T | null> => {
      if (sql.includes("select version from schema_version")) {
        return (
          schemaVersion > 0 ? ({ version: schemaVersion } as T) : null
        ) as T | null;
      }
      return null;
    },
  });

  beforeEach(() => {
    executedStatements = [];
    schemaVersion = 2; // Start at latest version
  });

  it("should rollback to target version", async () => {
    const db = createMockDb();
    await rollbackMigrations(db, 1);

    // Should have executed rollback for version 2
    const migration2 = MIGRATIONS.find((m) => m.version === 2);
    expect(executedStatements).toContainEqual(migration2?.rollback);
    expect(schemaVersion).toBe(1);
  });

  it("should rollback all migrations when target is 0", async () => {
    const db = createMockDb();
    await rollbackMigrations(db, 0);

    // Should have executed rollback for both migrations (in reverse order)
    expect(executedStatements).toContainEqual(MIGRATIONS[1].rollback);
    expect(executedStatements).toContainEqual(MIGRATIONS[0].rollback);
    expect(schemaVersion).toBe(0);
  });

  it("should rollback migrations in reverse order", async () => {
    const db = createMockDb();
    await rollbackMigrations(db, 0);

    const rollbackOrder: number[] = [];
    for (const stmt of executedStatements) {
      for (const migration of MIGRATIONS) {
        if (stmt === migration.rollback) {
          rollbackOrder.push(migration.version);
        }
      }
    }

    // Should rollback in reverse version order
    expect(rollbackOrder).toEqual([2, 1]);
  });

  it("should throw error when rolling back to current or higher version", async () => {
    const db = createMockDb();

    await expect(rollbackMigrations(db, 2)).rejects.toThrow(
      "Cannot rollback to version 2",
    );

    await expect(rollbackMigrations(db, 3)).rejects.toThrow(
      "Cannot rollback to version 3",
    );
  });

  it("should throw error when migration has no rollback defined", async () => {
    const db = createMockDb();

    // Create a test migrations array with a migration that has no rollback
    const testMigrations = [
      MIGRATIONS[0],
      { ...MIGRATIONS[1], rollback: undefined },
    ];

    await expect(rollbackMigrations(db, 1, testMigrations)).rejects.toThrow(
      "does not have a rollback defined",
    );
  });
});
