import assert from "node:assert/strict";

import type { EventLogRecord, PersistenceDb } from "@domains/persistence/store";
import { persistExternalCalendarChanges } from "@domains/actions/externalCalendarSyncActions";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";

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

test("persistExternalCalendarChanges writes event log records", async () => {
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

  const events = await persistExternalCalendarChanges(db, changes);

  assert.equal(events.length, 1);
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

test("persistExternalCalendarChanges skips persistence when empty", async () => {
  const { db, getInserted } = createPersistenceDb();

  const events = await persistExternalCalendarChanges(db, []);

  assert.equal(events.length, 0);
  assert.equal(getInserted(), undefined);
});
