import { Platform } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as Calendar from "expo-calendar";
import * as TaskManager from "expo-task-manager";

import { registerCoreReducers } from "@events/dispatcher";
import { createLogger } from "@utils/logger";
import {
  createPersistenceDb,
  initializeDatabase,
} from "@domains/persistence/database";
import { loadLatestDeviceId } from "@domains/persistence/deviceId";
import { loadPersistedState } from "@domains/persistence/loader";
import { persistExternalCalendarChanges } from "@domains/actions/externalCalendarSyncActions";
import { getDeviceIdFromEnv } from "@views/hooks/useDeviceId";
import { getStoredExternalCalendarId } from "@views/utils/deviceCalendar";
import {
  acquireExternalCalendarSyncLock,
  getExternalBackgroundSyncEnabled,
  releaseExternalCalendarSyncLock,
  setExternalBackgroundSyncStatus,
} from "@views/utils/externalCalendarBackground";
import { syncExternalCalendarLinks } from "./externalCalendarSyncService";

const logger = createLogger("ExternalCalendarBackground");
const EXTERNAL_CALENDAR_BACKGROUND_TASK = "external-calendar-sync";
const BACKGROUND_SYNC_INTERVAL_MINUTES = 15;

registerCoreReducers();

const resolveDeviceId = async (
  db: Awaited<ReturnType<typeof initializeDatabase>>,
): Promise<string | null> => {
  const envId = getDeviceIdFromEnv();
  if (envId) {
    return envId;
  }
  return await loadLatestDeviceId(db);
};

const runExternalCalendarBackgroundSync = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    logger.debug("Background sync skipped: unsupported platform.");
    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: "skipped",
    });
    return;
  }

  const enabled = await getExternalBackgroundSyncEnabled();
  if (!enabled) {
    logger.debug("Background sync skipped: disabled.");
    return;
  }

  const permission = await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) {
    logger.debug("Background sync skipped: permission denied.");
    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: "skipped",
    });
    return;
  }

  const calendarId = await getStoredExternalCalendarId();
  if (!calendarId) {
    logger.debug("Background sync skipped: no calendar selected.");
    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: "skipped",
    });
    return;
  }

  const lockAcquired = await acquireExternalCalendarSyncLock();
  if (!lockAcquired) {
    logger.debug("Background sync skipped: sync lock held.");
    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: "skipped",
    });
    return;
  }

  try {
    const db = await initializeDatabase();
    const persistenceDb = createPersistenceDb(db);
    const deviceId = await resolveDeviceId(db);
    if (!deviceId) {
      logger.warn("Background sync skipped: deviceId unavailable.");
      await setExternalBackgroundSyncStatus({
        lastRunAt: new Date().toISOString(),
        lastOutcome: "skipped",
      });
      return;
    }

    const { doc } = await loadPersistedState(persistenceDb);
    const calendarEvents = Object.values(doc.calendarEvents);

    const { summary, changes } = await syncExternalCalendarLinks({
      calendarId,
      calendarEvents,
      deviceId,
    });

    await persistExternalCalendarChanges(persistenceDb, changes);

    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: summary.errors > 0 ? "error" : "success",
    });
  } finally {
    await releaseExternalCalendarSyncLock();
  }
};

TaskManager.defineTask(EXTERNAL_CALENDAR_BACKGROUND_TASK, async () => {
  try {
    await runExternalCalendarBackgroundSync();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    logger.error("Background sync failed.", error);
    await setExternalBackgroundSyncStatus({
      lastRunAt: new Date().toISOString(),
      lastOutcome: "error",
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const ensureExternalCalendarBackgroundSync = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  const isAvailable = await TaskManager.isAvailableAsync();
  if (!isAvailable) {
    logger.warn("Background sync unavailable in current environment.");
    return;
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    logger.warn("Background sync API not available.");
    return;
  }

  const enabled = await getExternalBackgroundSyncEnabled();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    EXTERNAL_CALENDAR_BACKGROUND_TASK,
  );

  if (!enabled) {
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(
        EXTERNAL_CALENDAR_BACKGROUND_TASK,
      );
      logger.info("Background sync task unregistered.");
    }
    return;
  }

  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(EXTERNAL_CALENDAR_BACKGROUND_TASK, {
      minimumInterval: BACKGROUND_SYNC_INTERVAL_MINUTES,
    });
    logger.info("Background sync task registered.");
  }
};

export const getExternalCalendarBackgroundTaskName = (): string =>
  EXTERNAL_CALENDAR_BACKGROUND_TASK;
