import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Calendar from "expo-calendar";

import { t } from "@i18n/index";
import {
  ActionButton,
  FormField,
  FormScreenLayout,
  ListRow,
  PrimaryActionButton,
  Section,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import {
  useDeviceId,
  useTheme,
  useCalendarSync,
  useExternalCalendarSelection,
  useExternalCalendarImport,
  useSettingsActions,
} from "../../hooks";
import {
  useAccounts,
  useAllAudits,
  useAllCalendarEvents,
  useAllInteractions,
  useCalendarSettings,
  useDoc,
} from "../../store/store";
import { formatTimestamp } from "@domains/shared/dateFormatting";
import {
  CALENDAR_PALETTES,
  resolveCalendarPalette,
} from "../../utils/calendarColors";

type AuditAlarmOption = "0" | "30" | "60" | "120" | "custom";

export const CalendarSettingsScreen = () => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const calendarSettings = useCalendarSettings();
  const { updateCalendarSettings } = useSettingsActions(deviceId);
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const calendarEvents = useAllCalendarEvents();
  const doc = useDoc();
  const [permission, requestPermission] = Calendar.useCalendarPermissions();
  const [accountPickerCandidateId, setAccountPickerCandidateId] = useState<
    string | null
  >(null);
  const [accountSelections, setAccountSelections] = useState<
    Record<string, string>
  >({});
  const [hasScannedExternal, setHasScannedExternal] = useState(false);

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const calendarSync = useCalendarSync({
    permissionGranted: permission?.granted ?? false,
    audits,
    interactions,
    accounts,
    doc,
  });
  const externalCalendarSelection = useExternalCalendarSelection({
    permissionGranted: permission?.granted ?? false,
  });
  const externalCalendarImport = useExternalCalendarImport({
    permissionGranted: permission?.granted ?? false,
    accounts,
    calendarEvents,
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

  const paletteOptions = CALENDAR_PALETTES.map((palette) => ({
    id: palette.id,
    label: t(palette.labelKey),
    preview: resolveCalendarPalette(colors, palette.id),
  }));

  const accountPickerCandidate =
    accountPickerCandidateId === null
      ? null
      : (externalCalendarImport.candidates.find(
          (candidate) => candidate.externalEventId === accountPickerCandidateId,
        ) ?? null);

  const getSelectedAccountId = useCallback(
    (candidateId: string, fallbackId?: string, matchIds?: string[]) => {
      const selected = accountSelections[candidateId];
      if (selected) {
        return selected;
      }
      if (fallbackId) {
        return fallbackId;
      }
      if (matchIds && matchIds.length === 1) {
        return matchIds[0];
      }
      return undefined;
    },
    [accountSelections],
  );

  return (
    <FormScreenLayout>
      <Section title={t("calendar.colors.title")}>
        <FormField
          label={t("calendar.colors.paletteLabel")}
          hint={t("calendar.colors.paletteHint")}
        >
          <View style={styles.paletteList}>
            {paletteOptions.map((palette) => {
              const isSelected = palette.id === calendarSettings.palette;
              return (
                <Pressable
                  key={palette.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    if (!isSelected) {
                      updateCalendarSettings({ palette: palette.id });
                    }
                  }}
                  style={({ pressed }) => [
                    styles.paletteCardRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: isSelected
                        ? colors.accent
                        : colors.borderLight,
                    },
                    pressed && styles.paletteCardPressed,
                  ]}
                >
                  <Text
                    style={[styles.paletteLabel, { color: colors.textPrimary }]}
                  >
                    {palette.label}
                  </Text>
                  <View style={styles.swatchRow}>
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: palette.preview.audit.scheduled,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: palette.preview.audit.completed,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor:
                            palette.preview.interaction.scheduled,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor:
                            palette.preview.interaction.completed,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: palette.preview.audit.canceled,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </FormField>
      </Section>
      {Platform.OS !== "web" && permission?.granted ? (
        <Section title={t("calendar.external.title")}>
          <FormField
            label={t("calendar.external.label")}
            hint={t("calendar.external.hint")}
            accessory={
              <ActionButton
                label={t("calendar.external.refresh")}
                onPress={() => {
                  void externalCalendarSelection.refreshCalendars();
                }}
                tone="link"
                size="compact"
                disabled={externalCalendarSelection.isLoading}
              />
            }
          >
            {externalCalendarSelection.isLoading ? (
              <View style={styles.syncStatusRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[styles.syncHint, { color: colors.textSecondary }]}
                >
                  {t("calendar.external.loading")}
                </Text>
              </View>
            ) : externalCalendarSelection.hasError ? (
              <Text style={[styles.syncHint, { color: colors.error }]}>
                {t("calendar.external.error")}
              </Text>
            ) : externalCalendarSelection.calendars.length === 0 ? (
              <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
                {t("calendar.external.empty")}
              </Text>
            ) : (
              <View style={styles.externalCalendarList}>
                {externalCalendarSelection.calendars.map((calendar) => {
                  const isSelected =
                    calendar.id ===
                    externalCalendarSelection.selectedCalendarId;
                  return (
                    <Pressable
                      key={calendar.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        if (!isSelected) {
                          void externalCalendarSelection.selectCalendar(
                            calendar.id,
                          );
                        }
                      }}
                      style={({ pressed }) => [
                        styles.externalCalendarCard,
                        {
                          borderColor: isSelected
                            ? colors.accent
                            : colors.borderLight,
                          backgroundColor: colors.surfaceElevated,
                        },
                        pressed && styles.paletteCardPressed,
                      ]}
                    >
                      <View style={styles.externalCalendarRow}>
                        <View style={styles.externalCalendarText}>
                          <Text
                            style={[
                              styles.externalCalendarTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {calendar.title}
                          </Text>
                          {calendar.source ? (
                            <Text
                              style={[
                                styles.externalCalendarSubtitle,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {calendar.source}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <Text
                            style={[
                              styles.externalCalendarBadge,
                              { color: colors.accent },
                            ]}
                          >
                            {t("calendar.external.selected")}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </FormField>
        </Section>
      ) : null}
      {Platform.OS !== "web" ? (
        <Section title={t("calendar.import.title")}>
          <FormField
            label={t("calendar.import.label")}
            hint={t("calendar.import.hint")}
          >
            <View style={styles.importActions}>
              <PrimaryActionButton
                label={
                  externalCalendarImport.isScanning
                    ? t("calendar.import.scanning")
                    : t("calendar.import.scan")
                }
                onPress={() => {
                  setHasScannedExternal(true);
                  void externalCalendarImport.scanCandidates();
                }}
                size="compact"
                disabled={externalCalendarImport.isScanning}
              />
              <Text style={[styles.syncHint, { color: colors.textMuted }]}>
                {t("calendar.import.windowHint")}
              </Text>
            </View>
            {externalCalendarImport.scanError ? (
              <Text style={[styles.syncHint, { color: colors.error }]}>
                {externalCalendarImport.scanError === "permissionDenied"
                  ? t("calendar.import.permissionRequired")
                  : externalCalendarImport.scanError === "calendarNotSelected"
                    ? t("calendar.import.selectCalendar")
                    : t("calendar.import.scanFailed")}
              </Text>
            ) : null}
            {externalCalendarImport.isScanning ? (
              <View style={styles.syncStatusRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[styles.syncHint, { color: colors.textSecondary }]}
                >
                  {t("calendar.import.scanningHint")}
                </Text>
              </View>
            ) : hasScannedExternal &&
              externalCalendarImport.candidates.length === 0 ? (
              <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
                {t("calendar.import.empty")}
              </Text>
            ) : (
              <View style={styles.importList}>
                {externalCalendarImport.candidates.map((candidate) => {
                  const matchedNames = candidate.matchedAccountIds
                    .map((id) => accountsById.get(id)?.name)
                    .filter((value): value is string => Boolean(value));
                  const selectedAccountId = getSelectedAccountId(
                    candidate.externalEventId,
                    candidate.suggestedAccountId,
                    candidate.matchedAccountIds,
                  );
                  const selectedAccountName = selectedAccountId
                    ? accountsById.get(selectedAccountId)?.name
                    : undefined;
                  const suggestedAccountName = candidate.suggestedAccountId
                    ? accountsById.get(candidate.suggestedAccountId)?.name
                    : undefined;
                  const hasManualSelection =
                    accountSelections[candidate.externalEventId] !== undefined;

                  return (
                    <ListRow
                      key={candidate.externalEventId}
                      title={candidate.title}
                      onPress={() => {
                        setAccountPickerCandidateId(candidate.externalEventId);
                      }}
                      subtitle={formatTimestamp(candidate.scheduledFor)}
                      description={
                        matchedNames.length > 0
                          ? `${t("calendar.import.matchesLabel")}: ${matchedNames.join(", ")}`
                          : undefined
                      }
                      footnote={
                        hasManualSelection && selectedAccountName
                          ? `${t("calendar.import.selectedLabel")}: ${selectedAccountName}`
                          : !hasManualSelection && selectedAccountName
                            ? `${t("calendar.import.suggestedLabel")}: ${suggestedAccountName ?? selectedAccountName ?? t("common.unknownEntity")}`
                            : undefined
                      }
                      variant="outlined"
                    >
                      <View style={styles.importRowActions}>
                        <ActionButton
                          label={t("calendar.import.chooseAccount")}
                          onPress={() =>
                            setAccountPickerCandidateId(
                              candidate.externalEventId,
                            )
                          }
                          tone="link"
                          size="compact"
                        />
                        <PrimaryActionButton
                          label={
                            externalCalendarImport.isImporting
                              ? t("calendar.import.importing")
                              : t("calendar.import.importButton")
                          }
                          onPress={() => {
                            if (!selectedAccountId) {
                              setAccountPickerCandidateId(
                                candidate.externalEventId,
                              );
                              return;
                            }
                            void externalCalendarImport.importCandidate(
                              candidate,
                              selectedAccountId,
                            );
                          }}
                          size="compact"
                          disabled={!selectedAccountId}
                        />
                      </View>
                    </ListRow>
                  );
                })}
              </View>
            )}
            {externalCalendarImport.importError ? (
              <Text style={[styles.syncHint, { color: colors.error }]}>
                {t("calendar.import.importFailed")}
              </Text>
            ) : null}
          </FormField>
        </Section>
      ) : null}
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
      <Modal
        transparent
        animationType="fade"
        visible={accountPickerCandidate !== null}
        onRequestClose={() => setAccountPickerCandidateId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAccountPickerCandidateId(null)}
          />
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("calendar.import.accountPickerTitle")}
            </Text>
            <ScrollView style={styles.pickerList}>
              {accountPickerCandidate?.matchedAccountIds.map((accountId) => {
                const account = accountsById.get(accountId);
                if (!account) {
                  return null;
                }
                const isSelected =
                  accountSelections[accountPickerCandidate.externalEventId] ===
                  accountId;
                return (
                  <TouchableOpacity
                    key={accountId}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => {
                      setAccountSelections((prev) => ({
                        ...prev,
                        [accountPickerCandidate.externalEventId]: accountId,
                      }));
                      setAccountPickerCandidateId(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.accent },
                      ]}
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  paletteList: {
    gap: 12,
  },
  paletteCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  paletteCardPressed: {
    opacity: 0.85,
  },
  importActions: {
    gap: 8,
  },
  importList: {
    gap: 12,
    marginTop: 12,
  },
  importRowActions: {
    gap: 8,
  },
  externalCalendarList: {
    gap: 10,
  },
  externalCalendarCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  externalCalendarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  externalCalendarText: {
    flex: 1,
  },
  externalCalendarTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  externalCalendarSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  externalCalendarBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  paletteLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  swatchRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  pickerModal: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 16,
  },
});
