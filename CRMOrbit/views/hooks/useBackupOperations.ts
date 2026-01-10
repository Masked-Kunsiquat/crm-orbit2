import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { BackupImportMode } from "@domains/persistence/backup";
import type { BackupFileInfo } from "@domains/persistence/backupService";
import {
  requestBackupExport,
  requestBackupImport,
  useBackupOperationsState,
} from "@domains/persistence/backupOperations";
import { createLogger } from "@utils/logger";
import type { DispatchResult } from "./useDispatch";

const resolveAssetName = (asset: DocumentPickerAsset): string => {
  const trimmed = asset.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  const fallback = asset.uri.split("/").pop();
  return fallback ?? "backup.crmbackup";
};

const logger = createLogger("BackupOperations");

export const useBackupOperations = (deviceId: string) => {
  const { isExporting, isImporting, lastError, lastErrorKind } =
    useBackupOperationsState();
  const shouldConfirmImport = useCallback(
    (mode: BackupImportMode) => mode === "replace",
    [],
  );

  const pickBackupFile = useCallback(async (): Promise<
    DispatchResult<BackupFileInfo | null>
  > => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (result.canceled) {
        return { success: true, data: null };
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return { success: true, data: null };
      }

      return {
        success: true,
        data: {
          uri: asset.uri,
          name: resolveAssetName(asset),
          size: asset.size,
        },
      };
    } catch (error) {
      logger.error("Failed to select backup file", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to select file",
      };
    }
  }, []);

  const requestExport = useCallback(
    async () => requestBackupExport(deviceId),
    [deviceId],
  );

  const requestImport = useCallback(
    async (file: BackupFileInfo, mode: BackupImportMode) =>
      requestBackupImport(deviceId, file, mode),
    [deviceId],
  );

  return {
    isExporting,
    isImporting,
    lastError,
    lastErrorKind,
    shouldConfirmImport,
    pickBackupFile,
    requestExport,
    requestImport,
  };
};

export type { BackupFileInfo };
