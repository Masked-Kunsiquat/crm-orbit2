import { useCallback, useEffect, useMemo, useState } from "react";
import * as Calendar from "expo-calendar";

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
      setCalendars([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const [storedId, available] = await Promise.all([
        getStoredExternalCalendarId(),
        Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT),
      ]);

      const normalized = normalizeCalendars(available);
      setCalendars(normalized);

      if (
        storedId &&
        !normalized.some((calendar) => calendar.id === storedId)
      ) {
        await setStoredExternalCalendarId(null);
        setSelectedCalendarId(null);
      } else {
        setSelectedCalendarId(storedId);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [permissionGranted]);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  const refreshCalendars = useCallback(async () => {
    await loadCalendars();
  }, [loadCalendars]);

  const selectCalendar = useCallback(async (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    try {
      await setStoredExternalCalendarId(calendarId);
    } catch {
      setHasError(true);
    }
  }, []);

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
