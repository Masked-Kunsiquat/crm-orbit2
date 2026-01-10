import { Directory, File, Paths } from "expo-file-system";

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
import { createLogger } from "@utils/logger";
import { __internal_getCrmStore } from "@views/store/store";

export type BackupFileInfo = {
  uri: string;
  name: string;
};

export type BackupImportErrorKind = "invalidGhash" | "unknown";

export type BackupImportOutcome =
  | { ok: true; result: BackupImportResult }
  | { ok: false; kind: BackupImportErrorKind; error: Error };

const logger = createLogger("BackupService");

const pad = (value: number): string => value.toString().padStart(2, "0");

const formatBackupTimestamp = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const buildBackupFileName = (date: Date): string =>
  `crmorbit-backup-${formatBackupTimestamp(date)}.crmbackup`;

const resolveBackupDirectory = (): Directory => {
  try {
    const directory = Paths.document;
    if (directory.uri && directory.uri !== ".") {
      return directory;
    }
  } catch {
    // Fall through to cache.
  }

  try {
    const cache = Paths.cache;
    if (cache.uri && cache.uri !== ".") {
      return cache;
    }
  } catch {
    // Fall through to error.
  }

  throw new Error("File storage is unavailable.");
};

const writeBackupFile = (contents: string): BackupFileInfo => {
  const name = buildBackupFileName(new Date());
  const directory = resolveBackupDirectory();
  const file = new File(directory, name);
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  return { uri: file.uri, name };
};

const readBackupFile = (uri: string): Promise<string> => new File(uri).text();

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

export const exportBackupToFile = async (
  deviceId: string,
): Promise<BackupFileInfo> => {
  try {
    const db = createPersistenceDb(getDatabase());
    const encrypted = await exportEncryptedBackup(db, { deviceId });
    return writeBackupFile(encrypted);
  } catch (error) {
    logger.error("Failed to export backup", error);
    throw error;
  }
};

export const importBackupFromFile = async (
  deviceId: string,
  file: BackupFileInfo,
  mode: BackupImportMode,
): Promise<BackupImportOutcome> => {
  try {
    const db = createPersistenceDb(getDatabase());
    const ciphertext = await readBackupFile(file.uri);
    const result = await importEncryptedBackup(db, ciphertext, mode);
    await reloadStoreFromPersistence(deviceId);
    return { ok: true, result };
  } catch (error) {
    logger.error("Failed to import backup", { file: file.name, mode }, error);
    const safeError =
      error instanceof Error ? error : new Error(String(error));
    const kind = safeError.message.includes("invalid ghash tag")
      ? "invalidGhash"
      : "unknown";
    return { ok: false, kind, error: safeError };
  }
};
