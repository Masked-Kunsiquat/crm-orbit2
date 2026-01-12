import { useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Calendar from "expo-calendar";

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
import { useTheme, useCalendarSync } from "../../hooks";
import {
  useAccounts,
  useAllAudits,
  useAllInteractions,
  useDoc,
} from "../../store/store";
import { formatTimestamp } from "@domains/shared/dateFormatting";

type AuditAlarmOption = "0" | "30" | "60" | "120" | "custom";

export const CalendarSettingsScreen = () => {
  const { colors } = useTheme();
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const doc = useDoc();
  const [permission, requestPermission] = Calendar.useCalendarPermissions();

  const calendarSync = useCalendarSync({
    permissionGranted: permission?.granted ?? false,
    audits,
    interactions,
    accounts,
    doc,
  });

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

  const handleRequestPermission = useCallback(async () => {
    try {
      await requestPermission();
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to request calendar permission.", error);
      }
    }
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
                value={calendarSync.calendarName}
                onChangeText={calendarSync.setCalendarName}
                placeholder={t("calendar.sync.defaultCalendarName")}
                autoCapitalize="words"
              />
            </FormField>
            <FormField
              label={t("calendar.sync.auditAlarmLabel")}
              hint={t("calendar.sync.auditAlarmHint")}
            >
              <SegmentedOptionGroup
                options={alarmOptions}
                value={calendarSync.auditAlarmPreset}
                onChange={calendarSync.handleAlarmPresetChange}
              />
              <View style={styles.alarmInputRow}>
                <TextField
                  value={calendarSync.auditAlarmOffset}
                  onChangeText={calendarSync.handleAlarmOffsetChange}
                  placeholder={t("calendar.sync.auditAlarmPlaceholder")}
                  keyboardType="number-pad"
                  style={styles.alarmInput}
                />
                <Text
                  style={[styles.alarmUnit, { color: colors.textSecondary }]}
                >
                  {t("common.duration.minutesLabel")}
                </Text>
              </View>
              <View style={styles.alarmActions}>
                <ActionButton
                  label={
                    calendarSync.isSavingAlarm
                      ? t("calendar.sync.auditAlarmSaving")
                      : t("calendar.sync.auditAlarmSave")
                  }
                  onPress={calendarSync.handleSaveAuditAlarm}
                  tone="link"
                  size="compact"
                  disabled={calendarSync.isSavingAlarm}
                />
              </View>
              {calendarSync.auditAlarmMessage ? (
                <Text
                  style={[
                    styles.syncHint,
                    {
                      color:
                        calendarSync.auditAlarmStatus === "error"
                          ? colors.error
                          : colors.textMuted,
                    },
                  ]}
                >
                  {calendarSync.auditAlarmMessage}
                </Text>
              ) : null}
            </FormField>
            <View style={styles.syncActions}>
              <ActionButton
                label={
                  calendarSync.isSavingName
                    ? t("calendar.sync.savingName")
                    : t("calendar.sync.saveName")
                }
                onPress={calendarSync.handleSaveCalendarName}
                tone="link"
                size="compact"
                disabled={calendarSync.isSavingName}
              />
              <PrimaryActionButton
                label={
                  calendarSync.syncStatus === "syncing"
                    ? t("calendar.sync.syncing")
                    : t("calendar.sync.syncButton")
                }
                onPress={calendarSync.handleSyncCalendar}
                size="compact"
                disabled={calendarSync.syncStatus === "syncing"}
              />
            </View>
            {calendarSync.syncStatus === "syncing" ? (
              <View style={styles.syncStatusRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[styles.syncHint, { color: colors.textSecondary }]}
                >
                  {t("calendar.sync.syncingHint")}
                </Text>
              </View>
            ) : null}
            {calendarSync.syncMessage ? (
              <Text
                style={[
                  styles.syncHint,
                  {
                    color:
                      calendarSync.syncStatus === "error"
                        ? colors.error
                        : colors.textMuted,
                  },
                ]}
              >
                {calendarSync.syncMessage}
              </Text>
            ) : null}
            {calendarSync.calendarError ? (
              <Text style={[styles.syncHint, { color: colors.error }]}>
                {calendarSync.calendarError}
              </Text>
            ) : null}
            <Text style={[styles.syncHint, { color: colors.textMuted }]}>
              {calendarSync.lastSync
                ? t("calendar.sync.lastSync", {
                    time: formatTimestamp(calendarSync.lastSync),
                  })
                : t("calendar.sync.notSynced")}
            </Text>
            {calendarSync.calendarId ? (
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
