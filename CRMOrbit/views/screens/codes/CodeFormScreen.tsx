import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { CodeType } from "../../../domains/code";
import { useAccounts, useCode } from "../../store/store";
import { useCodeActions, useDeviceId, useTheme } from "../../hooks";
import {
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { decryptCode, encryptCode } from "../../../utils/encryption";
import * as ScreenCapture from "expo-screen-capture";
import { useFocusEffect } from "@react-navigation/native";

const CODE_TYPE_OPTIONS: Array<{ label: string; value: CodeType }> = [
  { label: "code.type.door", value: "code.type.door" },
  { label: "code.type.lockbox", value: "code.type.lockbox" },
  { label: "code.type.alarm", value: "code.type.alarm" },
  { label: "code.type.gate", value: "code.type.gate" },
  { label: "code.type.other", value: "code.type.other" },
];

type Props = {
  route: {
    params?: {
      codeId?: string;
      accountId?: string;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const CodeFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { codeId, accountId: prefillAccountId } = route.params ?? {};
  const code = useCode(codeId ?? "");
  const accounts = useAccounts();
  const { createCode, updateCode } = useCodeActions(deviceId);
  const { dialogProps, showAlert } = useConfirmDialog();

  const [accountId, setAccountId] = useState("");
  const [label, setLabel] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [type, setType] = useState<CodeType>("code.type.other");
  const [notes, setNotes] = useState("");
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecryptError = useCallback(
    (error: unknown) => {
      const isMissingKey =
        error instanceof Error && error.message === "Encryption key not found.";
      const messageKey = isMissingKey
        ? "codes.keyMissingError"
        : "codes.decryptError";
      showAlert(t("common.error"), t(messageKey), t("common.ok"));
    },
    [showAlert],
  );

  useEffect(() => {
    let isActive = true;

    const hydrateFromCode = async () => {
      if (!code) {
        if (!codeId) {
          setAccountId(prefillAccountId ?? "");
          setLabel("");
          setCodeValue("");
          setType("code.type.other");
          setNotes("");
          setIsDecrypting(false);
        }
        return;
      }

      setAccountId(code.accountId);
      setLabel(code.label);
      setType(code.type);
      setNotes(code.notes ?? "");

      if (code.isEncrypted) {
        setIsDecrypting(true);
        setCodeValue("");
        try {
          const decryptedValue = await decryptCode(code.codeValue);
          if (!isActive) return;
          setCodeValue(decryptedValue);
        } catch (error) {
          if (!isActive) return;
          handleDecryptError(error);
        } finally {
          if (isActive) {
            setIsDecrypting(false);
          }
        }
      } else {
        setCodeValue(code.codeValue);
        setIsDecrypting(false);
      }
    };

    void hydrateFromCode();

    return () => {
      isActive = false;
    };
  }, [code, codeId, handleDecryptError, prefillAccountId]);

  useFocusEffect(
    useCallback(() => {
      void ScreenCapture.preventScreenCaptureAsync();
      return () => {
        void ScreenCapture.allowScreenCaptureAsync();
      };
    }, []),
  );

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [accounts]);

  const selectedAccount = accounts.find((account) => account.id === accountId);

  const handleSave = async () => {
    if (!accountId) {
      showAlert(
        t("common.error"),
        t("codes.validation.accountRequired"),
        t("common.ok"),
      );
      return;
    }

    if (!label.trim()) {
      showAlert(
        t("common.error"),
        t("codes.validation.labelRequired"),
        t("common.ok"),
      );
      return;
    }

    if (!codeValue.trim()) {
      showAlert(
        t("common.error"),
        t("codes.validation.valueRequired"),
        t("common.ok"),
      );
      return;
    }

    let encryptedValue = "";

    try {
      encryptedValue = await encryptCode(codeValue.trim());
    } catch {
      showAlert(t("common.error"), t("codes.encryptError"), t("common.ok"));
      return;
    }

    if (codeId) {
      const result = updateCode(
        codeId,
        label.trim(),
        encryptedValue,
        type,
        notes.trim() || undefined,
        accountId,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error ?? t("codes.updateError"),
          t("common.ok"),
        );
      }
    } else {
      const result = createCode(
        accountId,
        label.trim(),
        encryptedValue,
        type,
        notes.trim() || undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error ?? t("codes.createError"),
          t("common.ok"),
        );
      }
    }
  };

  if (codeId && (!code || isDecrypting)) {
    return (
      <FormScreenLayout contentStyle={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </FormScreenLayout>
    );
  }

  return (
    <FormScreenLayout>
      <FormField
        label={`${t("codes.form.accountLabel")} *`}
        hint={
          accounts.length === 0 ? t("codes.form.accountEmptyHint") : undefined
        }
      >
        {accounts.length === 0 ? null : (
          <TouchableOpacity
            style={[
              styles.pickerButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setIsAccountPickerOpen(true)}
            accessibilityRole="button"
          >
            <Text
              style={[styles.pickerButtonText, { color: colors.textSecondary }]}
            >
              {selectedAccount?.name ?? t("codes.form.accountPlaceholder")}
            </Text>
            <Text style={[styles.pickerChevron, { color: colors.chevron }]}>
              ▼
            </Text>
          </TouchableOpacity>
        )}
      </FormField>

      <FormField label={`${t("codes.form.labelLabel")} *`}>
        <TextField
          value={label}
          onChangeText={setLabel}
          placeholder={t("codes.form.labelPlaceholder")}
          autoFocus
        />
      </FormField>

      <FormField label={`${t("codes.form.valueLabel")} *`}>
        <TextField
          value={codeValue}
          onChangeText={setCodeValue}
          placeholder={t("codes.form.valuePlaceholder")}
          autoCapitalize="none"
        />
      </FormField>

      <FormField label={t("codes.form.typeLabel")}>
        <SegmentedOptionGroup
          options={CODE_TYPE_OPTIONS.map((option) => ({
            ...option,
            label: t(option.label),
          }))}
          value={type}
          onChange={setType}
        />
      </FormField>

      <FormField label={t("codes.form.notesLabel")}>
        <TextField
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("codes.form.notesPlaceholder")}
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
          {codeId ? t("codes.form.updateButton") : t("codes.form.createButton")}
        </Text>
      </TouchableOpacity>

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
              {t("codes.form.accountPickerTitle")}
            </Text>
            <ScrollView style={styles.pickerList}>
              {sortedAccounts.map((account) => {
                const isSelected = account.id === accountId;
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.surfaceElevated },
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
              })}
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
    height: 160,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
