import { useCallback, useState, useEffect, useMemo } from "react";
import {
  Platform,
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

import { useInteraction } from "../../store/store";
import {
  useDeviceId,
  useEntityLinkActions,
  useInteractionActions,
} from "../../hooks";
import type {
  InteractionStatus,
  InteractionType,
} from "../../../domains/interaction";
import type { EntityLinkType } from "../../../domains/relations/entityLink";
import { nextId } from "../../../domains/shared/idGenerator";
import {
  FormField,
  FormScreenLayout,
  TextField,
  ConfirmDialog,
  SegmentedOptionGroup,
} from "../../components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useTheme } from "../../hooks";
import {
  formatDurationLabel,
  parseDurationMinutes,
  splitDurationMinutes,
} from "../../utils/duration";

const INTERACTION_TYPES: Array<{ label: string; value: InteractionType }> = [
  { label: "interaction.type.call", value: "interaction.type.call" },
  { label: "interaction.type.email", value: "interaction.type.email" },
  { label: "interaction.type.meeting", value: "interaction.type.meeting" },
  { label: "interaction.type.other", value: "interaction.type.other" },
];

type DurationPreset = "30" | "60" | "120" | "240" | "custom";

const DURATION_PRESETS: DurationPreset[] = ["30", "60", "120", "240"];

const DEFAULT_DURATION_BY_TYPE: Record<InteractionType, number | undefined> = {
  "interaction.type.call": 15,
  "interaction.type.meeting": 30,
  "interaction.type.email": undefined,
  "interaction.type.other": undefined,
};

type Props = {
  route: {
    params?: {
      interactionId?: string;
      entityToLink?: { entityId: string; entityType: EntityLinkType };
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const InteractionFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { interactionId, entityToLink } = route.params ?? {};
  const interaction = useInteraction(interactionId ?? "");
  const {
    logInteraction,
    updateInteraction,
    scheduleInteraction,
    rescheduleInteraction,
    updateInteractionStatus,
    deleteInteraction,
  } = useInteractionActions(deviceId);
  const { linkInteraction } = useEntityLinkActions(deviceId);
  const { dialogProps, showAlert, showDialog } = useConfirmDialog();

  const [type, setType] = useState<InteractionType>("interaction.type.call");
  const [status, setStatus] = useState<InteractionStatus>(
    "interaction.status.completed",
  );
  const [summary, setSummary] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<DurationPreset>("custom");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutesInput, setDurationMinutesInput] = useState("");
  const [durationTouched, setDurationTouched] = useState(false);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [scheduledFor, setScheduledFor] = useState(() =>
    new Date().toISOString(),
  );
  const [showPicker, setShowPicker] = useState(false);

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

  useEffect(() => {
    if (interaction) {
      setType(interaction.type);
      setStatus(interaction.status ?? "interaction.status.completed");
      setSummary(interaction.summary);
      setOccurredAt(interaction.occurredAt);
      setScheduledFor(interaction.scheduledFor ?? interaction.occurredAt);
      applyDurationMinutes(interaction.durationMinutes);
      setDurationTouched(true);
    } else {
      // Set default to current date/time
      const now = new Date().toISOString();
      setOccurredAt(now);
      setScheduledFor(now);
      setStatus("interaction.status.completed");
      applyDurationMinutes(DEFAULT_DURATION_BY_TYPE[type]);
      setDurationTouched(false);
    }
  }, [applyDurationMinutes, interaction, type]);

  useEffect(() => {
    if (interaction || durationTouched) {
      return;
    }
    applyDurationMinutes(DEFAULT_DURATION_BY_TYPE[type]);
  }, [applyDurationMinutes, durationTouched, interaction, type]);

  const activeTimestamp =
    status === "interaction.status.completed" ? occurredAt : scheduledFor;

  const scheduledLabel = useMemo(() => {
    const date = new Date(activeTimestamp);
    if (Number.isNaN(date.getTime())) {
      return t("common.unknown");
    }
    return date.toLocaleString();
  }, [activeTimestamp]);

  const getResolvedDate = useCallback(() => {
    const date = new Date(activeTimestamp);
    if (Number.isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }, [activeTimestamp]);

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      return;
    }

    if (date) {
      const nextTimestamp = date.toISOString();
      if (status === "interaction.status.completed") {
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
            if (status === "interaction.status.completed") {
              setOccurredAt(nextTimestamp);
            } else {
              setScheduledFor(nextTimestamp);
            }
          },
        });
      },
    });
  }, [getResolvedDate, status]);

  const handleStatusChange = (value: InteractionStatus) => {
    setStatus(value);
    if (value === "interaction.status.completed") {
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
    if (!summary.trim()) {
      showAlert(
        t("common.error"),
        t("interactions.validation.summaryRequired"),
        t("common.ok"),
      );
      return;
    }

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
        t("interactions.validation.durationInvalid"),
        t("common.ok"),
      );
      return;
    }

    const nextTimestamp = activeTimestamp || new Date().toISOString();
    const trimmedSummary = summary.trim();

    if (interactionId) {
      const previousStatus =
        interaction?.status ?? "interaction.status.completed";
      const previousScheduledFor =
        interaction?.scheduledFor ??
        (previousStatus !== "interaction.status.completed"
          ? interaction?.occurredAt
          : undefined);

      const shouldUpdateDetails =
        interaction?.type !== type ||
        interaction?.summary !== trimmedSummary ||
        (status === "interaction.status.completed" &&
          interaction?.occurredAt !== nextTimestamp) ||
        (status !== "interaction.status.completed" &&
          previousScheduledFor !== nextTimestamp) ||
        interaction?.durationMinutes !== durationValue;

      if (shouldUpdateDetails) {
        const result = updateInteraction(
          interactionId,
          type,
          trimmedSummary,
          nextTimestamp,
          durationValue ?? undefined,
        );
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error || t("interactions.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      if (status !== previousStatus) {
        const result = updateInteractionStatus(
          interactionId,
          status,
          status === "interaction.status.completed" ? nextTimestamp : undefined,
        );
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error || t("interactions.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      if (
        status !== "interaction.status.completed" &&
        previousScheduledFor !== nextTimestamp
      ) {
        const result = rescheduleInteraction(interactionId, nextTimestamp);
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error || t("interactions.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      navigation.goBack();
    } else {
      const newInteractionId = nextId("interaction");
      const result =
        status === "interaction.status.scheduled"
          ? scheduleInteraction(
              type,
              trimmedSummary,
              nextTimestamp,
              durationValue ?? undefined,
              newInteractionId,
            )
          : logInteraction(
              type,
              trimmedSummary,
              nextTimestamp,
              durationValue ?? undefined,
              newInteractionId,
            );
      if (result.success) {
        if (entityToLink) {
          const linkResult = linkInteraction(
            newInteractionId,
            entityToLink.entityType,
            entityToLink.entityId,
          );
          if (!linkResult.success) {
            showDialog({
              title: t("interactions.linkFailureTitle"),
              message: t("interactions.linkFailureMessage"),
              confirmLabel: t("interactions.linkFailureDelete"),
              confirmVariant: "danger",
              cancelLabel: t("interactions.linkFailureKeep"),
              onConfirm: () => {
                deleteInteraction(newInteractionId);
                navigation.goBack();
              },
              onCancel: () => {
                navigation.goBack();
              },
            });
            return;
          }
        }
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("interactions.createError"),
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

  return (
    <FormScreenLayout>
      <ScrollView style={styles.container}>
        <FormField label={t("interactions.form.typeLabel")}>
          <SegmentedOptionGroup
            options={INTERACTION_TYPES.map((item) => ({
              label: t(item.label),
              value: item.value,
            }))}
            value={type}
            onChange={(value) => setType(value as InteractionType)}
          />
        </FormField>

        <FormField label={t("interactions.form.statusLabel")}>
          <SegmentedOptionGroup
            options={[
              {
                value: "interaction.status.completed",
                label: t("interaction.status.completed"),
              },
              {
                value: "interaction.status.scheduled",
                label: t("interaction.status.scheduled"),
              },
              ...(interactionId
                ? [
                    {
                      value: "interaction.status.canceled",
                      label: t("interaction.status.canceled"),
                    },
                  ]
                : []),
            ]}
            value={status}
            onChange={(value) => handleStatusChange(value as InteractionStatus)}
          />
        </FormField>

        <FormField
          label={
            status === "interaction.status.completed"
              ? t("interactions.form.occurredAtLabel")
              : t("interactions.form.scheduledForLabel")
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
                {scheduledLabel}
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
          label={t("interactions.form.durationLabel")}
          hint={t("interactions.form.durationHint")}
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

        <FormField label={t("interactions.form.summaryLabel")}>
          <TextField
            value={summary}
            onChangeText={setSummary}
            placeholder={t("interactions.form.summaryPlaceholder")}
            multiline
            numberOfLines={4}
            style={styles.summaryInput}
          />
        </FormField>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
            {interactionId
              ? t("interactions.form.updateButton")
              : t("interactions.form.logButton")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
  summaryInput: {
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
});
