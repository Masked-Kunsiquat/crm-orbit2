import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as Sharing from "expo-sharing";

import type {
  BackupImportMode,
  BackupImportResult,
} from "@domains/persistence/backup";
import {
  exportBackupToFile,
  importBackupFromFile,
  type BackupImportErrorKind,
  type BackupFileInfo,
} from "@domains/persistence/backupService";
import { createLogger } from "@utils/logger";
import type { DispatchResult } from "./useDispatch";

const shareBackupFile = async (uri: string): Promise<boolean> => {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/octet-stream",
  });
  return true;
};

const resolveAssetName = (asset: DocumentPickerAsset): string => {
  const trimmed = asset.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  const fallback = asset.uri.split("/").pop();
  return fallback ?? "backup.crmbackup";
};

const logger = createLogger("BackupOperations");

export type BackupImportDispatchResult = DispatchResult<BackupImportResult> & {
  errorKind?: BackupImportErrorKind;
};

export const useBackupOperations = (deviceId: string) => {
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

  const exportBackup = useCallback(async (): Promise<
    DispatchResult<{ file: BackupFileInfo; shared: boolean }>
  > => {
    try {
      const file = await exportBackupToFile(deviceId);
      const shared = await shareBackupFile(file.uri);
      return { success: true, data: { file, shared } };
    } catch (error) {
      logger.error("Failed to export backup", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to export backup",
      };
    }
  }, [deviceId]);

  const runImport = useCallback(
    async (
      file: BackupFileInfo,
      mode: BackupImportMode,
    ): Promise<BackupImportDispatchResult> => {
      try {
        const outcome = await importBackupFromFile(deviceId, file, mode);
        if (outcome.ok) {
          return { success: true, data: outcome.result };
        }
        logger.error(
          "Failed to import backup",
          { file: file.name, mode, kind: outcome.kind },
          outcome.error,
        );
        return {
          success: false,
          error: outcome.error.message,
          errorKind: outcome.kind,
        };
      } catch (error) {
        logger.error(
          "Failed to import backup",
          { file: file.name, mode },
          error,
        );
        const message =
          error instanceof Error ? error.message : "Failed to import backup";
        return { success: false, error: message, errorKind: "unknown" };
      }
    },
    [deviceId],
  );

  return {
    shouldConfirmImport,
    pickBackupFile,
    exportBackup,
    runImport,
  };
};

export type { BackupFileInfo };
