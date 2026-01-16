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
import { registerCoreReducers } from "@events/dispatcher";

jest.mock("@react-native-async-storage/async-storage", () => {
  const storage = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) =>
        Promise.resolve(storage.get(key) ?? null),
      ),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

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

test("loadPersistedState sanitizes account calendar match", async () => {
  const { db } = createMemoryDb();
  const baseDoc = initAutomergeDoc();
  const legacyDoc = {
    ...baseDoc,
    accounts: {
      "acct-1": {
        id: "acct-1",
        organizationId: "org-1",
        name: "ACME Retail",
        status: "account.status.active",
        auditFrequency: "account.auditFrequency.monthly",
        auditFrequencyUpdatedAt: "2024-01-02T00:00:00.000Z",
        auditFrequencyAnchorAt: "2024-01-01T00:00:00.000Z",
        calendarMatch: {
          mode: "exact",
          aliases: ["", "  "],
        },
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    },
  };

  await saveSnapshot(db, {
    id: "snap-2",
    doc: JSON.stringify(legacyDoc),
    timestamp: "2024-01-02T00:00:00.000Z",
  });

  const { doc } = await loadPersistedState(db);

  assert.equal(doc.accounts["acct-1"]?.calendarMatch, undefined);
});

test("loadPersistedState normalizes legacy calendar event statuses", async () => {
  registerCoreReducers();
  const { db } = createMemoryDb();

  const legacyEvent: EventLogRecord = {
    id: "evt-legacy-1",
    type: "calendarEvent.scheduled",
    entityId: "calendar-legacy",
    payload: JSON.stringify({
      id: "calendar-legacy",
      type: "meeting",
      summary: "Legacy status",
      scheduledFor: "2026-01-02T10:00:00.000Z",
      status: "scheduled",
    }),
    timestamp: "2026-01-01T09:00:00.000Z",
    deviceId: "device-1",
  };

  await db.insert(eventLog).values(legacyEvent).run();

  const { doc } = await loadPersistedState(db);
  const event = doc.calendarEvents["calendar-legacy"];

  assert.ok(event);
  assert.equal(event.status, "calendarEvent.status.scheduled");
  assert.equal(event.type, "calendarEvent.type.meeting");
});
