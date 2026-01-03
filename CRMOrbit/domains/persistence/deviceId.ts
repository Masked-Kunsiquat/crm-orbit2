import { desc, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

import type { DeviceId } from "../shared/types";
import { eventLog } from "./schema";

type DrizzleDb = ReturnType<typeof drizzle>;

export const loadLatestDeviceId = async (
  db: DrizzleDb,
): Promise<DeviceId | null> => {
  const rows = await db
    .select({ deviceId: eventLog.deviceId })
    .from(eventLog)
    .where(isNotNull(eventLog.deviceId))
    .orderBy(desc(eventLog.timestamp), desc(eventLog.id))
    .limit(1);

  return rows[0]?.deviceId ?? null;
};
