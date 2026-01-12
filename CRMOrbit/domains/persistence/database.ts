import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import { runMigrations } from "./migrations";
import type { PersistenceDb } from "./store";
import { automergeSnapshots, eventLog } from "./schema";

const DB_NAME = "crm_orbit.db";

let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize and return the database instance.
 * Runs migrations on first initialization.
 */
export const initializeDatabase = async (): Promise<
  ReturnType<typeof drizzle>
> => {
  if (dbInstance) {
    return dbInstance;
  }

  const expoDb = SQLite.openDatabaseSync(DB_NAME);
  dbInstance = drizzle(expoDb);

  // Run migrations
  await runMigrations({
    execute: async (sql: string, params?: unknown[]) => {
      if (params && params.length > 0) {
        await expoDb.runAsync(sql, params);
      } else {
        await expoDb.execAsync(sql);
      }
    },
    getFirstRow: async <T>(
      sql: string,
      params?: unknown[],
    ): Promise<T | null> => {
      const result =
        params && params.length > 0
          ? await expoDb.getFirstAsync<T>(sql, params)
          : await expoDb.getFirstAsync<T>(sql);
      return result ?? null;
    },
  });

  return dbInstance;
};

/**
 * Get the current database instance.
 * Throws if database hasn't been initialized.
 */
export const getDatabase = (): ReturnType<typeof drizzle> => {
  if (!dbInstance) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return dbInstance;
};

/**
 * Create a PersistenceDb interface from the Drizzle database.
 * This adapts the Drizzle API to our persistence store interface.
 */
export const createPersistenceDb = (
  db: ReturnType<typeof drizzle>,
): PersistenceDb => {
  return {
    insert: (table) => ({
      values: (value) => ({
        run: async () => {
          await db
            .insert(table as typeof eventLog | typeof automergeSnapshots)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .values(value as any);
        },
      }),
    }),
    delete: (table) => ({
      run: async () => {
        await db.delete(table as typeof eventLog | typeof automergeSnapshots);
      },
    }),
    select: () => ({
      from: <T>(table: unknown) => ({
        all: async (): Promise<T[]> => {
          const results = await db
            .select()
            .from(table as typeof eventLog | typeof automergeSnapshots);
          return results as T[];
        },
      }),
    }),
    transaction: async <T>(
      fn: (tx: PersistenceDb) => Promise<T>,
    ): Promise<T> => {
      return await db.transaction(async (tx) => {
        const txDb = createPersistenceDb(
          tx as unknown as ReturnType<typeof drizzle>,
        );
        return await fn(txDb);
      });
    },
  };
};
