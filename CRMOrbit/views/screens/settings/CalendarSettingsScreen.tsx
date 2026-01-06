import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Calendar from "expo-calendar";

import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import { formatAddressForMaps } from "@domains/linking.utils";
import { t } from "@i18n/index";
import {
  ActionButton,
  FormField,
  FormScreenLayout,
  PrimaryActionButton,
  Section,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import { useTheme } from "../../hooks";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import {
  formatAuditScore,
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  resolveAuditStatus,
} from "../../utils/audits";
import { addMinutesToTimestamp } from "../../utils/duration";
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
  type CalendarSyncEvent,
} from "../../utils/deviceCalendar";
import { getEntitiesForInteraction } from "../../store/selectors";

type SyncStatus = "idle" | "syncing" | "success" | "error";
type AuditAlarmOption = "0" | "30" | "60" | "120" | "custom";

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) {
    return t("common.unknown");
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return t("common.unknown");
  }
  return date.toLocaleString();
};

const toDateOrNull = (timestamp?: string): Date | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const buildCalendarTitle = (title: string, isCanceled: boolean): string => {
  if (!isCanceled) {
    return title;
  }
  return `${t("calendar.event.canceledPrefix")} - ${title}`;
};

const resolveAlarmPreset = (minutes: number): AuditAlarmOption => {
  if (minutes === 0) return "0";
  if (minutes === 30) return "30";
  if (minutes === 60) return "60";
  if (minutes === 120) return "120";
  return "custom";
};

const buildAuditNotes = (
  audit: Audit,
  status: string,
  parkingAddress?: string,
): string | undefined => {
  const lines: string[] = [];
  lines.push(`${t("audits.fields.status")}: ${t(status)}`);
  if (parkingAddress) {
    lines.push(`${t("accounts.fields.parkingAddress")}: ${parkingAddress}`);
  }
  const scoreValue = formatAuditScore(audit.score);
  if (scoreValue) {
    lines.push(`${t("audits.fields.score")}: ${scoreValue}`);
  }
  if (audit.floorsVisited && audit.floorsVisited.length > 0) {
    lines.push(
      `${t("audits.fields.floorsVisited")}: ${audit.floorsVisited.join(", ")}`,
    );
  }
  if (audit.notes?.trim()) {
    lines.push(`${t("audits.fields.notes")}: ${audit.notes.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
};

const buildInteractionNotes = (
  interaction: Interaction,
): string | undefined => {
  const lines: string[] = [];
  if (
    interaction.status &&
    interaction.status !== "interaction.status.completed"
  ) {
    lines.push(`${t("interactions.statusLabel")}: ${t(interaction.status)}`);
  }
  if (interaction.summary?.trim()) {
    lines.push(interaction.summary.trim());
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
};

export const CalendarSettingsScreen = () => {
  const { colors } = useTheme();
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();
  const [permission, requestPermission] = Calendar.useCalendarPermissions();
  const [calendarName, setCalendarName] = useState(
    DEFAULT_DEVICE_CALENDAR_NAME,
  );
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [auditAlarmOffset, setAuditAlarmOffset] = useState(
    `${DEFAULT_AUDIT_ALARM_OFFSET_MINUTES}`,
  );
  const [auditAlarmPreset, setAuditAlarmPreset] =
    useState<AuditAlarmOption>(
      resolveAlarmPreset(DEFAULT_AUDIT_ALARM_OFFSET_MINUTES),
    );
  const [auditAlarmMessage, setAuditAlarmMessage] = useState<string | null>(
    null,
  );
  const [isSavingAlarm, setIsSavingAlarm] = useState(false);
  const [auditAlarmStatus, setAuditAlarmStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");

  const alarmOptions: Array<{ value: AuditAlarmOption; label: string }> = [
    {
      value: "0",
      label: t("calendar.sync.auditAlarmOption.none"),
    },
    {
      value: "30",
      label: t("calendar.sync.auditAlarmOption.30"),
    },
    {
      value: "60",
      label: t("calendar.sync.auditAlarmOption.60"),
    },
    {
      value: "120",
      label: t("calendar.sync.auditAlarmOption.120"),
    },
    {
      value: "custom",
      label: t("calendar.sync.auditAlarmOption.custom"),
    },
  ];

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

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const [
          storedName,
          storedId,
          storedLastSync,
          storedAlarmOffset,
        ] = await Promise.all([
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
          const preset: AuditAlarmOption =
            storedAlarmOffset === 0
              ? "0"
              : storedAlarmOffset === 30
                ? "30"
                : storedAlarmOffset === 60
                  ? "60"
                  : storedAlarmOffset === 120
                    ? "120"
                    : "custom";
          setAuditAlarmPreset(preset);
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

  useEffect(() => {
    if (!permission?.granted || calendarId) return;
    let mounted = true;
    const ensureCalendar = async () => {
      try {
        const nextName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
        const id = await ensureDeviceCalendar(nextName);
        if (mounted) {
          setCalendarId(id);
        }
      } catch {
        // Calendar creation failed silently.
      }
    };
    void ensureCalendar();
    return () => {
      mounted = false;
    };
  }, [calendarId, calendarName, permission?.granted]);

  const buildCalendarEvents = useCallback((): CalendarSyncEvent[] => {
    const events: CalendarSyncEvent[] = [];

    for (const audit of audits) {
      const status = resolveAuditStatus(audit);
      const isCanceled = status === "audits.status.canceled";
      const account = accountMap.get(audit.accountId);
      const accountName = account?.name ?? t("common.unknownEntity");
      const siteAddress = account?.addresses?.site;
      const parkingAddress = account?.addresses?.useSameForParking
        ? account?.addresses?.site
        : account?.addresses?.parking;
      const siteAddressText = siteAddress
        ? formatAddressForMaps(siteAddress)
        : undefined;
      const parkingAddressText = parkingAddress
        ? formatAddressForMaps(parkingAddress)
        : undefined;
      const location = siteAddressText ?? parkingAddressText;
      const parkingNote =
        parkingAddressText && parkingAddressText !== location
          ? parkingAddressText
          : undefined;
      const startTimestamp = getAuditStartTimestamp(audit);
      const startDate = toDateOrNull(startTimestamp);
      if (!startDate) continue;
      const endTimestamp = getAuditEndTimestamp(audit) ?? startTimestamp;
      const endDate = toDateOrNull(endTimestamp) ?? startDate;
      const alarmOffset =
        !isCanceled && resolvedAuditAlarmOffsetMinutes > 0
          ? [{ relativeOffset: -resolvedAuditAlarmOffsetMinutes }]
          : [];
      events.push({
        key: `audit:${audit.id}`,
        title: buildCalendarTitle(
          `${accountName} - ${t("calendar.event.audit")}`,
          isCanceled,
        ),
        startDate,
        endDate,
        location,
        notes: buildAuditNotes(audit, status, parkingNote),
        alarms: alarmOffset,
      });
    }

    for (const interaction of interactions) {
      const isCanceled = interaction.status === "interaction.status.canceled";
      const timestamp =
        interaction.scheduledFor ?? interaction.occurredAt ?? undefined;
      const startDate = toDateOrNull(timestamp);
      if (!startDate) continue;
      const endTimestamp = addMinutesToTimestamp(
        timestamp,
        interaction.durationMinutes,
      );
      const endDate = toDateOrNull(endTimestamp) ?? startDate;
      const linkedEntities = getEntitiesForInteraction(doc, interaction.id);
      const accountEntity =
        linkedEntities.find((entity) => entity.entityType === "account") ??
        linkedEntities[0];
      const accountName = accountEntity?.name ?? t("common.unknownEntity");
      events.push({
        key: `interaction:${interaction.id}`,
        title: buildCalendarTitle(
          `${accountName} - ${t(interaction.type)}`,
          isCanceled,
        ),
        startDate,
        endDate,
        notes: buildInteractionNotes(interaction),
      });
    }

    return events;
  }, [accountMap, audits, doc, interactions, resolvedAuditAlarmOffsetMinutes]);

  const handleSaveCalendarName = useCallback(async () => {
    if (isSavingName) return;
    setIsSavingName(true);
    const nextName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
    try {
      await setStoredCalendarName(nextName);
      setCalendarName(nextName);
      if (permission?.granted) {
        const id = await ensureDeviceCalendar(nextName);
        setCalendarId(id);
      }
      setSyncMessage(t("calendar.sync.nameSaved"));
    } catch {
      setSyncMessage(t("calendar.sync.nameSaveError"));
    } finally {
      setIsSavingName(false);
    }
  }, [calendarName, isSavingName, permission?.granted]);

  const handleAlarmPresetChange = (value: AuditAlarmOption) => {
    setAuditAlarmPreset(value);
    setAuditAlarmMessage(null);
    setAuditAlarmStatus("idle");
    if (value === "custom") {
      return;
    }
    setAuditAlarmOffset(value);
  };

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

  const handleSyncCalendar = useCallback(async () => {
    if (!permission?.granted || syncStatus === "syncing") return;
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
  }, [buildCalendarEvents, calendarName, permission?.granted, syncStatus]);

  const handleRequestPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return (
    <FormScreenLayout>
      <Section title={t("calendar.sync.title")}>
        {Platform.OS === "web" ? (
          <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
            {t("calendar.sync.unsupported")}
          </Text>
        ) : permission === null ? (
          <View style={styles.syncStatusRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
              {t("calendar.sync.permissionChecking")}
            </Text>
          </View>
        ) : permission?.granted ? (
        <>
          <FormField label={t("calendar.sync.nameLabel")}>
            <TextField
              value={calendarName}
              onChangeText={setCalendarName}
              placeholder={DEFAULT_DEVICE_CALENDAR_NAME}
              autoCapitalize="words"
            />
          </FormField>
          <FormField
            label={t("calendar.sync.auditAlarmLabel")}
            hint={t("calendar.sync.auditAlarmHint")}
          >
            <SegmentedOptionGroup
              options={alarmOptions}
              value={auditAlarmPreset}
              onChange={handleAlarmPresetChange}
            />
            <View style={styles.alarmInputRow}>
              <TextField
                value={auditAlarmOffset}
                onChangeText={handleAlarmOffsetChange}
                placeholder={t("calendar.sync.auditAlarmPlaceholder")}
                keyboardType="number-pad"
                style={styles.alarmInput}
              />
              <Text style={[styles.alarmUnit, { color: colors.textSecondary }]}>
                {t("common.duration.minutesLabel")}
              </Text>
            </View>
            <View style={styles.alarmActions}>
              <ActionButton
                label={
                  isSavingAlarm
                    ? t("calendar.sync.auditAlarmSaving")
                    : t("calendar.sync.auditAlarmSave")
                }
                onPress={handleSaveAuditAlarm}
                tone="link"
                size="compact"
                disabled={isSavingAlarm}
              />
            </View>
            {auditAlarmMessage ? (
              <Text
                style={[
                  styles.syncHint,
                  {
                    color:
                      auditAlarmStatus === "error"
                        ? colors.error
                        : colors.textMuted,
                  },
                ]}
              >
                {auditAlarmMessage}
              </Text>
            ) : null}
          </FormField>
          <View style={styles.syncActions}>
            <ActionButton
              label={
                isSavingName
                  ? t("calendar.sync.savingName")
                    : t("calendar.sync.saveName")
                }
                onPress={handleSaveCalendarName}
                tone="link"
                size="compact"
                disabled={isSavingName}
              />
              <PrimaryActionButton
                label={
                  syncStatus === "syncing"
                    ? t("calendar.sync.syncing")
                    : t("calendar.sync.syncButton")
                }
                onPress={handleSyncCalendar}
                size="compact"
                disabled={syncStatus === "syncing"}
              />
            </View>
            {syncStatus === "syncing" ? (
              <View style={styles.syncStatusRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
                  {t("calendar.sync.syncingHint")}
                </Text>
              </View>
            ) : null}
            {syncMessage ? (
              <Text
                style={[
                  styles.syncHint,
                  {
                    color:
                      syncStatus === "error" ? colors.error : colors.textMuted,
                  },
                ]}
              >
                {syncMessage}
              </Text>
            ) : null}
            <Text style={[styles.syncHint, { color: colors.textMuted }]}>
              {lastSync
                ? t("calendar.sync.lastSync", {
                    time: formatTimestamp(lastSync),
                  })
                : t("calendar.sync.notSynced")}
            </Text>
            {calendarId ? (
              <Text style={[styles.syncHint, { color: colors.textMuted }]}>
                {t("calendar.sync.calendarReady")}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
              {t("calendar.sync.permissionHint")}
            </Text>
            <View style={styles.permissionActions}>
              <PrimaryActionButton
                label={t("calendar.sync.permissionButton")}
                onPress={handleRequestPermission}
                size="compact"
              />
              {permission && !permission.canAskAgain ? (
                <ActionButton
                  label={t("calendar.sync.openSettings")}
                  onPress={handleOpenSettings}
                  tone="link"
                  size="compact"
                />
              ) : null}
            </View>
          </>
        )}
      </Section>
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  alarmInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  alarmInput: {
    flex: 1,
  },
  alarmUnit: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  alarmActions: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  syncActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  permissionActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
  syncHint: {
    fontSize: 12,
    marginTop: 4,
  },
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
});
