import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type {
  BackupImportMode,
  BackupImportResult,
} from "@domains/persistence/backup";
import {
  exportEncryptedBackup,
  importEncryptedBackup,
} from "@domains/persistence/backup";
import {
  createPersistenceDb,
  getDatabase,
} from "@domains/persistence/database";
import { loadPersistedState } from "@domains/persistence/loader";
import { appendEvents } from "@domains/persistence/store";
import { buildCodeEncryptionEvents } from "@domains/migrations/codeEncryption";
import { applyEvents } from "@events/dispatcher";
import { __internal_getCrmStore } from "@views/store/store";
import { useDeviceId } from "./useDeviceId";

export type BackupFileInfo = {
  uri: string;
  name: string;
};

export type BackupExportResult = {
  file: BackupFileInfo;
  shared: boolean;
};

const pad = (value: number): string => value.toString().padStart(2, "0");

const formatBackupTimestamp = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const buildBackupFileName = (date: Date): string =>
  `crmorbit-backup-${formatBackupTimestamp(date)}.crmbackup`;

const resolveBackupDirectory = (): string => {
  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("File storage is unavailable.");
  }
  return directory;
};

const writeBackupFile = async (contents: string): Promise<BackupFileInfo> => {
  const name = buildBackupFileName(new Date());
  const uri = `${resolveBackupDirectory()}${name}`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri, name };
};

const readBackupFile = async (uri: string): Promise<string> =>
  FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

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

const reloadStoreFromPersistence = async (deviceId: string): Promise<void> => {
  const db = createPersistenceDb(getDatabase());
  const { doc: loadedDoc, events: loadedEvents } = await loadPersistedState(db);
  const migrationEvents = await buildCodeEncryptionEvents(loadedDoc, deviceId);

  let doc = loadedDoc;
  let events = loadedEvents;

  if (migrationEvents.length > 0) {
    await appendEvents(db, migrationEvents);
    doc = applyEvents(loadedDoc, migrationEvents);
    events = [...loadedEvents, ...migrationEvents];
  }

  const store = __internal_getCrmStore();
  store.getState().setDoc(doc);
  store.getState().setEvents(events);
};

export const useBackupActions = () => {
  const deviceId = useDeviceId();

  const pickBackupFile = useCallback(async (): Promise<BackupFileInfo | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets?.[0];
    if (!asset) {
      return null;
    }

    return {
      uri: asset.uri,
      name: resolveAssetName(asset),
    };
  }, []);

  const exportBackup = useCallback(async (): Promise<BackupExportResult> => {
    const db = createPersistenceDb(getDatabase());
    const encrypted = await exportEncryptedBackup(db, { deviceId });
    const file = await writeBackupFile(encrypted);
    const shared = await shareBackupFile(file.uri);
    return { file, shared };
  }, [deviceId]);

  const importBackup = useCallback(
    async (
      file: BackupFileInfo,
      mode: BackupImportMode,
    ): Promise<BackupImportResult> => {
      const db = createPersistenceDb(getDatabase());
      const ciphertext = await readBackupFile(file.uri);
      const result = await importEncryptedBackup(db, ciphertext, mode);
      await reloadStoreFromPersistence(deviceId);
      return result;
    },
    [deviceId],
  );

  return {
    pickBackupFile,
    exportBackup,
    importBackup,
  };
};
