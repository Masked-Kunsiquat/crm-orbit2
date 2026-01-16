import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  type NativeMethods,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import * as Calendar from "expo-calendar";
import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Carousel, {
  type ICarouselInstance,
} from "react-native-reanimated-carousel";

import { t } from "@i18n/index";
import {
  ActionButton,
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  PrimaryActionButton,
  Section,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import { FormScrollProvider } from "../../components/FormScrollContext";
import {
  useDeviceId,
  useTheme,
  useCalendarSync,
  useConfirmDialog,
  useExternalCalendarBackgroundSync,
  useExternalCalendarSelection,
  useExternalCalendarImport,
  useExternalCalendarSync,
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
import type { Account } from "@domains/account";
import type { CalendarEventStatus } from "@domains/calendarEvent";
import {
  CALENDAR_PALETTES,
  resolveCalendarPalette,
} from "../../utils/calendarColors";
import {
  parseFloorsVisited,
  parseScore,
} from "../../utils/auditFormValidation";
import type { ExternalCalendarImportCandidate } from "../../utils/externalCalendarImport";
import type {
  ExternalCalendarImportDetails,
  ExternalCalendarImportResult,
} from "../../hooks/useExternalCalendarImport";

type AuditAlarmOption = "0" | "30" | "60" | "120" | "custom";
type ImportDraft = {
  status: CalendarEventStatus;
  scoreInput: string;
  floorsVisitedInput: string;
};

type ImportCandidateSlideProps = {
  candidate: ExternalCalendarImportCandidate;
  colors: ReturnType<typeof useTheme>["colors"];
  accountsById: Map<string, Account>;
  getSelectedAccountId: (
    candidateId: string,
    fallbackId?: string,
    matchIds?: string[],
  ) => string | undefined;
  resolveImportDraft: (candidateId: string) => ImportDraft;
  updateImportDraft: (
    candidateId: string,
    updates: Partial<ImportDraft>,
  ) => void;
  importStatusOptions: Array<{ value: CalendarEventStatus; label: string }>;
  onRequestAccountPicker: (candidateId: string) => void;
  onImportCandidate: (
    candidate: ExternalCalendarImportCandidate,
    accountId: string,
    details?: ExternalCalendarImportDetails,
  ) => Promise<ExternalCalendarImportResult>;
  onImportError: (externalEventId: string, error: string) => void;
  onClearDraft: (candidateId: string) => void;
  isImporting: boolean;
};

const ImportCandidateSlide = ({
  candidate,
  colors,
  accountsById,
  getSelectedAccountId,
  resolveImportDraft,
  updateImportDraft,
  importStatusOptions,
  onRequestAccountPicker,
  onImportCandidate,
  onImportError,
  onClearDraft,
  isImporting,
}: ImportCandidateSlideProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const basePadding = 24;
  const [keyboardPadding, setKeyboardPadding] = useState(basePadding);
  const performScrollToInput = useCallback((inputRef: TextInput | null) => {
    if (!scrollRef.current || !contentRef.current || !inputRef) {
      return;
    }
    const relativeTo = contentRef.current as unknown as number | NativeMethods;
    inputRef.measureLayout(
      relativeTo,
      (_x, y) => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - 24),
          animated: true,
        });
      },
      () => {},
    );
  }, []);
  const scheduleScroll = useCallback(
    (inputRef: TextInput | null) => {
      if (!inputRef) {
        return;
      }
      const schedule =
        globalThis.requestAnimationFrame ??
        ((cb: () => void) => globalThis.setTimeout(cb, 0));
      schedule(() => {
        performScrollToInput(inputRef);
      });
    },
    [performScrollToInput],
  );
  const scrollToInput = useCallback(
    (inputRef: TextInput | null) => {
      focusedInputRef.current = inputRef;
      scheduleScroll(inputRef);
    },
    [scheduleScroll],
  );
  const contextValue = useMemo(() => ({ scrollToInput }), [scrollToInput]);
  useEffect(() => {
    const showEvent =
      Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvent =
      Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";
    const handleShow = (event: { endCoordinates?: { height: number } }) => {
      const height = event.endCoordinates?.height ?? 0;
      const nextPadding = Math.max(
        basePadding,
        Math.min(basePadding + height, 220),
      );
      setKeyboardPadding(nextPadding);
      globalThis.setTimeout(
        () => scheduleScroll(focusedInputRef.current),
        Platform.OS === "android" ? 80 : 40,
      );
    };
    const handleHide = () => {
      setKeyboardPadding(basePadding);
    };
    const showListener = Keyboard.addListener(showEvent, handleShow);
    const hideListener = Keyboard.addListener(hideEvent, handleHide);
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [basePadding, scheduleScroll]);

  const draft = resolveImportDraft(candidate.externalEventId);
  const isCompleted = draft.status === "calendarEvent.status.completed";
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
  const scoreValue = isCompleted ? parseScore(draft.scoreInput) : undefined;
  const floorsVisited = isCompleted
    ? parseFloorsVisited(draft.floorsVisitedInput)
    : undefined;
  const scoreInvalid =
    isCompleted &&
    draft.scoreInput.trim().length > 0 &&
    scoreValue === undefined;
  const floorsInvalid =
    isCompleted &&
    draft.floorsVisitedInput.trim().length > 0 &&
    floorsVisited === undefined;
  const canImport =
    Boolean(selectedAccountId) && !scoreInvalid && !floorsInvalid;

  return (
    <FormScrollProvider value={contextValue}>
      <ScrollView
        ref={scrollRef}
        style={styles.importSlide}
        contentContainerStyle={[
          styles.importSlideScrollContent,
          { paddingBottom: keyboardPadding },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <View ref={contentRef} style={styles.importSlideContent}>
          <View style={styles.importSlideHeader}>
            <Text
              style={[styles.importSlideTitle, { color: colors.textPrimary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {candidate.title}
            </Text>
            <Text
              style={[styles.importSlideMeta, { color: colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatTimestamp(candidate.scheduledFor)}
            </Text>
            {candidate.location ? (
              <Text
                style={[
                  styles.importSlideMeta,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {candidate.location}
              </Text>
            ) : null}
          </View>

          <FormField label={t("calendarEvents.form.accountLabel")}>
            <TouchableOpacity
              style={[
                styles.importAccountButton,
                {
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              onPress={() => onRequestAccountPicker(candidate.externalEventId)}
            >
              <Text
                style={[
                  styles.importAccountText,
                  {
                    color: selectedAccountName
                      ? colors.textPrimary
                      : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedAccountName ?? t("calendar.import.chooseAccount")}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {matchedNames.length > 0 ? (
              <Text style={[styles.syncHint, { color: colors.textMuted }]}>
                {t("calendar.import.matchesLabel")}: {matchedNames.join(", ")}
              </Text>
            ) : null}
            {!selectedAccountName && suggestedAccountName ? (
              <Text style={[styles.syncHint, { color: colors.textMuted }]}>
                {t("calendar.import.suggestedLabel")}: {suggestedAccountName}
              </Text>
            ) : null}
          </FormField>

          <FormField label={t("calendarEvents.statusLabel")}>
            <SegmentedControl
              values={importStatusOptions.map((option) => option.label)}
              selectedIndex={Math.max(
                0,
                importStatusOptions.findIndex(
                  (option) => option.value === draft.status,
                ),
              )}
              onChange={(event) => {
                const nextIndex = event.nativeEvent.selectedSegmentIndex;
                const nextStatus =
                  importStatusOptions[nextIndex]?.value ??
                  importStatusOptions[0]?.value ??
                  "calendarEvent.status.scheduled";
                updateImportDraft(candidate.externalEventId, {
                  status: nextStatus as CalendarEventStatus,
                });
              }}
              tintColor={colors.accent}
              backgroundColor={colors.surface}
              fontStyle={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: "600",
              }}
              activeFontStyle={{
                color: colors.onAccent,
                fontSize: 12,
                fontWeight: "600",
              }}
              style={styles.importStatusControl}
              tabStyle={styles.importStatusTab}
              sliderStyle={{ backgroundColor: colors.accent }}
            />
          </FormField>

          {isCompleted ? (
            <View style={styles.importCompletedGrid}>
              <View style={styles.importGridItem}>
                <Text
                  style={[
                    styles.importFieldLabel,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("calendarEvents.fields.score")}
                </Text>
                <TextField
                  value={draft.scoreInput}
                  onChangeText={(value) =>
                    updateImportDraft(candidate.externalEventId, {
                      scoreInput: value,
                    })
                  }
                  placeholder={t("audits.form.scorePlaceholder")}
                  keyboardType="decimal-pad"
                />
                {scoreInvalid ? (
                  <Text
                    style={[styles.importFieldError, { color: colors.error }]}
                  >
                    {t("audits.validation.scoreInvalid")}
                  </Text>
                ) : null}
              </View>
              <View style={styles.importGridItem}>
                <Text
                  style={[
                    styles.importFieldLabel,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("calendarEvents.fields.floorsVisited")}
                </Text>
                <TextField
                  value={draft.floorsVisitedInput}
                  onChangeText={(value) =>
                    updateImportDraft(candidate.externalEventId, {
                      floorsVisitedInput: value,
                    })
                  }
                  placeholder={t("audits.form.floorsVisitedPlaceholder")}
                  autoCapitalize="none"
                />
                {floorsInvalid ? (
                  <Text
                    style={[styles.importFieldError, { color: colors.error }]}
                  >
                    {t("audits.validation.floorsInvalid")}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <PrimaryActionButton
            label={
              isImporting
                ? t("calendar.import.importing")
                : t("calendar.import.importButton")
            }
            onPress={() => {
              if (!selectedAccountId) {
                onRequestAccountPicker(candidate.externalEventId);
                return;
              }
              const shouldIncludeDetails =
                draft.status !== "calendarEvent.status.scheduled";
              const details = shouldIncludeDetails
                ? {
                    status: draft.status,
                    ...(isCompleted && scoreValue !== undefined
                      ? { score: scoreValue }
                      : {}),
                    ...(isCompleted && floorsVisited !== undefined
                      ? { floorsVisited }
                      : {}),
                    ...(isCompleted
                      ? { occurredAt: candidate.scheduledFor }
                      : {}),
                  }
                : undefined;
              void onImportCandidate(
                candidate,
                selectedAccountId,
                details,
              ).then((result) => {
                if (!result.ok) {
                  onImportError(candidate.externalEventId, result.error);
                  return;
                }
                onClearDraft(candidate.externalEventId);
              });
            }}
            size="block"
            disabled={!canImport || isImporting}
          />
        </View>
      </ScrollView>
    </FormScrollProvider>
  );
};

export const CalendarSettingsScreen = () => {
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();
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
  const [collapsedExternalGroups, setCollapsedExternalGroups] = useState<
    Record<string, boolean>
  >({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCarouselIndex, setImportCarouselIndex] = useState(0);
  const [importDrafts, setImportDrafts] = useState<Record<string, ImportDraft>>(
    {},
  );
  const importCarouselRef = useRef<ICarouselInstance | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [maxWindowHeight, setMaxWindowHeight] = useState(windowHeight);

  const toggleExternalGroup = useCallback((groupKey: string) => {
    setCollapsedExternalGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

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
  const externalCalendarBackgroundSync = useExternalCalendarBackgroundSync();
  const externalCalendarImport = useExternalCalendarImport({
    permissionGranted: permission?.granted ?? false,
    accounts,
    calendarEvents,
  });
  const externalCalendarSync = useExternalCalendarSync({
    permissionGranted: permission?.granted ?? false,
    calendarEvents,
  });
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const externalCalendars = externalCalendarSelection.calendars;
  const selectedExternalCalendarId =
    externalCalendarSelection.selectedCalendarId;
  const selectedExternalCalendar = useMemo(() => {
    if (!selectedExternalCalendarId) {
      return null;
    }
    return (
      externalCalendars.find(
        (calendar) => calendar.id === selectedExternalCalendarId,
      ) ?? null
    );
  }, [externalCalendars, selectedExternalCalendarId]);
  const unknownSourceLabel = t("common.unknown");
  const externalCalendarGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        calendars: typeof externalCalendars;
      }
    >();

    externalCalendars.forEach((calendar) => {
      const label = calendar.source?.trim() || unknownSourceLabel;
      const key = label.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.calendars.push(calendar);
      } else {
        groups.set(key, { key, label, calendars: [calendar] });
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        calendars: [...group.calendars].sort((left, right) =>
          left.title.localeCompare(right.title),
        ),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [externalCalendars, unknownSourceLabel]);

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
  const backgroundSyncOptions = [
    {
      value: "enabled",
      label: t("calendar.external.backgroundOn"),
    },
    {
      value: "disabled",
      label: t("calendar.external.backgroundOff"),
    },
  ];
  const backgroundSyncValue = externalCalendarBackgroundSync.enabled
    ? "enabled"
    : "disabled";
  const backgroundSyncStatus = externalCalendarBackgroundSync.status.lastOutcome
    ? t(
        `calendar.external.backgroundStatus.${externalCalendarBackgroundSync.status.lastOutcome}`,
      )
    : t("calendar.external.backgroundNotSynced");
  const backgroundSyncStatusMessage = externalCalendarBackgroundSync.status
    .lastRunAt
    ? t("calendar.external.backgroundLastRun", {
        time: formatTimestamp(
          externalCalendarBackgroundSync.status.lastRunAt,
          t("calendar.external.backgroundNotSynced"),
        ),
        status: backgroundSyncStatus,
      })
    : backgroundSyncStatus;
  useEffect(() => {
    if (windowHeight > maxWindowHeight) {
      setMaxWindowHeight(windowHeight);
    }
  }, [windowHeight, maxWindowHeight]);

  const modalWidth = Math.min(windowWidth * 0.9, 520);
  const carouselWidth = Math.max(0, modalWidth - 32);
  const carouselHeight = Math.min(maxWindowHeight * 0.7, 560);

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
  const accountPickerCandidateExternalId =
    accountPickerCandidate?.externalEventId ?? null;
  const accountIdsToShow = accountPickerCandidate?.matchedAccountIds?.length
    ? accountPickerCandidate.matchedAccountIds
    : Array.from(accountsById.keys());

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
  const resolveImportDraft = useCallback(
    (candidateId: string): ImportDraft => {
      const draft = importDrafts[candidateId];
      if (draft) {
        return draft;
      }
      return {
        status: "calendarEvent.status.scheduled",
        scoreInput: "",
        floorsVisitedInput: "",
      };
    },
    [importDrafts],
  );
  const updateImportDraft = useCallback(
    (candidateId: string, updates: Partial<ImportDraft>) => {
      setImportDrafts((prev) => ({
        ...prev,
        [candidateId]: {
          ...resolveImportDraft(candidateId),
          ...updates,
        },
      }));
    },
    [resolveImportDraft],
  );
  const clearImportDraft = useCallback((candidateId: string) => {
    setImportDrafts((prev) => {
      const next = { ...prev };
      delete next[candidateId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isImportModalOpen) {
      return;
    }
    const count = externalCalendarImport.candidates.length;
    if (count === 0) {
      setIsImportModalOpen(false);
      setImportCarouselIndex(0);
      return;
    }
    const nextIndex = Math.min(importCarouselIndex, count - 1);
    if (nextIndex !== importCarouselIndex) {
      setImportCarouselIndex(nextIndex);
      return;
    }
    const currentIndex = importCarouselRef.current?.getCurrentIndex();
    if (currentIndex !== undefined && currentIndex !== nextIndex) {
      importCarouselRef.current?.scrollTo({
        index: nextIndex,
        animated: false,
      });
    }
  }, [
    externalCalendarImport.candidates.length,
    importCarouselIndex,
    isImportModalOpen,
  ]);
  const renderImportSlide = ({
    item,
  }: {
    item: ExternalCalendarImportCandidate;
  }) => {
    const importStatusOptions = [
      {
        value: "calendarEvent.status.scheduled" as CalendarEventStatus,
        label: t("calendarEvent.status.scheduled"),
      },
      {
        value: "calendarEvent.status.completed" as CalendarEventStatus,
        label: t("calendarEvent.status.completed"),
      },
      {
        value: "calendarEvent.status.canceled" as CalendarEventStatus,
        label: t("calendarEvent.status.canceled"),
      },
    ];

    return (
      <ImportCandidateSlide
        candidate={item}
        colors={colors}
        accountsById={accountsById}
        getSelectedAccountId={getSelectedAccountId}
        resolveImportDraft={resolveImportDraft}
        updateImportDraft={updateImportDraft}
        importStatusOptions={importStatusOptions}
        onRequestAccountPicker={setAccountPickerCandidateId}
        onImportCandidate={externalCalendarImport.importCandidate}
        onImportError={(externalEventId, error) => {
          showAlert(
            t("common.error"),
            `${t("calendar.import.importFailed")} (${externalEventId}: ${error})`,
            t("common.ok"),
          );
        }}
        onClearDraft={clearImportDraft}
        isImporting={externalCalendarImport.isImporting}
      />
    );
  };

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
          <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
            {t("calendar.external.hint")}
          </Text>
          <FormField
            label={t("calendar.external.label")}
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
              <View style={styles.externalCalendarGroups}>
                {selectedExternalCalendar ? (
                  <View
                    style={[
                      styles.externalCalendarSelectedCard,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.surfaceElevated,
                      },
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
                          {selectedExternalCalendar.title}
                        </Text>
                        {selectedExternalCalendar.source ? (
                          <Text
                            style={[
                              styles.externalCalendarSubtitle,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {selectedExternalCalendar.source}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.externalCalendarBadge,
                          { color: colors.accent },
                        ]}
                      >
                        {t("calendar.external.selected")}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {externalCalendarGroups.map((group) => {
                  const isCollapsed =
                    collapsedExternalGroups[group.key] ?? true;
                  return (
                    <View key={group.key} style={styles.externalCalendarGroup}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: !isCollapsed }}
                        onPress={() => toggleExternalGroup(group.key)}
                        style={({ pressed }) => [
                          styles.externalCalendarGroupHeader,
                          pressed && styles.paletteCardPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.externalCalendarGroupTitle,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {group.label}
                        </Text>
                        <View style={styles.externalCalendarGroupMeta}>
                          <Text
                            style={[
                              styles.externalCalendarGroupCount,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {group.calendars.length}
                          </Text>
                          <Ionicons
                            name={isCollapsed ? "chevron-down" : "chevron-up"}
                            size={18}
                            color={colors.textSecondary}
                          />
                        </View>
                      </Pressable>
                      {isCollapsed ? null : (
                        <View style={styles.externalCalendarList}>
                          {group.calendars.map((calendar) => {
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
                    </View>
                  );
                })}
              </View>
            )}
          </FormField>
          <FormField
            label={t("calendar.external.syncLabel")}
            hint={t("calendar.external.syncHint")}
          >
            <View style={styles.importActions}>
              <PrimaryActionButton
                label={
                  externalCalendarSync.isSyncing
                    ? t("calendar.external.syncing")
                    : t("calendar.external.syncButton")
                }
                onPress={() => {
                  void externalCalendarSync.syncLinkedEvents();
                }}
                size="compact"
                disabled={externalCalendarSync.isSyncing}
              />
              {externalCalendarSync.syncError ? (
                <Text style={[styles.syncHint, { color: colors.error }]}>
                  {externalCalendarSync.syncError === "permissionDenied"
                    ? t("calendar.import.permissionRequired")
                    : externalCalendarSync.syncError === "calendarNotSelected"
                      ? t("calendar.import.selectCalendar")
                      : t("calendar.sync.error")}
                </Text>
              ) : null}
              {externalCalendarSync.syncSummary ? (
                <Text
                  style={[styles.syncHint, { color: colors.textSecondary }]}
                >
                  {t("calendar.external.syncSummary", {
                    externalToCrm:
                      externalCalendarSync.syncSummary.externalToCrm,
                    crmToExternal:
                      externalCalendarSync.syncSummary.crmToExternal,
                    unchanged: externalCalendarSync.syncSummary.unchanged,
                    errors: externalCalendarSync.syncSummary.errors,
                  })}
                </Text>
              ) : null}
            </View>
          </FormField>
          <FormField
            label={t("calendar.external.backgroundLabel")}
            hint={t("calendar.external.backgroundHint")}
          >
            <View style={styles.importActions}>
              <SegmentedOptionGroup
                options={backgroundSyncOptions}
                value={backgroundSyncValue}
                onChange={(value) => {
                  void externalCalendarBackgroundSync.toggleEnabled(
                    value === "enabled",
                  );
                }}
              />
              {externalCalendarBackgroundSync.hasError ? (
                <Text style={[styles.syncHint, { color: colors.error }]}>
                  {t("calendar.external.backgroundToggleError")}
                </Text>
              ) : null}
              <Text style={[styles.syncHint, { color: colors.textSecondary }]}>
                {backgroundSyncStatusMessage}
              </Text>
            </View>
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
            ) : externalCalendarImport.candidates.length > 0 ? (
              <View
                style={[
                  styles.importReviewCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[styles.syncHint, { color: colors.textSecondary }]}
                >
                  {t("calendar.import.reviewHint", {
                    count: externalCalendarImport.candidates.length,
                  })}
                </Text>
                <PrimaryActionButton
                  label={t("calendar.import.reviewButton", {
                    count: externalCalendarImport.candidates.length,
                  })}
                  onPress={() => {
                    setImportCarouselIndex(0);
                    setIsImportModalOpen(true);
                  }}
                  size="compact"
                  disabled={externalCalendarImport.isImporting}
                />
              </View>
            ) : null}
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
        visible={isImportModalOpen}
        onRequestClose={() => setIsImportModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsImportModalOpen(false)}
          />
          <KeyboardAvoidingView
            enabled={Platform.OS === "ios"}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <View
              style={[
                styles.importModal,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  width: modalWidth,
                },
              ]}
            >
              <View style={styles.importModalHeader}>
                <Text
                  style={[
                    styles.importModalTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("calendar.import.title")}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsImportModalOpen(false)}
                  style={styles.importModalClose}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.importModalSubtitle,
                  { color: colors.textMuted },
                ]}
              >
                {t("calendar.import.progress", {
                  current: Math.min(
                    importCarouselIndex + 1,
                    externalCalendarImport.candidates.length || 0,
                  ),
                  total: externalCalendarImport.candidates.length,
                })}
              </Text>
              <Carousel
                ref={importCarouselRef}
                width={carouselWidth}
                height={carouselHeight}
                data={externalCalendarImport.candidates}
                onSnapToItem={setImportCarouselIndex}
                renderItem={renderImportSlide}
                enabled={externalCalendarImport.candidates.length > 1}
                style={styles.importCarousel}
                defaultIndex={0}
              />
              {externalCalendarImport.importError ? (
                <Text style={[styles.syncHint, { color: colors.error }]}>
                  {t("calendar.import.importFailed")}
                </Text>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
              {accountIdsToShow.length === 0 ? (
                <Text style={[styles.pickerEmpty, { color: colors.textMuted }]}>
                  {t("calendarEvents.form.accountEmptyHint")}
                </Text>
              ) : (
                accountIdsToShow.map((accountId) => {
                  const account = accountsById.get(accountId);
                  if (!account || !accountPickerCandidateExternalId) {
                    return null;
                  }
                  const isSelected =
                    accountSelections[accountPickerCandidateExternalId] ===
                    accountId;
                  return (
                    <TouchableOpacity
                      key={accountId}
                      style={[
                        styles.pickerItem,
                        { borderBottomColor: colors.borderLight },
                        isSelected && {
                          backgroundColor: colors.surfaceElevated,
                        },
                      ]}
                      onPress={() => {
                        setAccountSelections((prev) => ({
                          ...prev,
                          [accountPickerCandidateExternalId]: accountId,
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
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
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
  importReviewCard: {
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  importModal: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: "90%",
    maxWidth: 520,
    maxHeight: "85%",
    alignSelf: "center",
    overflow: "hidden",
  },
  importModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  importModalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  importModalClose: {
    padding: 4,
  },
  importModalSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  importCarousel: {
    alignSelf: "center",
  },
  importSlide: {
    flex: 1,
    width: "100%",
  },
  importSlideScrollContent: {},
  importSlideContent: {
    gap: 12,
    paddingHorizontal: 0,
  },
  importSlideHeader: {
    gap: 4,
    paddingHorizontal: 0,
  },
  importSlideTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    flexShrink: 1,
  },
  importSlideMeta: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  importCompletedGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 12,
  },
  importGridItem: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  importFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  importFieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  importAccountButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  importAccountText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  importStatusControl: {
    height: 36,
  },
  importStatusTab: {
    paddingVertical: 6,
  },
  externalCalendarList: {
    gap: 10,
  },
  externalCalendarGroups: {
    gap: 16,
  },
  externalCalendarSelectedCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  externalCalendarGroup: {
    gap: 10,
  },
  externalCalendarGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  externalCalendarGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  externalCalendarGroupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  externalCalendarGroupCount: {
    fontSize: 12,
    fontWeight: "600",
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
  modalKeyboard: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
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
  pickerEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
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
