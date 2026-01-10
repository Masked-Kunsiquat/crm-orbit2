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
  type BackupFileInfo,
} from "@views/services/backupService";
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

export const useBackupOperations = (deviceId: string) => {
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

  const importBackup = useCallback(
    async (
      file: BackupFileInfo,
      mode: BackupImportMode,
    ): Promise<DispatchResult<BackupImportResult>> => {
      try {
        const result = await importBackupFromFile(deviceId, file, mode);
        return { success: true, data: result };
      } catch (error) {
        logger.error(
          "Failed to import backup",
          { file: file.name, mode },
          error,
        );
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to import backup",
        };
      }
    },
    [deviceId],
  );

  return {
    pickBackupFile,
    exportBackup,
    importBackup,
  };
};

export type { BackupFileInfo };
