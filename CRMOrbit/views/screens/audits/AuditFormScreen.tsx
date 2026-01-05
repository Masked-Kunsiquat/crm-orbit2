import { useCallback, useEffect, useMemo, useState } from "react";
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

import { nextId } from "@domains/shared/idGenerator";
import { t } from "@i18n/index";
import { useAudit, useAccounts } from "../../store/store";
import { useAuditActions, useDeviceId } from "../../hooks";
import {
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useTheme } from "../../hooks";

type Props = {
  route: {
    params?: {
      auditId?: string;
      accountId?: string;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

type AuditStatus = "scheduled" | "completed";

const STATUS_OPTIONS: Array<{ label: string; value: AuditStatus }> = [
  { label: "audits.status.scheduled", value: "scheduled" },
  { label: "audits.status.completed", value: "completed" },
];

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

const parseScore = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};

const parseFloorsVisited = (value: string): number[] | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const numbers = trimmed
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((entry) => Number.isFinite(entry));
  if (numbers.length === 0) {
    return undefined;
  }
  return numbers;
};

const areFloorsEqual = (
  left?: number[],
  right?: number[],
): boolean => {
  const leftValue = left ?? [];
  const rightValue = right ?? [];
  if (leftValue.length !== rightValue.length) {
    return false;
  }
  return leftValue.every((value, index) => value === rightValue[index]);
};

export const AuditFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { auditId, accountId: prefillAccountId } = route.params ?? {};
  const audit = useAudit(auditId ?? "");
  const accounts = useAccounts();
  const {
    createAudit,
    rescheduleAudit,
    completeAudit,
    updateAuditNotes,
    updateAuditFloorsVisited,
    reassignAuditAccount,
  } = useAuditActions(deviceId);
  const { dialogProps, showAlert } = useConfirmDialog();

  const [accountId, setAccountId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [floorsVisitedInput, setFloorsVisitedInput] = useState("");
  const [status, setStatus] = useState<AuditStatus>("scheduled");
  const [activePicker, setActivePicker] = useState<"scheduled" | "occurred" | null>(
    null,
  );
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [accounts]);

  useEffect(() => {
    if (audit) {
      setAccountId(audit.accountId);
      setScheduledFor(audit.scheduledFor);
      setOccurredAt(audit.occurredAt ?? "");
      setStatus(audit.occurredAt ? "completed" : "scheduled");
      setNotes(audit.notes ?? "");
      setScore(audit.score !== undefined ? `${audit.score}` : "");
      setFloorsVisitedInput(audit.floorsVisited?.join(", ") ?? "");
      return;
    }

    const now = new Date().toISOString();
    setAccountId(prefillAccountId ?? "");
    setScheduledFor(now);
    setOccurredAt("");
    setStatus("scheduled");
    setNotes("");
    setScore("");
    setFloorsVisitedInput("");
  }, [audit, prefillAccountId]);

  const getResolvedDate = useCallback(
    (field: "scheduled" | "occurred") => {
      const timestamp = field === "scheduled" ? scheduledFor : occurredAt;
      const date = new Date(timestamp || new Date().toISOString());
      if (Number.isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    },
    [occurredAt, scheduledFor],
  );

  const updateTimestamp = (field: "scheduled" | "occurred", date: Date) => {
    const nextTimestamp = date.toISOString();
    if (field === "scheduled") {
      setScheduledFor(nextTimestamp);
    } else {
      setOccurredAt(nextTimestamp);
    }
  };

  const handlePickerChange = (
    field: "scheduled" | "occurred",
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (event.type === "dismissed") {
      setActivePicker(null);
      return;
    }
    if (date) {
      updateTimestamp(field, date);
    }
    setActivePicker(null);
  };

  const openAndroidPicker = (field: "scheduled" | "occurred") => {
    const currentDate = getResolvedDate(field);
    DateTimePickerAndroid.open({
      mode: "date",
      value: currentDate,
      onChange: (event, date) => {
        if (event.type !== "set" || !date) {
          return;
        }

        const nextDate = new Date(currentDate);
        nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

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
            updateTimestamp(field, finalDate);
          },
        });
      },
    });
  };

  const handleOpenPicker = (field: "scheduled" | "occurred") => {
    if (Platform.OS === "android") {
      openAndroidPicker(field);
      return;
    }
    setActivePicker(field);
  };

  const handleSave = () => {
    const trimmedAccountId = accountId.trim();
    if (!trimmedAccountId) {
      showAlert(
        t("common.error"),
        t("audits.validation.accountRequired"),
        t("common.ok"),
      );
      return;
    }

    if (!scheduledFor) {
      showAlert(
        t("common.error"),
        t("audits.validation.scheduledForRequired"),
        t("common.ok"),
      );
      return;
    }

    const scoreValue = parseScore(score);
    if (score.trim() && scoreValue === undefined) {
      showAlert(
        t("common.error"),
        t("audits.validation.scoreInvalid"),
        t("common.ok"),
      );
      return;
    }

    const floorsVisited = parseFloorsVisited(floorsVisitedInput);
    if (floorsVisitedInput.trim() && !floorsVisited) {
      showAlert(
        t("common.error"),
        t("audits.validation.floorsInvalid"),
        t("common.ok"),
      );
      return;
    }

    const notesValue = notes.trim() ? notes.trim() : undefined;
    const occurredAtValue =
      status === "completed"
        ? occurredAt || scheduledFor || new Date().toISOString()
        : undefined;

    if (!audit) {
      const newAuditId = nextId("audit");
      const createResult = createAudit(
        trimmedAccountId,
        scheduledFor,
        notesValue,
        floorsVisited,
        newAuditId,
      );
      if (!createResult.success) {
        showAlert(
          t("common.error"),
          createResult.error || t("audits.createError"),
          t("common.ok"),
        );
        return;
      }

      if (status === "completed" && occurredAtValue) {
        const completeResult = completeAudit(
          newAuditId,
          occurredAtValue,
          scoreValue,
          notesValue,
          floorsVisited,
        );
        if (!completeResult.success) {
          showAlert(
            t("common.error"),
            completeResult.error || t("audits.updateError"),
            t("common.ok"),
          );
          return;
        }
      }

      navigation.goBack();
      return;
    }

    const results = [];
    if (audit.accountId !== trimmedAccountId) {
      results.push(reassignAuditAccount(audit.id, trimmedAccountId));
    }
    if (audit.scheduledFor !== scheduledFor) {
      results.push(rescheduleAudit(audit.id, scheduledFor));
    }

    if (status === "completed" && occurredAtValue) {
      results.push(
        completeAudit(
          audit.id,
          occurredAtValue,
          scoreValue,
          notesValue,
          floorsVisited,
        ),
      );
    } else {
      if ((audit.notes ?? "") !== (notesValue ?? "")) {
        results.push(updateAuditNotes(audit.id, notesValue));
      }
      if (!areFloorsEqual(audit.floorsVisited, floorsVisited)) {
        results.push(updateAuditFloorsVisited(audit.id, floorsVisited ?? []));
      }
    }

    const failed = results.find((result) => !result.success);
    if (failed && !failed.success) {
      showAlert(
        t("common.error"),
        failed.error || t("audits.updateError"),
        t("common.ok"),
      );
      return;
    }

    navigation.goBack();
  };

  const canToggleStatus = !audit?.occurredAt;

  return (
    <FormScreenLayout>
      <FormField label={`${t("audits.form.accountLabel")} *`}>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          onPress={() => setIsAccountPickerOpen(true)}
        >
          <Text style={[styles.pickerButtonText, { color: colors.textPrimary }]}>
            {sortedAccounts.find((account) => account.id === accountId)?.name ??
              t("audits.form.accountPlaceholder")}
          </Text>
          <Text style={[styles.pickerChevron, { color: colors.textSecondary }]}>
            ▼
          </Text>
        </TouchableOpacity>
      </FormField>

      <FormField label={`${t("audits.form.scheduledForLabel")} *`}>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          onPress={() => handleOpenPicker("scheduled")}
        >
          <Text style={[styles.pickerButtonText, { color: colors.textPrimary }]}>
            {formatTimestamp(scheduledFor)}
          </Text>
          <Text style={[styles.pickerChevron, { color: colors.textSecondary }]}>
            ▼
          </Text>
        </TouchableOpacity>
      </FormField>

      {canToggleStatus ? (
        <FormField label={t("audits.form.statusLabel")}>
          <SegmentedOptionGroup
            options={STATUS_OPTIONS.map((option) => ({
              ...option,
              label: t(option.label),
            }))}
            value={status}
            onChange={setStatus}
          />
        </FormField>
      ) : (
        <FormField label={t("audits.form.statusLabel")}>
          <Text style={{ color: colors.textSecondary }}>
            {t("audits.status.completed")}
          </Text>
        </FormField>
      )}

      {status === "completed" ? (
        <FormField label={t("audits.form.occurredAtLabel")}>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() => handleOpenPicker("occurred")}
          >
            <Text
              style={[styles.pickerButtonText, { color: colors.textPrimary }]}
            >
              {formatTimestamp(occurredAt || scheduledFor)}
            </Text>
            <Text
              style={[styles.pickerChevron, { color: colors.textSecondary }]}
            >
              ▼
            </Text>
          </TouchableOpacity>
        </FormField>
      ) : null}

      {status === "completed" ? (
        <FormField label={t("audits.form.scoreLabel")}>
          <TextField
            value={score}
            onChangeText={setScore}
            placeholder={t("audits.form.scorePlaceholder")}
            keyboardType="numeric"
          />
        </FormField>
      ) : null}

      <FormField label={t("audits.form.floorsVisitedLabel")}>
        <TextField
          value={floorsVisitedInput}
          onChangeText={setFloorsVisitedInput}
          placeholder={t("audits.form.floorsVisitedPlaceholder")}
          autoCapitalize="none"
        />
      </FormField>

      <FormField label={t("audits.form.notesLabel")}>
        <TextField
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("audits.form.notesPlaceholder")}
          multiline
          textAlignVertical="top"
        />
      </FormField>

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.accent },
          accounts.length === 0 && { backgroundColor: colors.textMuted },
        ]}
        onPress={handleSave}
        disabled={accounts.length === 0}
      >
        <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
          {auditId ? t("audits.form.updateButton") : t("audits.form.createButton")}
        </Text>
      </TouchableOpacity>

      {activePicker && Platform.OS === "ios" ? (
        <DateTimePicker
          value={getResolvedDate(activePicker)}
          mode="datetime"
          onChange={(event, date) =>
            handlePickerChange(activePicker, event, date)
          }
        />
      ) : null}

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
              {t("audits.form.accountPickerTitle")}
            </Text>
            <ScrollView style={styles.pickerList}>
              {sortedAccounts.length === 0 ? (
                <Text
                  style={[
                    styles.emptyAccounts,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("audits.form.accountEmptyHint")}
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
  notesInput: {
    height: 140,
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
