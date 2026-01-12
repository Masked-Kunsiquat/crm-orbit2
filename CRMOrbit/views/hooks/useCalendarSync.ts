import { useCallback, useEffect, useMemo, useState } from "react";
import type { AutomergeDoc } from "@automerge/schema";
import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import type { Account } from "@domains/account";
import { t } from "@i18n/index";
import {
  DEFAULT_DEVICE_CALENDAR_NAME,
  DEFAULT_AUDIT_ALARM_OFFSET_MINUTES,
  ensureDeviceCalendar,
  getStoredAuditAlarmOffsetMinutes,
  getLastCalendarSync,
  getStoredCalendarId,
  getStoredCalendarName,
  setStoredAuditAlarmOffsetMinutes,
  setStoredCalendarName,
  syncDeviceCalendarEvents,
} from "../utils/deviceCalendar";
import { buildAllCalendarEvents } from "../utils/calendarEventBuilders";

type SyncStatus = "idle" | "syncing" | "success" | "error";
type AuditAlarmOption = "0" | "30" | "60" | "120" | "custom";

/**
 * Resolves a numeric alarm offset to its preset option.
 */
const resolveAlarmPreset = (minutes: number): AuditAlarmOption => {
  if (minutes === 0) return "0";
  if (minutes === 30) return "30";
  if (minutes === 60) return "60";
  if (minutes === 120) return "120";
  return "custom";
};

export type CalendarSyncState = {
  // Calendar identity
  calendarName: string;
  setCalendarName: (name: string) => void;
  calendarId: string | null;
  calendarError: string | null;

  // Sync state
  syncStatus: SyncStatus;
  syncMessage: string | null;
  lastSync: string | null;
  isSavingName: boolean;

  // Alarm settings
  auditAlarmOffset: string;
  auditAlarmPreset: AuditAlarmOption;
  auditAlarmMessage: string | null;
  isSavingAlarm: boolean;
  auditAlarmStatus: "idle" | "saved" | "error";
  resolvedAuditAlarmOffsetMinutes: number;

  // Actions
  handleSaveCalendarName: () => Promise<void>;
  handleAlarmPresetChange: (value: AuditAlarmOption) => void;
  handleAlarmOffsetChange: (value: string) => void;
  handleSaveAuditAlarm: () => Promise<void>;
  handleSyncCalendar: () => Promise<void>;
};

export type UseCalendarSyncParams = {
  permissionGranted: boolean;
  audits: Audit[];
  interactions: Interaction[];
  accounts: Account[];
  doc: AutomergeDoc;
};

/**
 * Manages calendar sync state and operations.
 * Handles calendar naming, alarm settings, and synchronization.
 */
export const useCalendarSync = ({
  permissionGranted,
  audits,
  interactions,
  accounts,
  doc,
}: UseCalendarSyncParams): CalendarSyncState => {
  // Calendar identity state
  const [calendarName, setCalendarName] = useState(
    DEFAULT_DEVICE_CALENDAR_NAME,
  );
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  // Alarm settings state
  const [auditAlarmOffset, setAuditAlarmOffset] = useState(
    `${DEFAULT_AUDIT_ALARM_OFFSET_MINUTES}`,
  );
  const [auditAlarmPreset, setAuditAlarmPreset] = useState<AuditAlarmOption>(
    resolveAlarmPreset(DEFAULT_AUDIT_ALARM_OFFSET_MINUTES),
  );
  const [auditAlarmMessage, setAuditAlarmMessage] = useState<string | null>(
    null,
  );
  const [isSavingAlarm, setIsSavingAlarm] = useState(false);
  const [auditAlarmStatus, setAuditAlarmStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");

  // Computed state
  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const resolvedAuditAlarmOffsetMinutes = useMemo(() => {
    const parsed = Number(auditAlarmOffset.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      return DEFAULT_AUDIT_ALARM_OFFSET_MINUTES;
    }
    return Math.round(parsed);
  }, [auditAlarmOffset]);

  // Load stored settings on mount
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const [storedName, storedId, storedLastSync, storedAlarmOffset] =
          await Promise.all([
            getStoredCalendarName(),
            getStoredCalendarId(),
            getLastCalendarSync(),
            getStoredAuditAlarmOffsetMinutes(),
          ]);
        if (mounted) {
          setCalendarName(storedName);
          setCalendarId(storedId);
          setLastSync(storedLastSync);
          setAuditAlarmOffset(`${storedAlarmOffset}`);
          setAuditAlarmPreset(resolveAlarmPreset(storedAlarmOffset));
        }
      } catch {
        // Settings fall back to defaults.
      }
    };
    void loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  // Ensure calendar exists when permission granted
  useEffect(() => {
    if (!permissionGranted || calendarId) return;
    let mounted = true;
    const ensureCalendar = async () => {
      try {
        const nextName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
        const id = await ensureDeviceCalendar(nextName);
        if (mounted) {
          setCalendarId(id);
          setCalendarError(null);
        }
      } catch (error) {
        if (mounted) {
          setCalendarError(t("calendar.sync.error"));
        }
        if (__DEV__) {
          console.error("Failed to ensure device calendar.", error);
        }
      }
    };
    void ensureCalendar();
    return () => {
      mounted = false;
    };
  }, [calendarId, calendarName, permissionGranted]);

  // Build calendar events
  const buildCalendarEvents = useCallback(() => {
    return buildAllCalendarEvents(
      audits,
      interactions,
      accountMap,
      doc,
      resolvedAuditAlarmOffsetMinutes,
    );
  }, [accountMap, audits, doc, interactions, resolvedAuditAlarmOffsetMinutes]);

  // Save calendar name
  const handleSaveCalendarName = useCallback(async () => {
    if (isSavingName) return;
    setIsSavingName(true);
    const nextName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
    try {
      await setStoredCalendarName(nextName);
      setCalendarName(nextName);
      if (permissionGranted) {
        const id = await ensureDeviceCalendar(nextName);
        setCalendarId(id);
      }
      setSyncMessage(t("calendar.sync.nameSaved"));
    } catch {
      setSyncMessage(t("calendar.sync.nameSaveError"));
    } finally {
      setIsSavingName(false);
    }
  }, [calendarName, isSavingName, permissionGranted]);

  // Handle alarm preset change
  const handleAlarmPresetChange = (value: AuditAlarmOption) => {
    setAuditAlarmPreset(value);
    setAuditAlarmMessage(null);
    setAuditAlarmStatus("idle");
    if (value === "custom") {
      return;
    }
    setAuditAlarmOffset(value);
  };

  // Handle alarm offset change
  const handleAlarmOffsetChange = (value: string) => {
    setAuditAlarmOffset(value);
    setAuditAlarmMessage(null);
    setAuditAlarmStatus("idle");
    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed)) {
      setAuditAlarmPreset("custom");
      return;
    }
    setAuditAlarmPreset(resolveAlarmPreset(Math.round(parsed)));
  };

  // Save audit alarm settings
  const handleSaveAuditAlarm = async () => {
    if (isSavingAlarm) return;
    setIsSavingAlarm(true);
    const trimmed = auditAlarmOffset.trim();
    const parsed = trimmed
      ? Number(trimmed)
      : DEFAULT_AUDIT_ALARM_OFFSET_MINUTES;
    if (!Number.isFinite(parsed) || parsed < 0) {
      setAuditAlarmMessage(t("calendar.sync.auditAlarmInvalid"));
      setAuditAlarmStatus("error");
      setIsSavingAlarm(false);
      return;
    }
    const rounded = Math.round(parsed);
    try {
      await setStoredAuditAlarmOffsetMinutes(rounded);
      setAuditAlarmOffset(`${rounded}`);
      setAuditAlarmPreset(resolveAlarmPreset(rounded));
      setAuditAlarmMessage(t("calendar.sync.auditAlarmSaved"));
      setAuditAlarmStatus("saved");
    } catch {
      setAuditAlarmMessage(t("calendar.sync.auditAlarmSaveError"));
      setAuditAlarmStatus("error");
    } finally {
      setIsSavingAlarm(false);
    }
  };

  // Sync calendar
  const handleSyncCalendar = useCallback(async () => {
    if (!permissionGranted || syncStatus === "syncing") return;
    setSyncStatus("syncing");
    setSyncMessage(null);
    try {
      const nextName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
      await setStoredCalendarName(nextName);
      const id = await ensureDeviceCalendar(nextName);
      setCalendarId(id);
      const events = buildCalendarEvents();
      const summary = await syncDeviceCalendarEvents(id, events);
      const timestamp = new Date().toISOString();
      setLastSync(timestamp);
      setSyncStatus("success");
      setSyncMessage(
        t("calendar.sync.summary", {
          created: summary.created,
          updated: summary.updated,
          deleted: summary.deleted,
        }),
      );
    } catch {
      setSyncStatus("error");
      setSyncMessage(t("calendar.sync.error"));
    }
  }, [buildCalendarEvents, calendarName, permissionGranted, syncStatus]);

  return {
    calendarName,
    setCalendarName,
    calendarId,
    calendarError,
    syncStatus,
    syncMessage,
    lastSync,
    isSavingName,
    auditAlarmOffset,
    auditAlarmPreset,
    auditAlarmMessage,
    isSavingAlarm,
    auditAlarmStatus,
    resolvedAuditAlarmOffsetMinutes,
    handleSaveCalendarName,
    handleAlarmPresetChange,
    handleAlarmOffsetChange,
    handleSaveAuditAlarm,
    handleSyncCalendar,
  };
};
