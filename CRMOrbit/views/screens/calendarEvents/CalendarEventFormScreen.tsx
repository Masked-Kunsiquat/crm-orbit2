import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useCalendarEvent, useAccounts } from "../../store/store";
import { useDeviceId, useCalendarEventActions } from "../../hooks";
import type {
  CalendarEventType,
  CalendarEventStatus,
  RecurrenceRule,
} from "../../../domains/calendarEvent";
import { nextId } from "../../../domains/shared/idGenerator";
import {
  FormField,
  FormScreenLayout,
  TextField,
  ConfirmDialog,
  SegmentedOptionGroup,
  RecurrenceRulePicker,
} from "../../components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useTheme } from "../../hooks";
import {
  formatDurationLabel,
  parseDurationMinutes,
  splitDurationMinutes,
} from "../../utils/duration";
import { buildTimestampFromDate } from "../../utils/date";
import {
  parseScore,
  parseFloorsVisited,
  areFloorsEqual,
} from "../../utils/auditFormValidation";
import type { EventsStackScreenProps } from "../../navigation/types";
import type { EntityId } from "../../../domains/shared/types";

const CALENDAR_EVENT_TYPES: Array<{
  label: string;
  value: CalendarEventType;
}> = [
  { label: "calendarEvent.type.meeting", value: "meeting" },
  { label: "calendarEvent.type.call", value: "call" },
  { label: "calendarEvent.type.email", value: "email" },
  { label: "calendarEvent.type.audit", value: "audit" },
  { label: "calendarEvent.type.task", value: "task" },
  { label: "calendarEvent.type.other", value: "other" },
];

type DurationPreset = "30" | "60" | "120" | "240" | "custom";

const DURATION_PRESETS: DurationPreset[] = ["30", "60", "120", "240"];

const DEFAULT_DURATION_BY_TYPE: Record<CalendarEventType, number | undefined> =
  {
    call: 15,
    meeting: 30,
    email: undefined,
    audit: 60,
    task: 30,
    reminder: undefined,
    other: undefined,
  };

const normalizeRecurrenceRule = (
  rule?: RecurrenceRule | null,
): RecurrenceRule | null => {
  if (!rule) return null;

  const interval =
    Number.isFinite(rule.interval) && rule.interval > 0
      ? Math.floor(rule.interval)
      : 1;

  const normalized: RecurrenceRule = {
    frequency: rule.frequency,
    interval,
  };

  if (rule.until) {
    const parsed = new Date(rule.until);
    if (!Number.isNaN(parsed.getTime())) {
      normalized.until = parsed.toISOString();
    }
  }

  if (rule.count && rule.count > 0) {
    normalized.count = Math.floor(rule.count);
  }

  if (rule.byWeekDay && rule.byWeekDay.length > 0) {
    normalized.byWeekDay = Array.from(
      new Set(rule.byWeekDay.filter((day) => day >= 0 && day <= 6)),
    ).sort((a, b) => a - b);
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    normalized.byMonthDay = Array.from(
      new Set(rule.byMonthDay.filter((day) => day >= 1 && day <= 31)),
    ).sort((a, b) => a - b);
  }

  return normalized;
};

const areRecurrenceRulesEqual = (
  left?: RecurrenceRule | null,
  right?: RecurrenceRule | null,
): boolean => {
  const normalizedLeft = normalizeRecurrenceRule(left);
  const normalizedRight = normalizeRecurrenceRule(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
};

type Props = EventsStackScreenProps<"CalendarEventForm">;

export const CalendarEventFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const {
    calendarEventId,
    entityToLink,
    accountId: prefillAccountId,
    prefillDate,
    prefillType,
  } = route.params ?? {};
  const initialTimestamp = useMemo(
    () => buildTimestampFromDate(prefillDate),
    [prefillDate],
  );
  const calendarEvent = useCalendarEvent(calendarEventId ?? "");
  const accounts = useAccounts();
  const {
    scheduleCalendarEvent,
    updateCalendarEvent,
    completeCalendarEvent,
    cancelCalendarEvent,
    rescheduleCalendarEvent,
    addRecurrenceRule,
    updateRecurrenceRule,
    deleteRecurrenceRule,
  } = useCalendarEventActions(deviceId);
  const { dialogProps, showAlert } = useConfirmDialog();

  // Form state
  const [type, setType] = useState<CalendarEventType>(prefillType ?? "meeting");
  const [status, setStatus] = useState<CalendarEventStatus>(
    "calendarEvent.status.scheduled",
  );
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<DurationPreset>("custom");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutesInput, setDurationMinutesInput] = useState("");
  const [durationTouched, setDurationTouched] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(() => initialTimestamp);
  const [occurredAt, setOccurredAt] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    null,
  );

  // Audit-specific fields
  const [accountId, setAccountId] = useState(prefillAccountId ?? "");
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [score, setScore] = useState("");
  const [floorsVisitedInput, setFloorsVisitedInput] = useState("");

  const didInitDefaults = useRef(false);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [accounts]);

  const applyDurationMinutes = useCallback((durationMinutes?: number) => {
    if (!durationMinutes) {
      setDurationHours("");
      setDurationMinutesInput("");
      setDurationPreset("custom");
      return;
    }
    const { hours, minutes } = splitDurationMinutes(durationMinutes);
    setDurationHours(hours ? `${hours}` : "");
    setDurationMinutesInput(minutes ? `${minutes}` : "");
    const preset = DURATION_PRESETS.find(
      (value) => Number(value) === durationMinutes,
    );
    setDurationPreset(preset ?? "custom");
  }, []);

  // Initialize form from existing event or defaults
  useEffect(() => {
    if (calendarEvent) {
      setType(calendarEvent.type);
      setStatus(calendarEvent.status);
      setSummary(calendarEvent.summary);
      setDescription(calendarEvent.description ?? "");
      setLocation(calendarEvent.location ?? "");
      setScheduledFor(calendarEvent.scheduledFor);
      setOccurredAt(calendarEvent.occurredAt ?? "");
      setRecurrenceRule(calendarEvent.recurrenceRule ?? null);
      applyDurationMinutes(calendarEvent.durationMinutes);
      setDurationTouched(true);

      // Audit-specific
      if (calendarEvent.auditData) {
        setAccountId(calendarEvent.auditData.accountId);
        setScore(
          calendarEvent.auditData.score !== undefined
            ? `${calendarEvent.auditData.score}`
            : "",
        );
        setFloorsVisitedInput(
          calendarEvent.auditData.floorsVisited?.join(", ") ?? "",
        );
      }

      didInitDefaults.current = true;
      return;
    }

    if (didInitDefaults.current) {
      return;
    }

    // Set defaults for new event
    setScheduledFor(initialTimestamp);
    setStatus("calendarEvent.status.scheduled");
    applyDurationMinutes(DEFAULT_DURATION_BY_TYPE[type]);
    setDurationTouched(false);
    setRecurrenceRule(null);
    didInitDefaults.current = true;
  }, [applyDurationMinutes, calendarEvent, type, initialTimestamp]);

  // Update default duration when type changes
  useEffect(() => {
    if (calendarEvent || durationTouched) {
      return;
    }
    applyDurationMinutes(DEFAULT_DURATION_BY_TYPE[type]);
  }, [applyDurationMinutes, durationTouched, calendarEvent, type]);

  const timestampLabel = useMemo(() => {
    const ts =
      status === "calendarEvent.status.completed" ? occurredAt : scheduledFor;
    if (!ts) {
      return t("common.unknown");
    }
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) {
      return t("common.unknown");
    }
    return date.toLocaleString();
  }, [occurredAt, scheduledFor, status]);

  const getResolvedDate = useCallback(() => {
    const ts =
      status === "calendarEvent.status.completed" ? occurredAt : scheduledFor;
    if (!ts) {
      return new Date();
    }
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }, [occurredAt, scheduledFor, status]);

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      return;
    }

    if (date) {
      const nextTimestamp = date.toISOString();
      if (status === "calendarEvent.status.completed") {
        setOccurredAt(nextTimestamp);
      } else {
        setScheduledFor(nextTimestamp);
      }
    }
  };

  const openAndroidPicker = useCallback(() => {
    const currentDate = getResolvedDate();
    DateTimePickerAndroid.open({
      mode: "date",
      value: currentDate,
      onChange: (event, date) => {
        if (event.type !== "set" || !date) {
          return;
        }

        const nextDate = new Date(currentDate);
        nextDate.setFullYear(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );

        DateTimePickerAndroid.open({
          mode: "time",
          value: nextDate,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== "set" || !time) {
              return;
            }

            const finalDate = new Date(nextDate);
            finalDate.setHours(
              time.getHours(),
              time.getMinutes(),
              time.getSeconds(),
              time.getMilliseconds(),
            );
            const nextTimestamp = finalDate.toISOString();
            if (status === "calendarEvent.status.completed") {
              setOccurredAt(nextTimestamp);
            } else {
              setScheduledFor(nextTimestamp);
            }
          },
        });
      },
    });
  }, [getResolvedDate, status]);

  const handleStatusChange = (value: CalendarEventStatus) => {
    setStatus(value);
    if (value === "calendarEvent.status.completed") {
      if (!occurredAt) {
        setOccurredAt(scheduledFor || new Date().toISOString());
      }
      return;
    }

    if (!scheduledFor) {
      setScheduledFor(occurredAt || new Date().toISOString());
    }
  };

  const handleDurationPresetChange = (value: DurationPreset) => {
    setDurationPreset(value);
    setDurationTouched(true);
    if (value === "custom") {
      return;
    }
    const minutes = Number(value);
    const { hours, minutes: remainder } = splitDurationMinutes(minutes);
    setDurationHours(hours ? `${hours}` : "");
    setDurationMinutesInput(remainder ? `${remainder}` : "");
  };

  const handleSave = () => {
    // Validate summary
    if (!summary.trim()) {
      showAlert(
        t("common.error"),
        t("calendarEvents.validation.summaryRequired"),
        t("common.ok"),
      );
      return;
    }

    // Validate scheduled timestamp
    if (!scheduledFor) {
      showAlert(
        t("common.error"),
        t("calendarEvents.validation.scheduledForRequired"),
        t("common.ok"),
      );
      return;
    }

    // Validate duration
    const durationValue = parseDurationMinutes(
      durationHours,
      durationMinutesInput,
    );
    if (
      durationValue === null ||
      (durationValue !== undefined && durationValue <= 0)
    ) {
      showAlert(
        t("common.error"),
        t("calendarEvents.validation.durationInvalid"),
        t("common.ok"),
      );
      return;
    }

    const trimmedAccountId = accountId.trim();
    const scoreValue = type === "audit" ? parseScore(score) : undefined;
    const floorsVisited =
      type === "audit" ? parseFloorsVisited(floorsVisitedInput) : undefined;

    // Audit-specific validation
    if (type === "audit") {
      if (!trimmedAccountId) {
        showAlert(
          t("common.error"),
          t("calendarEvents.validation.accountRequired"),
          t("common.ok"),
        );
        return;
      }

      if (score.trim() && scoreValue === undefined) {
        showAlert(
          t("common.error"),
          t("calendarEvents.validation.scoreInvalid"),
          t("common.ok"),
        );
        return;
      }

      if (floorsVisitedInput.trim() && !floorsVisited) {
        showAlert(
          t("common.error"),
          t("calendarEvents.validation.floorsInvalid"),
          t("common.ok"),
        );
        return;
      }
    }

    const trimmedSummary = summary.trim();
    const trimmedDescription = description.trim() || undefined;
    const trimmedLocation = location.trim() || undefined;
    const normalizedRecurrenceRule = normalizeRecurrenceRule(recurrenceRule);

    if (calendarEventId) {
      // Update existing event
      const updateFields: Parameters<typeof updateCalendarEvent>[1] = {};
      let hasChanges = false;

      if (calendarEvent?.type !== type) {
        updateFields.type = type;
        hasChanges = true;
      }
      if (calendarEvent?.summary !== trimmedSummary) {
        updateFields.summary = trimmedSummary;
        hasChanges = true;
      }
      if (calendarEvent?.description !== trimmedDescription) {
        updateFields.description = trimmedDescription;
        hasChanges = true;
      }
      if (calendarEvent?.location !== trimmedLocation) {
        updateFields.location = trimmedLocation;
        hasChanges = true;
      }
      if (calendarEvent?.durationMinutes !== durationValue) {
        updateFields.durationMinutes = durationValue;
        hasChanges = true;
      }

      if (type === "audit") {
        const auditUpdates: NonNullable<
          Parameters<typeof updateCalendarEvent>[1]["auditData"]
        > = {};
        let hasAuditChanges = false;

        if (calendarEvent?.auditData?.accountId !== trimmedAccountId) {
          auditUpdates.accountId = trimmedAccountId as EntityId;
          hasAuditChanges = true;
        }

        if (status === "calendarEvent.status.completed") {
          if (calendarEvent?.auditData?.score !== scoreValue) {
            auditUpdates.score = scoreValue;
            hasAuditChanges = true;
          }
          if (
            !areFloorsEqual(
              calendarEvent?.auditData?.floorsVisited,
              floorsVisited,
            )
          ) {
            auditUpdates.floorsVisited = floorsVisited;
            hasAuditChanges = true;
          }
        }

        if (hasAuditChanges) {
          updateFields.auditData = auditUpdates;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const result = updateCalendarEvent(calendarEventId, updateFields);
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error || t("calendarEvents.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      // Handle status changes
      if (calendarEvent?.status !== status) {
        if (status === "calendarEvent.status.completed") {
          const occurredAtValue = occurredAt || scheduledFor;

          const result = completeCalendarEvent(
            calendarEventId,
            occurredAtValue,
            {
              description: trimmedDescription,
              ...(type === "audit" && {
                accountId: trimmedAccountId as EntityId,
              }),
              ...(scoreValue !== undefined && { score: scoreValue }),
              ...(floorsVisited !== undefined && { floorsVisited }),
            },
          );
          if (!result.success) {
            showAlert(
              t("common.error"),
              result.error || t("calendarEvents.updateError"),
              t("common.ok"),
            );
            return;
          }
        } else if (status === "calendarEvent.status.canceled") {
          const result = cancelCalendarEvent(calendarEventId, {
            ...(type === "audit" && {
              accountId: trimmedAccountId as EntityId,
            }),
            ...(scoreValue !== undefined && { score: scoreValue }),
            ...(floorsVisited !== undefined && { floorsVisited }),
          });
          if (!result.success) {
            showAlert(
              t("common.error"),
              result.error || t("calendarEvents.updateError"),
              t("common.ok"),
            );
            return;
          }
        }
      }

      // Handle rescheduling
      if (
        status === "calendarEvent.status.scheduled" &&
        (calendarEvent?.scheduledFor !== scheduledFor ||
          calendarEvent?.status !== "calendarEvent.status.scheduled")
      ) {
        const result = rescheduleCalendarEvent(calendarEventId, scheduledFor);
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error || t("calendarEvents.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      const existingRecurrenceRule = normalizeRecurrenceRule(
        calendarEvent?.recurrenceRule,
      );
      if (
        !areRecurrenceRulesEqual(
          existingRecurrenceRule,
          normalizedRecurrenceRule,
        )
      ) {
        const recurrenceResult = existingRecurrenceRule
          ? normalizedRecurrenceRule
            ? updateRecurrenceRule(calendarEventId, normalizedRecurrenceRule)
            : deleteRecurrenceRule(calendarEventId)
          : normalizedRecurrenceRule
            ? addRecurrenceRule(calendarEventId, normalizedRecurrenceRule)
            : undefined;

        if (recurrenceResult && !recurrenceResult.success) {
          showAlert(
            t("common.error"),
            recurrenceResult.error || t("calendarEvents.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      navigation.goBack();
    } else {
      // Create new event
      const newCalendarEventId = nextId("calendarEvent");
      const linkedEntities = entityToLink
        ? [
            {
              entityType: entityToLink.entityType,
              entityId: entityToLink.entityId,
            },
          ]
        : undefined;

      const result = scheduleCalendarEvent(type, trimmedSummary, scheduledFor, {
        durationMinutes: durationValue,
        description: trimmedDescription,
        location: trimmedLocation,
        ...(type === "audit" && { accountId: trimmedAccountId as EntityId }),
        linkedEntities,
        ...(normalizedRecurrenceRule && {
          recurrenceRule: normalizedRecurrenceRule,
        }),
        calendarEventId: newCalendarEventId,
      });

      if (result.success) {
        // If status is completed, complete the event
        if (status === "calendarEvent.status.completed") {
          const occurredAtValue = occurredAt || scheduledFor;

          const completeResult = completeCalendarEvent(
            newCalendarEventId,
            occurredAtValue,
            {
              description: trimmedDescription,
              ...(type === "audit" && {
                accountId: trimmedAccountId as EntityId,
              }),
              ...(scoreValue !== undefined && { score: scoreValue }),
              ...(floorsVisited !== undefined && { floorsVisited }),
            },
          );
          if (!completeResult.success) {
            showAlert(
              t("common.error"),
              completeResult.error || t("calendarEvents.updateError"),
              t("common.ok"),
            );
            return;
          }
        }

        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("calendarEvents.createError"),
          t("common.ok"),
        );
      }
    }
  };

  const durationOptions: Array<{ label: string; value: DurationPreset }> = [
    ...DURATION_PRESETS.map((value) => ({
      label: formatDurationLabel(Number(value)),
      value,
    })),
    { label: t("common.custom"), value: "custom" },
  ];

  const isAudit = type === "audit";

  return (
    <FormScreenLayout>
      <ScrollView style={styles.container}>
        <FormField label={t("calendarEvents.form.typeLabel")}>
          <SegmentedOptionGroup
            options={CALENDAR_EVENT_TYPES.map((item) => ({
              label: t(item.label),
              value: item.value,
            }))}
            value={type}
            onChange={(value) => setType(value as CalendarEventType)}
          />
        </FormField>

        {isAudit ? (
          <FormField label={`${t("calendarEvents.form.accountLabel")} *`}>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => setIsAccountPickerOpen(true)}
            >
              <Text
                style={[styles.pickerButtonText, { color: colors.textPrimary }]}
              >
                {sortedAccounts.find((account) => account.id === accountId)
                  ?.name ?? t("calendarEvents.form.accountPlaceholder")}
              </Text>
              <Text
                style={[styles.pickerChevron, { color: colors.textSecondary }]}
              >
                ▼
              </Text>
            </TouchableOpacity>
          </FormField>
        ) : null}

        <FormField label={t("calendarEvents.form.statusLabel")}>
          <SegmentedOptionGroup
            options={[
              {
                value: "calendarEvent.status.scheduled",
                label: t("calendarEvent.status.scheduled"),
              },
              {
                value: "calendarEvent.status.completed",
                label: t("calendarEvent.status.completed"),
              },
              ...(calendarEventId
                ? [
                    {
                      value: "calendarEvent.status.canceled",
                      label: t("calendarEvent.status.canceled"),
                    },
                  ]
                : []),
            ]}
            value={status}
            onChange={(value) =>
              handleStatusChange(value as CalendarEventStatus)
            }
          />
        </FormField>

        <FormField
          label={
            status === "calendarEvent.status.completed"
              ? t("calendarEvents.form.occurredAtLabel")
              : t("calendarEvents.form.scheduledForLabel")
          }
        >
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              onPress={() => {
                if (Platform.OS === "android") {
                  openAndroidPicker();
                } else {
                  setShowPicker((prev) => !prev);
                }
              }}
            >
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {timestampLabel}
              </Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === "ios" && showPicker ? (
            <DateTimePicker
              value={getResolvedDate()}
              mode="datetime"
              onChange={handlePickerChange}
            />
          ) : null}
        </FormField>

        <FormField
          label={t("calendarEvents.form.durationLabel")}
          hint={t("calendarEvents.form.durationHint")}
        >
          <SegmentedOptionGroup
            options={durationOptions}
            value={durationPreset}
            onChange={handleDurationPresetChange}
          />
          <View style={styles.durationInputs}>
            <View style={styles.durationField}>
              <Text
                style={[styles.durationLabel, { color: colors.textSecondary }]}
              >
                {t("common.duration.hoursLabel")}
              </Text>
              <TextField
                value={durationHours}
                onChangeText={(value) => {
                  setDurationHours(value);
                  setDurationPreset("custom");
                  setDurationTouched(true);
                }}
                placeholder={t("common.duration.hoursPlaceholder")}
                keyboardType="numeric"
                autoCapitalize="none"
                style={styles.durationInput}
              />
            </View>
            <View style={styles.durationField}>
              <Text
                style={[styles.durationLabel, { color: colors.textSecondary }]}
              >
                {t("common.duration.minutesLabel")}
              </Text>
              <TextField
                value={durationMinutesInput}
                onChangeText={(value) => {
                  setDurationMinutesInput(value);
                  setDurationPreset("custom");
                  setDurationTouched(true);
                }}
                placeholder={t("common.duration.minutesPlaceholder")}
                keyboardType="numeric"
                autoCapitalize="none"
                style={styles.durationInput}
              />
            </View>
          </View>
        </FormField>

        <RecurrenceRulePicker
          value={recurrenceRule}
          onChange={setRecurrenceRule}
          startDate={scheduledFor}
        />

        <FormField label={t("calendarEvents.form.summaryLabel")}>
          <TextField
            value={summary}
            onChangeText={setSummary}
            placeholder={t("calendarEvents.form.summaryPlaceholder")}
            multiline
            numberOfLines={2}
          />
        </FormField>

        <FormField label={t("calendarEvents.form.descriptionLabel")}>
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder={t("calendarEvents.form.descriptionPlaceholder")}
            multiline
            numberOfLines={4}
            style={styles.descriptionInput}
          />
        </FormField>

        {!isAudit ? (
          <FormField label={t("calendarEvents.form.locationLabel")}>
            <TextField
              value={location}
              onChangeText={setLocation}
              placeholder={t("calendarEvents.form.locationPlaceholder")}
            />
          </FormField>
        ) : null}

        {isAudit && status === "calendarEvent.status.completed" ? (
          <>
            <FormField label={t("calendarEvents.form.scoreLabel")}>
              <TextField
                value={score}
                onChangeText={setScore}
                placeholder={t("calendarEvents.form.scorePlaceholder")}
                keyboardType="decimal-pad"
              />
            </FormField>

            <FormField label={t("calendarEvents.form.floorsVisitedLabel")}>
              <TextField
                value={floorsVisitedInput}
                onChangeText={setFloorsVisitedInput}
                placeholder={t("calendarEvents.form.floorsVisitedPlaceholder")}
                autoCapitalize="none"
              />
            </FormField>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
            {calendarEventId
              ? t("calendarEvents.form.updateButton")
              : t("calendarEvents.form.createButton")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Account Picker Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={isAccountPickerOpen}
        onRequestClose={() => setIsAccountPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsAccountPickerOpen(false)}
          />
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("calendarEvents.form.accountPickerTitle")}
            </Text>
            <ScrollView style={styles.pickerList}>
              {sortedAccounts.length === 0 ? (
                <Text
                  style={[
                    styles.emptyAccounts,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("calendarEvents.form.accountEmptyHint")}
                </Text>
              ) : (
                sortedAccounts.map((account) => {
                  const isSelected = account.id === accountId;
                  return (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.pickerItem,
                        { borderBottomColor: colors.borderLight },
                        isSelected && {
                          backgroundColor: colors.surfaceElevated,
                        },
                      ]}
                      onPress={() => {
                        setAccountId(account.id);
                        setIsAccountPickerOpen(false);
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
  container: {
    flex: 1,
  },
  dateRow: {
    marginTop: 8,
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
  },
  durationInputs: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
  },
  durationField: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  durationInput: {
    minHeight: 44,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerChevron: {
    fontSize: 12,
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
  emptyAccounts: {
    padding: 16,
    fontSize: 14,
    textAlign: "center",
  },
});
