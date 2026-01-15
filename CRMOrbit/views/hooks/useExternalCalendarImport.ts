import { useCallback, useMemo, useState } from "react";
import * as Calendar from "expo-calendar";

import type { Account } from "@domains/account";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { EntityId } from "@domains/shared/types";
import { buildEvent } from "@events/dispatcher";
import { nextId } from "@domains/shared/idGenerator";
import { buildAccountCalendarMatchUpdate } from "@domains/account.utils";
import { getDatabase } from "@domains/persistence/database";
import {
  insertCalendarEventExternalLink,
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
} from "@domains/persistence/calendarEventExternalLinks";
import { getStoredExternalCalendarId } from "../utils/deviceCalendar";
import {
  appendCrmOrbitMarkerToNotes,
  buildExternalCalendarImportCandidates,
  buildExternalCalendarImportWindow,
  loadExternalCalendarEvents,
  type ExternalCalendarImportCandidate,
} from "../utils/externalCalendarImport";
import { useDispatch } from "./useDispatch";
import { useDeviceId } from "./useDeviceId";

export type ExternalCalendarImportScanError =
  | "permissionDenied"
  | "calendarNotSelected"
  | "loadFailed";

export type ExternalCalendarImportResult =
  | { ok: true; calendarEventId: EntityId }
  | { ok: false; error: string };

export type ExternalCalendarImportState = {
  candidates: ExternalCalendarImportCandidate[];
  isScanning: boolean;
  scanError: ExternalCalendarImportScanError | null;
  isImporting: boolean;
  importError: string | null;
  scanCandidates: () => Promise<void>;
  importCandidate: (
    candidate: ExternalCalendarImportCandidate,
    accountId: EntityId,
  ) => Promise<ExternalCalendarImportResult>;
  clearErrors: () => void;
};

export type UseExternalCalendarImportParams = {
  permissionGranted: boolean;
  accounts: Account[];
  calendarEvents: CalendarEvent[];
};

export const useExternalCalendarImport = ({
  permissionGranted,
  accounts,
  calendarEvents,
}: UseExternalCalendarImportParams): ExternalCalendarImportState => {
  const deviceId = useDeviceId();
  const { dispatch } = useDispatch();
  const [candidates, setCandidates] = useState<
    ExternalCalendarImportCandidate[]
  >([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] =
    useState<ExternalCalendarImportScanError | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setScanError(null);
    setImportError(null);
  }, []);

  const scanCandidates = useCallback(async () => {
    if (!permissionGranted) {
      setScanError("permissionDenied");
      return;
    }
    setIsScanning(true);
    setScanError(null);
    try {
      const calendarId = await getStoredExternalCalendarId();
      if (!calendarId) {
        setScanError("calendarNotSelected");
        return;
      }
      const window = buildExternalCalendarImportWindow();
      const [events, links] = await Promise.all([
        loadExternalCalendarEvents(calendarId, window),
        listExternalLinksForCalendar(getDatabase(), calendarId),
      ]);
      const linkedExternalEventIds = new Set(
        links.map((link) => link.externalEventId),
      );
      const nextCandidates = buildExternalCalendarImportCandidates(
        events,
        accounts,
        calendarEvents,
        linkedExternalEventIds,
      );
      setCandidates(nextCandidates);
    } catch (err) {
      console.error("Failed to scan external calendar events.", err);
      setScanError("loadFailed");
    } finally {
      setIsScanning(false);
    }
  }, [permissionGranted, accounts, calendarEvents]);

  const importCandidate = useCallback(
    async (
      candidate: ExternalCalendarImportCandidate,
      accountId: EntityId,
    ): Promise<ExternalCalendarImportResult> => {
      if (isImporting) {
        return { ok: false, error: "importInProgress" };
      }
      const account = accounts.find((value) => value.id === accountId);
      if (!account) {
        return { ok: false, error: "accountNotFound" };
      }
      setIsImporting(true);
      setImportError(null);
      try {
        const calendarEventId = nextId("calendarEvent");
        const linkId = nextId("calendarExternalLink");
        const scheduleEvent = buildEvent({
          type: "calendarEvent.scheduled",
          entityId: calendarEventId,
          payload: {
            id: calendarEventId,
            type: "calendarEvent.type.audit",
            summary: candidate.title,
            scheduledFor: candidate.scheduledFor,
            ...(candidate.durationMinutes !== undefined && {
              durationMinutes: candidate.durationMinutes,
            }),
            ...(candidate.location && { location: candidate.location }),
            accountId,
          },
          deviceId,
        });
        const externalImportedEvent = buildEvent({
          type: "calendarEvent.externalImported",
          entityId: calendarEventId,
          payload: {
            linkId,
            calendarEventId,
            provider: "expo-calendar",
          },
          deviceId,
        });

        const nextMatch = buildAccountCalendarMatchUpdate(
          account,
          candidate.title,
        );
        const accountUpdateEvent =
          nextMatch !== account.calendarMatch
            ? buildEvent({
                type: "account.updated",
                entityId: accountId,
                payload: {
                  id: accountId,
                  calendarMatch: nextMatch,
                },
                deviceId,
              })
            : null;

        const events = accountUpdateEvent
          ? [scheduleEvent, externalImportedEvent, accountUpdateEvent]
          : [scheduleEvent, externalImportedEvent];

        const result = dispatch(events);
        if (!result.success) {
          throw new Error(result.error ?? "dispatchFailed");
        }

        await insertCalendarEventExternalLink(getDatabase(), {
          id: linkId,
          calendarEventId,
          provider: "expo-calendar",
          calendarId: candidate.calendarId,
          externalEventId: candidate.externalEventId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncedAt: null,
          lastExternalModifiedAt: null,
        });

        const nextNotes = appendCrmOrbitMarkerToNotes(
          candidate.notes,
          calendarEventId,
        );
        await Calendar.updateEventAsync(candidate.externalEventId, {
          notes: nextNotes,
        });
        const syncedAt = new Date().toISOString();
        await updateCalendarEventExternalLinkSyncState(getDatabase(), linkId, {
          lastSyncedAt: syncedAt,
          lastExternalModifiedAt: syncedAt,
          updatedAt: syncedAt,
        });

        setCandidates((prev) =>
          prev.filter(
            (entry) => entry.externalEventId !== candidate.externalEventId,
          ),
        );

        return { ok: true, calendarEventId };
      } catch (err) {
        console.error("Failed to import external calendar event.", err);
        setImportError("importFailed");
        return { ok: false, error: "importFailed" };
      } finally {
        setIsImporting(false);
      }
    },
    [accounts, deviceId, dispatch, isImporting],
  );

  return useMemo(
    () => ({
      candidates,
      isScanning,
      scanError,
      isImporting,
      importError,
      scanCandidates,
      importCandidate,
      clearErrors,
    }),
    [
      candidates,
      isScanning,
      scanError,
      isImporting,
      importError,
      scanCandidates,
      importCandidate,
      clearErrors,
    ],
  );
};
