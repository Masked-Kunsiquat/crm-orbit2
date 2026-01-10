import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Clipboard from "expo-clipboard";

import type { BackupImportMode } from "@domains/persistence/backup";
import { exportEncryptionKey } from "@utils/encryption";
import {
  ActionButton,
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  Section,
  SegmentedOptionGroup,
} from "../../components";
import { useLocalAuth, useTheme } from "../../hooks";
import {
  type BackupFileInfo,
  useBackupActions,
} from "../../hooks/useBackupActions";
import { useBackupLabels } from "../../hooks/useBackupLabels";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useSecuritySettings } from "../../store/store";

export const BackupSettingsScreen = () => {
  const { colors } = useTheme();
  const labels = useBackupLabels();
  const securitySettings = useSecuritySettings();
  const { authenticate, isAvailable } = useLocalAuth();
  const { pickBackupFile, exportBackup, importBackup } = useBackupActions();
  const { dialogProps, showAlert, showDialog } = useConfirmDialog();
  const [selectedFile, setSelectedFile] = useState<BackupFileInfo | null>(null);
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(false);

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

  const handleRevealKey = async () => {
    if (securitySettings.biometricAuth !== "enabled") {
      showAlert(labels.errorTitle, labels.keyBiometricDisabled, labels.okLabel);
      return;
    }

    const available = await isAvailable();
    if (!available) {
      showAlert(
        labels.errorTitle,
        labels.keyBiometricUnavailable,
        labels.okLabel,
      );
      return;
    }

    const authenticated = await authenticate(labels.keyAuthReason);
    if (!authenticated) {
      showAlert(labels.errorTitle, labels.keyBiometricFailed, labels.okLabel);
      return;
    }

    setIsKeyLoading(true);
    try {
      const key = await exportEncryptionKey();
      setKeyValue(key);
      setIsKeyVisible(true);
    } catch (error) {
      console.error("Failed to load security key", error);
      showAlert(labels.errorTitle, labels.keyLoadError, labels.okLabel);
    } finally {
      setIsKeyLoading(false);
    }
  };

  const handleCopyKey = async () => {
    if (!keyValue) return;
    try {
      await Clipboard.setStringAsync(keyValue);
      showAlert(
        labels.keyCopySuccessTitle,
        labels.keyCopySuccessMessage,
        labels.okLabel,
      );
    } catch (error) {
      console.error("Failed to copy security key", error);
      showAlert(labels.errorTitle, labels.keyCopyError, labels.okLabel);
    }
  };

  const handleCloseKeyModal = () => {
    setIsKeyVisible(false);
    setKeyValue(null);
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

      <Section title={labels.keySectionTitle}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {labels.keySectionDescription}
        </Text>
        <ActionButton
          size="block"
          label={labels.keyRevealAction}
          onPress={handleRevealKey}
          disabled={isExporting || isImporting || isKeyLoading}
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

      <Modal
        visible={isKeyVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseKeyModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseKeyModal} />
          <View
            style={[
              styles.keyModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {labels.keyModalTitle}
              </Text>
              <TouchableOpacity onPress={handleCloseKeyModal}>
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              {labels.keyModalMessage}
            </Text>
            <View
              style={[
                styles.keyPanel,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text
                selectable
                style={[styles.keyText, { color: colors.textPrimary }]}
              >
                {keyValue ?? ""}
              </Text>
            </View>
            <ActionButton
              size="block"
              label={labels.keyCopyAction}
              onPress={handleCopyKey}
              disabled={!keyValue}
            />
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  keyModal: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalMessage: {
    fontSize: 12,
    marginBottom: 12,
  },
  keyPanel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  keyText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
});
