import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createLogger } from "@utils/logger";
import {
  getExternalBackgroundSyncEnabled,
  getExternalBackgroundSyncStatus,
  setExternalBackgroundSyncEnabled,
  type ExternalBackgroundSyncStatus,
} from "../utils/externalCalendarBackground";
import { ensureExternalCalendarBackgroundSync } from "../services/externalCalendarBackgroundTask";

const logger = createLogger("ExternalCalendarBackgroundSync");

export type ExternalCalendarBackgroundSyncState = {
  enabled: boolean;
  status: ExternalBackgroundSyncStatus;
  isLoading: boolean;
  hasError: boolean;
  refreshStatus: () => Promise<void>;
  toggleEnabled: (nextEnabled: boolean) => Promise<void>;
};

export const useExternalCalendarBackgroundSync =
  (): ExternalCalendarBackgroundSyncState => {
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState<ExternalBackgroundSyncStatus>({
      lastRunAt: null,
      lastOutcome: null,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const latestToggleRequestId = useRef(0);

    const loadState = useCallback(async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const [nextEnabled, nextStatus] = await Promise.all([
          getExternalBackgroundSyncEnabled(),
          getExternalBackgroundSyncStatus(),
        ]);
        setEnabled(nextEnabled);
        setStatus(nextStatus);
      } catch (error) {
        logger.error("Failed to load background sync state.", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      void loadState();
    }, [loadState]);

    const toggleEnabled = useCallback(
      async (nextEnabled: boolean) => {
        const requestId = latestToggleRequestId.current + 1;
        latestToggleRequestId.current = requestId;
        const previous = enabled;
        setEnabled(nextEnabled);
        setHasError(false);
        try {
          await setExternalBackgroundSyncEnabled(nextEnabled);
          await ensureExternalCalendarBackgroundSync().catch((error) => {
            logger.error(
              "Failed to ensure background sync registration.",
              error,
            );
            throw error;
          });
        } catch (error) {
          logger.error("Failed to toggle background sync.", error);
          if (requestId !== latestToggleRequestId.current) {
            return;
          }
          setEnabled(previous);
          setHasError(true);
        }
      },
      [enabled],
    );

    return useMemo(
      () => ({
        enabled,
        status,
        isLoading,
        hasError,
        refreshStatus: loadState,
        toggleEnabled,
      }),
      [enabled, status, isLoading, hasError, loadState, toggleEnabled],
    );
  };
