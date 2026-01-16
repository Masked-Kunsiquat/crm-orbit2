import AsyncStorage from "@react-native-async-storage/async-storage";

const EXTERNAL_BACKGROUND_ENABLED_KEY = "calendar.external.background.enabled";
const EXTERNAL_BACKGROUND_LAST_RUN_KEY = "calendar.external.background.lastRun";
const EXTERNAL_BACKGROUND_LAST_OUTCOME_KEY =
  "calendar.external.background.lastOutcome";
const EXTERNAL_SYNC_LOCK_KEY = "calendar.external.sync.lock";

const LOCK_TTL_MS = 10 * 60 * 1000;

export type ExternalBackgroundSyncOutcome = "success" | "error" | "skipped";

export type ExternalBackgroundSyncStatus = {
  lastRunAt: string | null;
  lastOutcome: ExternalBackgroundSyncOutcome | null;
};

export const getExternalBackgroundSyncEnabled = async (): Promise<boolean> => {
  const stored = await AsyncStorage.getItem(EXTERNAL_BACKGROUND_ENABLED_KEY);
  return stored === "1";
};

export const setExternalBackgroundSyncEnabled = async (
  enabled: boolean,
): Promise<void> => {
  if (enabled) {
    await AsyncStorage.setItem(EXTERNAL_BACKGROUND_ENABLED_KEY, "1");
  } else {
    await AsyncStorage.removeItem(EXTERNAL_BACKGROUND_ENABLED_KEY);
  }
};

export const getExternalBackgroundSyncStatus =
  async (): Promise<ExternalBackgroundSyncStatus> => {
    const [lastRunAt, lastOutcome] = await Promise.all([
      AsyncStorage.getItem(EXTERNAL_BACKGROUND_LAST_RUN_KEY),
      AsyncStorage.getItem(EXTERNAL_BACKGROUND_LAST_OUTCOME_KEY),
    ]);

    const outcome =
      lastOutcome === "success" ||
      lastOutcome === "error" ||
      lastOutcome === "skipped"
        ? lastOutcome
        : null;

    return {
      lastRunAt: lastRunAt ?? null,
      lastOutcome: outcome,
    };
  };

export const setExternalBackgroundSyncStatus = async (
  status: ExternalBackgroundSyncStatus,
): Promise<void> => {
  const runAt = status.lastRunAt ?? null;
  const outcome = status.lastOutcome ?? null;

  if (runAt) {
    await AsyncStorage.setItem(EXTERNAL_BACKGROUND_LAST_RUN_KEY, runAt);
  } else {
    await AsyncStorage.removeItem(EXTERNAL_BACKGROUND_LAST_RUN_KEY);
  }

  if (outcome) {
    await AsyncStorage.setItem(EXTERNAL_BACKGROUND_LAST_OUTCOME_KEY, outcome);
  } else {
    await AsyncStorage.removeItem(EXTERNAL_BACKGROUND_LAST_OUTCOME_KEY);
  }
};

export const acquireExternalCalendarSyncLock = async (): Promise<boolean> => {
  const now = Date.now();
  const stored = await AsyncStorage.getItem(EXTERNAL_SYNC_LOCK_KEY);
  const lastAcquired = stored ? Number(stored) : NaN;

  if (Number.isFinite(lastAcquired) && now - lastAcquired < LOCK_TTL_MS) {
    return false;
  }

  await AsyncStorage.setItem(EXTERNAL_SYNC_LOCK_KEY, now.toString());
  return true;
};

export const releaseExternalCalendarSyncLock = async (): Promise<void> => {
  await AsyncStorage.removeItem(EXTERNAL_SYNC_LOCK_KEY);
};
