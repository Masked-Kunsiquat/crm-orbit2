import type { Event } from "../events/event";
import type { Timestamp } from "../shared/types";
import { automergeSnapshots, eventLog } from "./schema";

export type SnapshotRecord = {
  id: string;
  doc: string;
  timestamp: Timestamp;
};

export type PersistenceDb = {
  insert: (table: unknown) => { values: (value: unknown) => { run: () => Promise<void> } };
  select: () => { from: (table: unknown) => { all: () => Promise<SnapshotRecord[]> } };
};

export const saveSnapshot = async (
  db: PersistenceDb,
  snapshot: SnapshotRecord,
): Promise<void> => {
  await db.insert(automergeSnapshots).values(snapshot).run();
};

export const loadLatestSnapshot = async (
  db: PersistenceDb,
): Promise<SnapshotRecord | null> => {
  const rows = await db.select().from(automergeSnapshots).all();

  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest,
  );
};

export const appendEvents = async (
  db: PersistenceDb,
  events: Event[],
): Promise<void> => {
  const rows = events.map((event) => ({
    id: event.id,
    type: event.type,
    entityId: event.entityId ?? null,
    payload: JSON.stringify(event.payload),
    timestamp: event.timestamp,
    deviceId: event.deviceId,
  }));

  await db.insert(eventLog).values(rows).run();
};
