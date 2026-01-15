import { useCallback, useEffect, useMemo, useState } from "react";
import * as Calendar from "expo-calendar";

import { createLogger } from "@utils/logger";
import {
  getStoredExternalCalendarId,
  setStoredExternalCalendarId,
} from "../utils/deviceCalendar";

type ExternalCalendarOption = {
  id: string;
  title: string;
  source?: string;
};

export type ExternalCalendarSelectionState = {
  calendars: ExternalCalendarOption[];
  selectedCalendarId: string | null;
  isLoading: boolean;
  hasError: boolean;
  refreshCalendars: () => Promise<void>;
  selectCalendar: (calendarId: string) => Promise<void>;
};

export type UseExternalCalendarSelectionParams = {
  permissionGranted: boolean;
};

const logger = createLogger("ExternalCalendarSelection");

const normalizeCalendars = (
  calendars: Calendar.Calendar[],
): ExternalCalendarOption[] => {
  return calendars
    .filter((calendar) => calendar.allowsModifications)
    .map((calendar) => ({
      id: calendar.id,
      title: calendar.title || calendar.id,
      source: calendar.source?.name ?? calendar.ownerAccount ?? undefined,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
};

export const useExternalCalendarSelection = ({
  permissionGranted,
}: UseExternalCalendarSelectionParams): ExternalCalendarSelectionState => {
  const [calendars, setCalendars] = useState<ExternalCalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadCalendars = useCallback(async () => {
    if (!permissionGranted) {
      logger.debug("Skipping external calendar load (no permission).");
      setCalendars([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    logger.debug("Loading external calendars.");
    try {
      const [storedId, available] = await Promise.all([
        getStoredExternalCalendarId(),
        Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT),
      ]);

      const normalized = normalizeCalendars(available);
      setCalendars(normalized);
      logger.info("Loaded external calendars.", {
        count: normalized.length,
        hasStoredSelection: Boolean(storedId),
      });

      if (
        storedId &&
        !normalized.some((calendar) => calendar.id === storedId)
      ) {
        logger.warn("Stored external calendar selection missing; clearing.");
        await setStoredExternalCalendarId(null);
        setSelectedCalendarId(null);
      } else {
        setSelectedCalendarId(storedId);
      }
    } catch (err) {
      logger.error("Failed to load external calendars.", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [permissionGranted]);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  const refreshCalendars = useCallback(async () => {
    logger.debug("Refreshing external calendars.");
    await loadCalendars();
  }, [loadCalendars]);

  const selectCalendar = useCallback(
    async (calendarId: string) => {
      const previousId = selectedCalendarId;
      setSelectedCalendarId(calendarId);
      logger.info("Selecting external calendar.");
      try {
        await setStoredExternalCalendarId(calendarId);
        logger.debug("External calendar selection stored.");
      } catch (err) {
        logger.error("Failed to store external calendar selection.", err);
        setSelectedCalendarId(previousId);
        setHasError(true);
      }
    },
    [selectedCalendarId],
  );

  return useMemo(
    () => ({
      calendars,
      selectedCalendarId,
      isLoading,
      hasError,
      refreshCalendars,
      selectCalendar,
    }),
    [
      calendars,
      selectedCalendarId,
      isLoading,
      hasError,
      refreshCalendars,
      selectCalendar,
    ],
  );
};
