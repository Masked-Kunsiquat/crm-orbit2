import type { DeviceId } from "../shared/types";
import type { PersistenceDb, EventLogRecord } from "./store";
import { eventLog } from "./schema";

const getMostRecentDeviceId = (
  records: EventLogRecord[],
): DeviceId | null => {
  const withDeviceId = records.filter((record) => Boolean(record.deviceId));
  if (withDeviceId.length === 0) {
    return null;
  }

  const latest = withDeviceId.reduce((currentLatest, record) => {
    if (record.timestamp > currentLatest.timestamp) {
      return record;
    }
    if (
      record.timestamp === currentLatest.timestamp &&
      record.id > currentLatest.id
    ) {
      return record;
    }
    return currentLatest;
  });

  return latest.deviceId ?? null;
};

export const loadLatestDeviceId = async (
  db: PersistenceDb,
): Promise<DeviceId | null> => {
  const records = await db.select().from<EventLogRecord>(eventLog).all();
  return getMostRecentDeviceId(records);
};
