import assert from "node:assert/strict";

import { automergeSnapshots, eventLog } from "@domains/persistence/schema";
import {
  appendEvents,
  loadLatestSnapshot,
  persistSnapshotAndEvents,
  saveSnapshot,
  type EventLogRecord,
  type PersistenceDb,
  type SnapshotRecord,
} from "@domains/persistence/store";
import type { Event } from "@events/event";

type StoredTables = {
  snapshots: SnapshotRecord[];
  events: EventLogRecord[];
};

const createMemoryDb = () => {
  const tables: StoredTables = {
    snapshots: [],
    events: [],
  };

  const createDbInterface = (
    currentTables: StoredTables,
  ): PersistenceDb => ({
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
    select: () => ({
      from: <T,>(table: unknown) => ({
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
    transaction: async <T>(fn: (tx: PersistenceDb) => Promise<T>): Promise<T> => {
      // Simulate transaction with shadow tables for rollback
      const shadowTables: StoredTables = {
        snapshots: [...currentTables.snapshots],
        events: [...currentTables.events],
      };

      const tx = createDbInterface(shadowTables);

      try {
        const result = await fn(tx);
        // Commit: apply shadow tables to main tables
        currentTables.snapshots = shadowTables.snapshots;
        currentTables.events = shadowTables.events;
        return result;
      } catch (error) {
        // Rollback: discard shadow tables, keep original tables
        throw error;
      }
    },
  });

  const db = createDbInterface(tables);

  return { db, tables };
};

test("saveSnapshot persists and loadLatestSnapshot returns the newest", async () => {
  const { db } = createMemoryDb();
  const first: SnapshotRecord = {
    id: "snap-1",
    doc: "{}",
    timestamp: "2024-01-01T00:00:00.000Z",
  };
  const second: SnapshotRecord = {
    id: "snap-2",
    doc: "{ }",
    timestamp: "2024-02-01T00:00:00.000Z",
  };

  await saveSnapshot(db, first);
  await saveSnapshot(db, second);

  const latest = await loadLatestSnapshot(db);

  assert.ok(latest);
  assert.equal(latest.id, "snap-2");
});

test("appendEvents persists serialized payloads", async () => {
  const { db, tables } = createMemoryDb();
  const events: Event[] = [
    {
      id: "evt-1",
      type: "note.created",
      payload: { id: "note-1", title: "Note", body: "Body" },
      timestamp: "2024-03-01T00:00:00.000Z",
      deviceId: "device-1",
    },
    {
      id: "evt-2",
      type: "note.updated",
      payload: { id: "note-1", title: "Note updated" },
      timestamp: "2024-03-02T00:00:00.000Z",
      deviceId: "device-1",
    },
  ];

  await appendEvents(db, events);

  assert.equal(tables.events.length, 2);
  assert.equal(tables.events[0]?.payload, JSON.stringify(events[0]?.payload));
  assert.equal(tables.events[1]?.payload, JSON.stringify(events[1]?.payload));
});

test("persistSnapshotAndEvents writes events then snapshot in transaction", async () => {
  const { db, tables } = createMemoryDb();
  const snapshot: SnapshotRecord = {
    id: "snap-1",
    doc: "{}",
    timestamp: "2024-04-01T00:00:00.000Z",
  };
  const events: Event[] = [
    {
      id: "evt-1",
      type: "note.created",
      payload: { id: "note-1", title: "Note", body: "Body" },
      timestamp: "2024-04-01T00:00:00.000Z",
      deviceId: "device-1",
    },
  ];

  await persistSnapshotAndEvents(db, snapshot, events);

  assert.equal(tables.events.length, 1);
  assert.equal(tables.snapshots.length, 1);
});

test("transaction rolls back on error", async () => {
  const { db, tables } = createMemoryDb();

  const errorThrowingSnapshot: SnapshotRecord = {
    id: "snap-bad",
    doc: "{}",
    timestamp: "2024-05-01T00:00:00.000Z",
  };

  // Add initial data
  await saveSnapshot(db, {
    id: "snap-good",
    doc: "{}",
    timestamp: "2024-05-01T00:00:00.000Z",
  });

  assert.equal(tables.snapshots.length, 1);

  // Attempt transaction that will fail
  try {
    await db.transaction(async (tx) => {
      await saveSnapshot(tx, errorThrowingSnapshot);
      // Simulate an error during transaction
      throw new Error("Transaction failed");
    });
    assert.fail("Should have thrown error");
  } catch (error) {
    assert.ok(error);
  }

  // Verify rollback: original data intact, no new data
  assert.equal(tables.snapshots.length, 1);
  assert.equal(tables.snapshots[0]?.id, "snap-good");
});
