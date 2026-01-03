import type { DeviceId } from "../shared/types";
import { nextId } from "../shared/idGenerator";
import type { PersistenceDb } from "./store";
import { appMetadata } from "./schema";

type AppMetadataRecord = {
  key: string;
  value: string;
};

const DEVICE_ID_KEY = "device_id";

export const loadDeviceId = async (
  db: PersistenceDb,
): Promise<DeviceId | null> => {
  const records = await db.select().from<AppMetadataRecord>(appMetadata).all();
  const record = records.find((entry) => entry.key === DEVICE_ID_KEY);
  return record?.value ?? null;
};

export const persistDeviceId = async (
  db: PersistenceDb,
  deviceId: DeviceId,
): Promise<void> => {
  await db
    .insert(appMetadata)
    .values({ key: DEVICE_ID_KEY, value: deviceId })
    .run();
};

export const getOrCreateDeviceId = async (
  db: PersistenceDb,
): Promise<DeviceId> => {
  const existing = await loadDeviceId(db);
  if (existing) {
    return existing;
  }

  const generated = nextId("device");
  await persistDeviceId(db, generated);
  return generated;
};
