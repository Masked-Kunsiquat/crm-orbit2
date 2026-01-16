import { useCallback, useMemo, useRef, useState } from "react";

import type { CalendarEvent } from "@domains/calendarEvent";
import { createLogger } from "@utils/logger";
import {
  acquireExternalCalendarSyncLock,
  releaseExternalCalendarSyncLock,
} from "../utils/externalCalendarBackground";
import { getStoredExternalCalendarId } from "../utils/deviceCalendar";
import {
  commitAndPersistExternalCalendarChanges,
  syncExternalCalendarLinks,
  type ExternalCalendarSyncSummary as ExternalCalendarSyncSummaryType,
} from "../services/externalCalendarSyncService";
import { useDispatch } from "./useDispatch";
import { useDeviceId } from "./useDeviceId";

const logger = createLogger("ExternalCalendarSync");

export type ExternalCalendarSyncError =
  | "permissionDenied"
  | "calendarNotSelected"
  | "syncFailed";

export type ExternalCalendarSyncState = {
  isSyncing: boolean;
  syncError: ExternalCalendarSyncError | null;
  syncSummary: ExternalCalendarSyncSummary | null;
  syncLinkedEvents: () => Promise<void>;
  clearErrors: () => void;
};

export type ExternalCalendarSyncSummary = ExternalCalendarSyncSummaryType;

export type UseExternalCalendarSyncParams = {
  permissionGranted: boolean;
  calendarEvents: CalendarEvent[];
};

export const useExternalCalendarSync = ({
  permissionGranted,
  calendarEvents,
}: UseExternalCalendarSyncParams): ExternalCalendarSyncState => {
  const deviceId = useDeviceId();
  const { dispatch } = useDispatch();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [syncError, setSyncError] = useState<ExternalCalendarSyncError | null>(
    null,
  );
  const [syncSummary, setSyncSummary] =
    useState<ExternalCalendarSyncSummary | null>(null);

  const clearErrors = useCallback(() => {
    setSyncError(null);
  }, []);

  const syncLinkedEvents = useCallback(async () => {
    if (!permissionGranted) {
      logger.warn("Sync blocked: calendar permission not granted.");
      setSyncError("permissionDenied");
      return;
    }
    if (isSyncingRef.current) {
      logger.debug("Sync already in progress; skipping.");
      return;
    }

    const lockAcquired = await acquireExternalCalendarSyncLock();
    if (!lockAcquired) {
      logger.debug("Sync lock already held; skipping.");
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);
    logger.debug("Starting external linked event sync.");

    try {
      const calendarId = await getStoredExternalCalendarId();
      if (!calendarId) {
        logger.warn("Sync blocked: no external calendar selected.");
        setSyncError("calendarNotSelected");
        return;
      }

      const { summary, changes } = await syncExternalCalendarLinks({
        calendarId,
        calendarEvents,
        deviceId,
      });

      await commitAndPersistExternalCalendarChanges({
        changes,
        commitEvents: async (events) => {
          const result = dispatch(events);
          if (!result.success) {
            throw new Error(result.error ?? "dispatchFailed");
          }
        },
      });

      setSyncSummary(summary);
      if (summary.errors > 0) {
        setSyncError("syncFailed");
      }
    } catch (err) {
      logger.error("Failed to sync external calendar events.", err);
      setSyncError("syncFailed");
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      await releaseExternalCalendarSyncLock();
    }
  }, [calendarEvents, deviceId, dispatch, permissionGranted]);

  return useMemo(
    () => ({
      isSyncing,
      syncError,
      syncSummary,
      syncLinkedEvents,
      clearErrors,
    }),
    [isSyncing, syncError, syncSummary, syncLinkedEvents, clearErrors],
  );
};
