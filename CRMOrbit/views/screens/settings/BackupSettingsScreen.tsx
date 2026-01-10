import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { BackupImportMode } from "@domains/persistence/backup";
import {
  ActionButton,
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  Section,
  SegmentedOptionGroup,
} from "../../components";
import { useTheme } from "../../hooks";
import {
  type BackupFileInfo,
  useBackupActions,
} from "../../hooks/useBackupActions";
import { useBackupLabels } from "../../hooks/useBackupLabels";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

export const BackupSettingsScreen = () => {
  const { colors } = useTheme();
  const labels = useBackupLabels();
  const { pickBackupFile, exportBackup, importBackup } = useBackupActions();
  const { dialogProps, showAlert, showDialog } = useConfirmDialog();
  const [selectedFile, setSelectedFile] = useState<BackupFileInfo | null>(null);
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handlePickFile = async () => {
    try {
      const picked = await pickBackupFile();
      if (picked) {
        setSelectedFile(picked);
      }
    } catch (error) {
      console.error("Failed to select backup file", error);
      showAlert(labels.errorTitle, labels.importErrorMessage, labels.okLabel);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportBackup();
      const message = result.shared
        ? labels.exportSuccessMessage
        : labels.exportShareUnavailable;
      showAlert(labels.exportSuccessTitle, message, labels.okLabel);
    } catch (error) {
      console.error("Failed to export backup", error);
      showAlert(labels.errorTitle, labels.exportErrorMessage, labels.okLabel);
    } finally {
      setIsExporting(false);
    }
  };

  const runImport = async () => {
    if (!selectedFile) {
      showAlert(labels.errorTitle, labels.importNoFile, labels.okLabel);
      return;
    }
    setIsImporting(true);
    try {
      await importBackup(selectedFile, importMode);
      showAlert(
        labels.importSuccessTitle,
        labels.importSuccessMessage,
        labels.okLabel,
      );
    } catch (error) {
      console.error("Failed to import backup", error);
      showAlert(labels.errorTitle, labels.importErrorMessage, labels.okLabel);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      showAlert(labels.errorTitle, labels.importNoFile, labels.okLabel);
      return;
    }

    if (importMode === "replace") {
      showDialog({
        title: labels.importReplaceTitle,
        message: labels.importReplaceMessage,
        confirmLabel: labels.importReplaceConfirm,
        confirmVariant: "danger",
        cancelLabel: labels.cancelLabel,
        onConfirm: () => {
          void runImport();
        },
      });
      return;
    }

    void runImport();
  };

  const fileLabel = selectedFile
    ? labels.importFileSelected(selectedFile.name)
    : labels.importFilePlaceholder;

  const importModeHint =
    importMode === "replace"
      ? labels.importModeReplaceHint
      : labels.importModeMergeHint;

  return (
    <FormScreenLayout>
      <Section title={labels.exportTitle}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {labels.exportDescription}
        </Text>
        <ActionButton
          size="block"
          label={labels.exportAction}
          onPress={handleExport}
          disabled={isExporting || isImporting}
        />
      </Section>

      <Section title={labels.importTitle}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {labels.importDescription}
        </Text>
        <FormField label={labels.importFileLabel}>
          <TouchableOpacity
            style={[
              styles.fileButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handlePickFile}
            accessibilityRole="button"
            disabled={isImporting || isExporting}
          >
            <Text
              style={[styles.fileButtonText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {fileLabel}
            </Text>
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={18}
              color={colors.chevron}
            />
          </TouchableOpacity>
        </FormField>
        <View style={styles.importModeRow}>
          <FormField label={labels.importModeLabel}>
            <SegmentedOptionGroup
              options={[
                { value: "merge", label: labels.importModeMerge },
                { value: "replace", label: labels.importModeReplace },
              ]}
              value={importMode}
              onChange={setImportMode}
            />
          </FormField>
          <Text style={[styles.modeHint, { color: colors.textMuted }]}>
            {importModeHint}
          </Text>
        </View>
        <ActionButton
          size="block"
          label={labels.importAction}
          variant={importMode === "replace" ? "danger" : "primary"}
          onPress={handleImport}
          disabled={isExporting || isImporting}
        />
      </Section>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
    marginBottom: 12,
  },
  fileButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fileButtonText: {
    flex: 1,
    fontSize: 14,
  },
  importModeRow: {
    marginTop: 8,
  },
  modeHint: {
    fontSize: 12,
    marginTop: 6,
  },
});
