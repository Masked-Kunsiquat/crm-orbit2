import assert from "node:assert/strict";

import type { Event } from "@events/event";
import {
  automergeSnapshots,
  calendarEventExternalLinks,
  eventLog,
} from "@domains/persistence/schema";
import {
  appendEvents,
  type EventLogRecord,
  type PersistenceDb,
  type SnapshotRecord,
} from "@domains/persistence/store";
import {
  importBackupPayload,
  parseBackupPayload,
} from "@domains/persistence/backup";

type StoredTables = {
  snapshots: SnapshotRecord[];
  events: EventLogRecord[];
  externalLinks: CalendarEventExternalLinkRecord[];
};

type CalendarEventExternalLinkRecord = {
  id: string;
  calendarEventId: string;
  provider: string;
  calendarId: string;
  externalEventId: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  lastExternalModifiedAt?: string | null;
};

const createMemoryDb = () => {
  const tables: StoredTables = {
    snapshots: [],
    events: [],
    externalLinks: [],
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

          if (table === calendarEventExternalLinks) {
            const rows = Array.isArray(value)
              ? (value as CalendarEventExternalLinkRecord[])
              : ([value] as CalendarEventExternalLinkRecord[]);
            currentTables.externalLinks.push(...rows);
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

        if (table === calendarEventExternalLinks) {
          currentTables.externalLinks = [];
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

          if (table === calendarEventExternalLinks) {
            return [...currentTables.externalLinks] as T[];
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
        externalLinks: [...currentTables.externalLinks],
      };

      const tx = createDbInterface(shadowTables);

      const result = await fn(tx);
      currentTables.snapshots = shadowTables.snapshots;
      currentTables.events = shadowTables.events;
      currentTables.externalLinks = shadowTables.externalLinks;
      return result;
    },
  });

  const db = createDbInterface(tables);

  return { db, tables };
};

const buildEvent = (overrides: Partial<Event> = {}): Event => ({
  id: overrides.id ?? "evt-1",
  type: overrides.type ?? "note.created",
  payload: overrides.payload ?? { id: "note-1" },
  timestamp: overrides.timestamp ?? "2024-01-01T00:00:00.000Z",
  deviceId: overrides.deviceId ?? "device-1",
  entityId: overrides.entityId,
});

test("parseBackupPayload rejects duplicate event ids", () => {
  const payload = {
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
    events: [buildEvent(), buildEvent()],
  };

  assert.throws(() => parseBackupPayload(payload), /Duplicate event id/);
});

test("importBackupPayload replaces persistence with snapshot", async () => {
  const { db, tables } = createMemoryDb();
  const payload = parseBackupPayload({
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
    events: [buildEvent(), buildEvent({ id: "evt-2" })],
    snapshot: {
      id: "snap-1",
      doc: "{}",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  const result = await importBackupPayload(db, payload, "replace");

  assert.equal(result.snapshotApplied, true);
  assert.equal(tables.events.length, 2);
  assert.equal(tables.snapshots.length, 1);
});

test("importBackupPayload merges and skips existing events", async () => {
  const { db, tables } = createMemoryDb();
  await appendEvents(db, [buildEvent()]);

  const payload = parseBackupPayload({
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
    events: [buildEvent(), buildEvent({ id: "evt-2" })],
  });

  const result = await importBackupPayload(db, payload, "merge");

  assert.equal(result.eventsImported, 1);
  assert.equal(result.eventsSkipped, 1);
  assert.equal(tables.events.length, 2);
});
