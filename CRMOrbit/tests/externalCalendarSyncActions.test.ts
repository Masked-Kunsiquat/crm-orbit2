import assert from "node:assert/strict";

// Mock expo-sqlite to avoid native module errors in Jest
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(),
}));

// Mock expo-calendar to avoid native module errors in Jest
jest.mock("expo-calendar", () => ({
  getEventsAsync: jest.fn(),
  updateEventAsync: jest.fn(),
}));

import type { EventLogRecord, PersistenceDb } from "@domains/persistence/store";
import { commitExternalCalendarChanges } from "@domains/actions/externalCalendarSyncActions";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";
import { commitAndPersistExternalCalendarChanges } from "@views/services/externalCalendarSyncService";

const createPersistenceDb = () => {
  let inserted: EventLogRecord[] | undefined;

  const db: PersistenceDb = {
    insert: () => ({
      values: (value) => ({
        run: async () => {
          inserted = value as EventLogRecord[];
        },
      }),
    }),
    delete: () => ({
      run: async () => undefined,
    }),
    select: () => ({
      from: () => ({
        all: async () => [],
      }),
    }),
    transaction: async (fn) => fn(db),
  };

  return {
    db,
    getInserted: () => inserted,
  };
};

test("commitExternalCalendarChanges maps changes into events", () => {
  const changes: ExternalCalendarChange[] = [
    {
      type: "calendarEvent.updated",
      entityId: "calendar-1",
      payload: { id: "calendar-1", summary: "Updated" },
      timestamp: "2026-02-01T10:00:00.000Z",
      deviceId: "device-1",
    },
  ];

  const events = commitExternalCalendarChanges(changes);

  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "calendarEvent.updated");
  assert.equal(events[0]?.entityId, "calendar-1");
  assert.equal(events[0]?.deviceId, "device-1");
  assert.deepEqual(events[0]?.payload, {
    id: "calendar-1",
    summary: "Updated",
  });
});

test("commitAndPersistExternalCalendarChanges persists event log records", async () => {
  const { db, getInserted } = createPersistenceDb();
  const changes: ExternalCalendarChange[] = [
    {
      type: "calendarEvent.updated",
      entityId: "calendar-1",
      payload: { id: "calendar-1", summary: "Updated" },
      timestamp: "2026-02-01T10:00:00.000Z",
      deviceId: "device-1",
    },
  ];

  let committed: EventLogRecord[] = [];
  const events = await commitAndPersistExternalCalendarChanges({
    changes,
    commitEvents: async (nextEvents) => {
      committed = nextEvents.map((event) => ({
        id: event.id,
        type: event.type,
        entityId: event.entityId ?? null,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp,
        deviceId: event.deviceId,
      }));
    },
    persistenceDb: db,
  });

  assert.equal(events.length, 1);
  assert.equal(committed.length, 1);
  assert.equal(committed[0]?.type, "calendarEvent.updated");
  const inserted = getInserted();
  assert.ok(inserted);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0]?.type, "calendarEvent.updated");
  assert.equal(inserted[0]?.entityId, "calendar-1");
  assert.equal(inserted[0]?.deviceId, "device-1");
  assert.deepEqual(JSON.parse(inserted[0]?.payload ?? "{}"), {
    id: "calendar-1",
    summary: "Updated",
  });
});

test("commitAndPersistExternalCalendarChanges skips persistence when empty", async () => {
  const { db, getInserted } = createPersistenceDb();

  const events = await commitAndPersistExternalCalendarChanges({
    changes: [],
    commitEvents: async () => undefined,
    persistenceDb: db,
  });

  assert.equal(events.length, 0);
  assert.equal(getInserted(), undefined);
});
