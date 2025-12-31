import type { Event } from "../../events/event";
import type { PersistenceDb, SnapshotRecord } from "./store";
import { appendEvents, saveSnapshot } from "./store";

export type SeedData = {
  snapshot?: SnapshotRecord;
  events?: Event[];
};

export const seedPersistence = async (
  db: PersistenceDb,
  data: SeedData,
): Promise<void> => {
  if (data.snapshot) {
    await saveSnapshot(db, data.snapshot);
  }

  if (data.events && data.events.length > 0) {
    await appendEvents(db, data.events);
  }
};
