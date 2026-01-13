import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import type { RecurrenceRule } from "@domains/calendarEvent";
import type { Timestamp } from "@domains/shared/types";
import { t } from "@i18n/index";

import { FormField } from "./FormField";
import { SegmentedOptionGroup } from "./SegmentedOptionGroup";
import { TextField } from "./TextField";
import { useTheme } from "../hooks";

type EndMode = "never" | "until" | "count";

export type RecurrenceRulePickerProps = {
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
  startDate: Timestamp;
};

const parseInterval = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.floor(parsed);
};

const parseCount = (value: string): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
};

const parseMonthDays = (value: string): number[] => {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31)
    .map((day) => Math.floor(day));
};

const formatMonthDays = (days?: number[]): string => {
  if (!days || days.length === 0) {
    return "";
  }
  return [...days].sort((a, b) => a - b).join(", ");
};

const getBaseDate = (startDate: Timestamp): Date => {
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const buildRuleKey = (value: RecurrenceRule | null): string =>
  value ? JSON.stringify(value) : "none";

export const RecurrenceRulePicker = ({
  value,
  onChange,
  startDate,
}: RecurrenceRulePickerProps) => {
  const { colors } = useTheme();
  const baseDate = useMemo(() => getBaseDate(startDate), [startDate]);
  const baseWeekday = baseDate.getDay();
  const baseMonthDay = baseDate.getDate();

  const [enabled, setEnabled] = useState(Boolean(value));
  const [frequency, setFrequency] = useState<RecurrenceRule["frequency"]>(
    value?.frequency ?? "weekly",
  );
  const [intervalText, setIntervalText] = useState(
    value?.interval ? `${value.interval}` : "1",
  );
  const [endMode, setEndMode] = useState<EndMode>(() => {
    if (value?.until) return "until";
    if (value?.count) return "count";
    return "never";
  });
  const [untilDate, setUntilDate] = useState<Date>(() => {
    if (value?.until) {
      const parsed = new Date(value.until);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return baseDate;
  });
  const [countText, setCountText] = useState(
    value?.count ? `${value.count}` : "10",
  );
  const [weekDays, setWeekDays] = useState<number[]>(
    value?.byWeekDay ?? [baseWeekday],
  );
  const [monthDaysText, setMonthDaysText] = useState(
    formatMonthDays(value?.byMonthDay ?? [baseMonthDay]),
  );
  const [showUntilPicker, setShowUntilPicker] = useState(false);

  const syncingRef = useRef(false);
  const lastRuleKey = useRef(buildRuleKey(value));

  useEffect(() => {
    const nextKey = buildRuleKey(value);
    if (nextKey === lastRuleKey.current) {
      return;
    }

    syncingRef.current = true;
    lastRuleKey.current = nextKey;
    setEnabled(Boolean(value));
    setFrequency(value?.frequency ?? "weekly");
    setIntervalText(value?.interval ? `${value.interval}` : "1");
    setEndMode(value?.until ? "until" : value?.count ? "count" : "never");
    setUntilDate(() => {
      if (value?.until) {
        const parsed = new Date(value.until);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return baseDate;
    });
    setCountText(value?.count ? `${value.count}` : "10");
    setWeekDays(value?.byWeekDay ?? [baseWeekday]);
    setMonthDaysText(formatMonthDays(value?.byMonthDay ?? [baseMonthDay]));
  }, [value, baseDate, baseWeekday, baseMonthDay]);

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }

    if (!enabled) {
      if (value !== null) {
        onChange(null);
      }
      return;
    }

    const interval = parseInterval(intervalText);
    const count = endMode === "count" ? parseCount(countText) : undefined;
    const until = endMode === "until" ? untilDate.toISOString() : undefined;
    const nextRule: RecurrenceRule = {
      frequency,
      interval,
      ...(until && { until }),
      ...(count !== undefined && { count }),
    };

    if (frequency === "weekly") {
      nextRule.byWeekDay = weekDays.length > 0 ? weekDays : [baseWeekday];
    }

    if (frequency === "monthly") {
      const parsedDays = parseMonthDays(monthDaysText);
      nextRule.byMonthDay = parsedDays.length > 0 ? parsedDays : [baseMonthDay];
    }

    onChange(nextRule);
  }, [
    enabled,
    frequency,
    intervalText,
    endMode,
    untilDate,
    countText,
    weekDays,
    monthDaysText,
    onChange,
    value,
    baseWeekday,
    baseMonthDay,
  ]);

  const handleToggleDay = useCallback((day: number) => {
    setWeekDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  }, []);

  const openUntilPicker = useCallback(() => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: untilDate,
        mode: "date",
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === "dismissed" || !date) {
            return;
          }
          setUntilDate(date);
        },
      });
    } else {
      setShowUntilPicker((prev) => !prev);
    }
  }, [untilDate]);

  const weekDayOptions = useMemo(
    () => [
      { value: 0, label: t("calendarEvents.recurrence.weekday.sun") },
      { value: 1, label: t("calendarEvents.recurrence.weekday.mon") },
      { value: 2, label: t("calendarEvents.recurrence.weekday.tue") },
      { value: 3, label: t("calendarEvents.recurrence.weekday.wed") },
      { value: 4, label: t("calendarEvents.recurrence.weekday.thu") },
      { value: 5, label: t("calendarEvents.recurrence.weekday.fri") },
      { value: 6, label: t("calendarEvents.recurrence.weekday.sat") },
    ],
    [],
  );

  return (
    <View style={styles.container}>
      <FormField label={t("calendarEvents.recurrence.title")}>
        <SegmentedOptionGroup
          options={[
            { value: "off", label: t("calendarEvents.recurrence.off") },
            { value: "on", label: t("calendarEvents.recurrence.on") },
          ]}
          value={enabled ? "on" : "off"}
          onChange={(next) => setEnabled(next === "on")}
        />
      </FormField>

      {enabled ? (
        <>
          <FormField label={t("calendarEvents.recurrence.frequencyLabel")}>
            <SegmentedOptionGroup
              options={[
                {
                  value: "daily",
                  label: t("calendarEvents.recurrence.frequency.daily"),
                },
                {
                  value: "weekly",
                  label: t("calendarEvents.recurrence.frequency.weekly"),
                },
                {
                  value: "monthly",
                  label: t("calendarEvents.recurrence.frequency.monthly"),
                },
                {
                  value: "yearly",
                  label: t("calendarEvents.recurrence.frequency.yearly"),
                },
              ]}
              value={frequency}
              onChange={(next) =>
                setFrequency(next as RecurrenceRule["frequency"])
              }
            />
          </FormField>

          <FormField label={t("calendarEvents.recurrence.intervalLabel")}>
            <TextField
              value={intervalText}
              onChangeText={setIntervalText}
              keyboardType="numeric"
              autoCapitalize="none"
              placeholder={t("calendarEvents.recurrence.intervalPlaceholder")}
            />
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              {t("calendarEvents.recurrence.intervalHint", {
                unit: t(`calendarEvents.recurrence.frequency.${frequency}`),
              })}
            </Text>
          </FormField>

          {frequency === "weekly" ? (
            <FormField label={t("calendarEvents.recurrence.weekdaysLabel")}>
              <View style={styles.weekdayRow}>
                {weekDayOptions.map((option) => {
                  const isSelected = weekDays.includes(option.value);
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.weekdayButton,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleToggleDay(option.value)}
                    >
                      <Text
                        style={[
                          styles.weekdayLabel,
                          {
                            color: isSelected
                              ? colors.onAccent
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </FormField>
          ) : null}

          {frequency === "monthly" ? (
            <FormField
              label={t("calendarEvents.recurrence.monthDaysLabel")}
              hint={t("calendarEvents.recurrence.monthDaysHint")}
            >
              <TextField
                value={monthDaysText}
                onChangeText={setMonthDaysText}
                keyboardType="numeric"
                autoCapitalize="none"
                placeholder={t(
                  "calendarEvents.recurrence.monthDaysPlaceholder",
                )}
              />
            </FormField>
          ) : null}

          <FormField label={t("calendarEvents.recurrence.endsLabel")}>
            <SegmentedOptionGroup
              options={[
                {
                  value: "never",
                  label: t("calendarEvents.recurrence.ends.never"),
                },
                {
                  value: "until",
                  label: t("calendarEvents.recurrence.ends.onDate"),
                },
                {
                  value: "count",
                  label: t("calendarEvents.recurrence.ends.afterCount"),
                },
              ]}
              value={endMode}
              onChange={(next) => setEndMode(next as EndMode)}
            />
          </FormField>

          {endMode === "until" ? (
            <FormField label={t("calendarEvents.recurrence.ends.onDateLabel")}>
              <Pressable
                style={[
                  styles.untilButton,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
                onPress={openUntilPicker}
              >
                <Text style={[styles.untilText, { color: colors.textPrimary }]}>
                  {untilDate.toLocaleDateString()}
                </Text>
              </Pressable>
              {Platform.OS === "ios" && showUntilPicker ? (
                <DateTimePicker
                  value={untilDate}
                  mode="date"
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (event.type === "dismissed" || !date) {
                      return;
                    }
                    setUntilDate(date);
                  }}
                />
              ) : null}
            </FormField>
          ) : null}

          {endMode === "count" ? (
            <FormField label={t("calendarEvents.recurrence.ends.countLabel")}>
              <TextField
                value={countText}
                onChangeText={setCountText}
                keyboardType="numeric"
                autoCapitalize="none"
                placeholder={t(
                  "calendarEvents.recurrence.ends.countPlaceholder",
                )}
              />
            </FormField>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
  },
  weekdayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  untilButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  untilText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
