import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";

import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import { t } from "@i18n/index";
import {
  ActionButton,
  FormField,
  ListRow,
  ListScreenLayout,
  PrimaryActionButton,
  Section,
  StatusBadge,
  TextField,
} from "../../components";
import { useTheme } from "../../hooks";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import type { MiscStackScreenProps } from "../../navigation/types";
import {
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  getAuditStatusTone,
  resolveAuditStatus,
} from "../../utils/audits";
import { addMinutesToTimestamp } from "../../utils/duration";
import {
  DEFAULT_DEVICE_CALENDAR_NAME,
  ensureDeviceCalendar,
  getLastCalendarSync,
  getStoredCalendarId,
  getStoredCalendarName,
  setStoredCalendarName,
  syncDeviceCalendarEvents,
  type CalendarSyncEvent,
} from "../../utils/deviceCalendar";
import { getEntitiesForInteraction } from "../../store/selectors";

type Props = MiscStackScreenProps<"Calendar">;

type CalendarItem =
  | { kind: "audit"; timestamp: number; audit: Audit }
  | { kind: "interaction"; timestamp: number; interaction: Interaction };

type SyncStatus = "idle" | "syncing" | "success" | "error";

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

const resolveTimestamp = (timestamp?: string): number => {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const toDateOrNull = (timestamp?: string): Date | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const buildAuditNotes = (audit: Audit, status: string): string | undefined => {
  const lines: string[] = [];
  lines.push(`${t("audits.fields.status")}: ${t(status)}`);
  if (audit.score !== undefined) {
    lines.push(`${t("audits.fields.score")}: ${audit.score}`);
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

const buildInteractionNotes = (interaction: Interaction): string | undefined => {
  const lines: string[] = [];
  if (interaction.status && interaction.status !== "interaction.status.completed") {
    lines.push(`${t("interactions.statusLabel")}: ${t(interaction.status)}`);
  }
  if (interaction.summary?.trim()) {
    lines.push(interaction.summary.trim());
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
};

export const CalendarScreen = ({ navigation }: Props) => {
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();
  const { colors } = useTheme();
  const [permission, requestPermission] = Calendar.useCalendarPermissions();
  const [calendarName, setCalendarName] = useState(
    DEFAULT_DEVICE_CALENDAR_NAME,
  );
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  useEffect(() => {
    const loadSettings = async () => {
      const [storedName, storedId, storedLastSync] = await Promise.all([
        getStoredCalendarName(),
        getStoredCalendarId(),
        getLastCalendarSync(),
      ]);
      setCalendarName(storedName);
      setCalendarId(storedId);
      setLastSync(storedLastSync);
    };
    void loadSettings();
  }, []);

  const items = useMemo<CalendarItem[]>(() => {
    const auditItems = audits.map((audit) => ({
      kind: "audit" as const,
      timestamp: resolveTimestamp(getAuditStartTimestamp(audit)),
      audit,
    }));
    const interactionItems = interactions.map((interaction) => ({
      kind: "interaction" as const,
      timestamp: resolveTimestamp(
        interaction.scheduledFor ?? interaction.occurredAt,
      ),
      interaction,
    }));
    return [...auditItems, ...interactionItems].sort(
      (left, right) => right.timestamp - left.timestamp,
    );
  }, [audits, interactions]);

  const buildCalendarEvents = useCallback((): CalendarSyncEvent[] => {
    const events: CalendarSyncEvent[] = [];

    for (const audit of audits) {
      const status = resolveAuditStatus(audit);
      if (status === "audits.status.canceled") continue;
      const accountName =
        accountNames.get(audit.accountId) ?? t("common.unknownEntity");
      const startTimestamp = getAuditStartTimestamp(audit);
      const startDate = toDateOrNull(startTimestamp);
      if (!startDate) continue;
      const endTimestamp = getAuditEndTimestamp(audit) ?? startTimestamp;
      const endDate = toDateOrNull(endTimestamp) ?? startDate;
      events.push({
        key: `audit:${audit.id}`,
        title: `${accountName} - ${t("calendar.event.audit")}`,
        startDate,
        endDate,
        notes: buildAuditNotes(audit, status),
      });
    }

    for (const interaction of interactions) {
      if (interaction.status === "interaction.status.canceled") continue;
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
        title: `${accountName} - ${t(interaction.type)}`,
        startDate,
        endDate,
        notes: buildInteractionNotes(interaction),
      });
    }

    return events;
  }, [accountNames, audits, doc, interactions]);

  const handleAdd = () => {
    navigation.navigate("InteractionForm", {});
  };

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

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "interaction.type.email":
        return <Ionicons name="mail-outline" size={20} color={colors.accent} />;
      case "interaction.type.call":
        return <Ionicons name="call-outline" size={20} color={colors.accent} />;
      case "interaction.type.meeting":
        return (
          <Ionicons
            name="people-circle-outline"
            size={20}
            color={colors.accent}
          />
        );
      case "interaction.type.other":
      default:
        return (
          <FontAwesome6 name="lines-leaning" size={20} color={colors.accent} />
        );
    }
  };

  const renderItem = ({ item }: { item: CalendarItem }) => {
    if (item.kind === "audit") {
      const audit = item.audit;
      const accountName =
        accountNames.get(audit.accountId) ?? t("common.unknownEntity");
      const status = resolveAuditStatus(audit);
      const timestampLabel =
        status === "audits.status.completed"
          ? t("audits.fields.occurredAt")
          : t("audits.fields.scheduledFor");
      const startTimestamp = getAuditStartTimestamp(audit);
      const endTimestamp = getAuditEndTimestamp(audit);
      const timestampValue = formatTimestamp(startTimestamp);
      const endTimestampValue = endTimestamp
        ? formatTimestamp(endTimestamp)
        : undefined;
      const scoreLabel =
        audit.score !== undefined
          ? `${t("audits.fields.score")}: ${audit.score}`
          : undefined;
      const floorsLabel =
        audit.floorsVisited && audit.floorsVisited.length > 0
          ? `${t("audits.fields.floorsVisited")}: ${audit.floorsVisited.join(
              ", ",
            )}`
          : undefined;
      const footnote = audit.notes?.trim() || floorsLabel;
      const subtitle = scoreLabel ?? (audit.notes ? floorsLabel : undefined);
      const description = endTimestampValue
        ? `${timestampLabel}: ${timestampValue} · ${t(
            "audits.fields.endsAt",
          )}: ${endTimestampValue}`
        : `${timestampLabel}: ${timestampValue}`;

      return (
        <ListRow
          onPress={() =>
            navigation.navigate("AuditDetail", { auditId: audit.id })
          }
          title={accountName}
          description={description}
          footnote={footnote}
          subtitle={subtitle}
          descriptionNumberOfLines={2}
          footnoteNumberOfLines={2}
          style={styles.listRow}
          titleAccessory={
            <StatusBadge tone={getAuditStatusTone(status)} labelKey={status} />
          }
        >
          <View style={styles.iconContainer}>
            <AntDesign name="audit" size={20} color={colors.accent} />
          </View>
        </ListRow>
      );
    }

    const interaction = item.interaction;
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestampValue = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const labelKey = usesScheduledTimestamp
      ? "interactions.scheduledFor"
      : "interactions.occurredAt";
    const formattedTimestamp = formatTimestamp(timestampValue);
    const description =
      resolvedStatus === "interaction.status.completed"
        ? `${t(labelKey)}: ${formattedTimestamp}`
        : `${t("interactions.statusLabel")}: ${t(resolvedStatus)} · ${t(
            labelKey,
          )}: ${formattedTimestamp}`;
    const endTimestamp = addMinutesToTimestamp(
      timestampValue,
      interaction.durationMinutes,
    );
    const endTimestampValue = endTimestamp
      ? formatTimestamp(endTimestamp)
      : undefined;
    const interactionDescription = endTimestampValue
      ? `${description} · ${t("interactions.fields.endsAt")}: ${endTimestampValue}`
      : description;

    return (
      <ListRow
        onPress={() =>
          navigation.navigate("InteractionDetail", {
            interactionId: interaction.id,
          })
        }
        title={interaction.summary}
        description={interactionDescription}
        descriptionNumberOfLines={2}
        style={styles.listRow}
      >
        <View style={styles.iconContainer}>
          {getInteractionIcon(interaction.type)}
        </View>
      </ListRow>
    );
  };

  const syncHeader = (
    <Section title={t("calendar.sync.title")}>
      {Platform.OS === "web" ? (
        <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
          {t("calendar.sync.unsupported")}
        </Text>
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
                { color: syncStatus === "error" ? colors.error : colors.textMuted },
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
  );

  return (
    <ListScreenLayout
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) =>
        item.kind === "audit"
          ? `audit-${item.audit.id}`
          : `interaction-${item.interaction.id}`
      }
      emptyTitle={t("calendar.emptyTitle")}
      emptyHint={t("calendar.emptyHint")}
      onAdd={handleAdd}
      listHeaderComponent={syncHeader}
    />
  );
};

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginLeft: 8,
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
