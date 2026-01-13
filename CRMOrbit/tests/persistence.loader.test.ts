import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { loadPersistedState } from "@domains/persistence/loader";
import { automergeSnapshots, eventLog } from "@domains/persistence/schema";
import {
  saveSnapshot,
  type EventLogRecord,
  type PersistenceDb,
  type SnapshotRecord,
} from "@domains/persistence/store";
import { DEFAULT_CALENDAR_SETTINGS } from "@domains/settings";

type StoredTables = {
  snapshots: SnapshotRecord[];
  events: EventLogRecord[];
};

const createMemoryDb = () => {
  const tables: StoredTables = {
    snapshots: [],
    events: [],
  };

  const createDbInterface = (currentTables: StoredTables): PersistenceDb => ({
    insert: (table) => ({
      values: (value) => ({
        run: async () => {
          if (table === automergeSnapshots) {
            const rows = Array.isArray(value)
              ? (value as SnapshotRecord[])
              : ([value] as SnapshotRecord[]);
            currentTables.snapshots.push(...rows);
            return;
          }

          if (table === eventLog) {
            const rows = Array.isArray(value)
              ? (value as EventLogRecord[])
              : ([value] as EventLogRecord[]);
            currentTables.events.push(...rows);
            return;
          }

          throw new Error("Unknown table.");
        },
      }),
    }),
    delete: (table) => ({
      run: async () => {
        if (table === automergeSnapshots) {
          currentTables.snapshots = [];
          return;
        }

        if (table === eventLog) {
          currentTables.events = [];
          return;
        }

        throw new Error("Unknown table.");
      },
    }),
    select: () => ({
      from: <T>(table: unknown) => ({
        all: async (): Promise<T[]> => {
          if (table === automergeSnapshots) {
            return [...currentTables.snapshots] as T[];
          }

          if (table === eventLog) {
            return [...currentTables.events] as T[];
          }

          throw new Error("Unknown table.");
        },
      }),
    }),
    transaction: async <T>(
      fn: (tx: PersistenceDb) => Promise<T>,
    ): Promise<T> => {
      const shadowTables: StoredTables = {
        snapshots: [...currentTables.snapshots],
        events: [...currentTables.events],
      };

      const tx = createDbInterface(shadowTables);
      const result = await fn(tx);
      currentTables.snapshots = shadowTables.snapshots;
      currentTables.events = shadowTables.events;
      return result;
    },
  });

  const db = createDbInterface(tables);

  return { db };
};

test("loadPersistedState defaults calendar settings", async () => {
  const { db } = createMemoryDb();
  const baseDoc = initAutomergeDoc();
  const legacyDoc = {
    ...baseDoc,
    settings: {
      security: baseDoc.settings.security,
    },
  };

  await saveSnapshot(db, {
    id: "snap-1",
    doc: JSON.stringify(legacyDoc),
    timestamp: "2024-01-01T00:00:00.000Z",
  });

  const { doc } = await loadPersistedState(db);

  assert.equal(
    doc.settings.calendar.palette,
    DEFAULT_CALENDAR_SETTINGS.palette,
  );
});
