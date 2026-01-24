import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { BackupImportMode, BackupImportResult } from "./backup";
import { initAutomergeDoc } from "@automerge/init";
import type {
  BackupFileInfo,
  BackupImportErrorKind,
  BackupRestoreState,
} from "./backupService";
import { exportBackupToFile, importBackupFromFile } from "./backupService";
import { createPersistenceDb, getDatabase } from "./database";
import { clearPersistence } from "./store";
import { createLogger } from "@utils/logger";

type BackupOperationsState = {
  isExporting: boolean;
  isImporting: boolean;
  isWiping: boolean;
  lastExport: BackupFileInfo | null;
  lastImport: BackupImportResult | null;
  lastError: string | null;
  lastErrorKind: BackupImportErrorKind | null;
};

type BackupRestoreHandler = (state: BackupRestoreState) => void;

const logger = createLogger("BackupOperations");

let restoreHandler: BackupRestoreHandler | null = null;

export type BackupExportOutcome =
  | { ok: true; file: BackupFileInfo }
  | { ok: false; error: Error };

export type BackupImportRequestOutcome =
  | { ok: true; result: BackupImportResult }
  | { ok: false; kind: BackupImportErrorKind; error: Error };

export type DataWipeOutcome =
  | { ok: true }
  | {
      ok: false;
      error: Error;
    };

const useBackupOperationsStore = create<BackupOperationsState>(() => ({
  isExporting: false,
  isImporting: false,
  isWiping: false,
  lastExport: null,
  lastImport: null,
  lastError: null,
  lastErrorKind: null,
}));

const setExporting = (value: boolean): void => {
  useBackupOperationsStore.setState({ isExporting: value });
};

const setImporting = (value: boolean): void => {
  useBackupOperationsStore.setState({ isImporting: value });
};

const setWiping = (value: boolean): void => {
  useBackupOperationsStore.setState({ isWiping: value });
};

const clearErrors = (): void => {
  useBackupOperationsStore.setState({ lastError: null, lastErrorKind: null });
};

const setExportResult = (file: BackupFileInfo): void => {
  useBackupOperationsStore.setState({ lastExport: file });
};

const setImportResult = (result: BackupImportResult): void => {
  useBackupOperationsStore.setState({ lastImport: result });
};

const setExportError = (error: Error): void => {
  useBackupOperationsStore.setState({
    lastError: error.message,
    lastErrorKind: null,
  });
};

const setImportError = (kind: BackupImportErrorKind, error: Error): void => {
  useBackupOperationsStore.setState({
    lastError: error.message,
    lastErrorKind: kind,
  });
};

const setWipeError = (error: Error): void => {
  useBackupOperationsStore.setState({
    lastError: error.message,
    lastErrorKind: null,
  });
};

const applyRestoreState = (state: BackupRestoreState): void => {
  if (!restoreHandler) {
    logger.warn("No backup restore handler registered.");
    return;
  }
  try {
    restoreHandler(state);
  } catch (error) {
    logger.error("Backup restore handler failed", error);
  }
};

export const registerBackupRestoreHandler = (
  handler: BackupRestoreHandler,
): void => {
  restoreHandler = handler;
};

export const useBackupOperationsState = (): BackupOperationsState =>
  useBackupOperationsStore((state) => state);

export const requestBackupExport = async (
  deviceId: string,
): Promise<BackupExportOutcome> => {
  clearErrors();
  setExporting(true);
  try {
    const file = await exportBackupToFile(deviceId);
    setExportResult(file);
    return { ok: true, file };
  } catch (error) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    setExportError(safeError);
    return { ok: false, error: safeError };
  } finally {
    setExporting(false);
  }
};

export const requestBackupImport = async (
  deviceId: string,
  file: BackupFileInfo,
  mode: BackupImportMode,
): Promise<BackupImportRequestOutcome> => {
  clearErrors();
  setImporting(true);
  try {
    const outcome = await importBackupFromFile(deviceId, file, mode);
    if (outcome.ok) {
      applyRestoreState(outcome.state);
      setImportResult(outcome.result);
      return { ok: true, result: outcome.result };
    }
    setImportError(outcome.kind, outcome.error);
    return { ok: false, kind: outcome.kind, error: outcome.error };
  } finally {
    setImporting(false);
  }
};

export const requestDataWipe = async (
  deviceId: string,
): Promise<DataWipeOutcome> => {
  clearErrors();
  setWiping(true);
  try {
    let persistenceError: Error | null = null;
    let storageError: Error | null = null;
    let db = null as ReturnType<typeof createPersistenceDb> | null;

    try {
      db = createPersistenceDb(getDatabase());
    } catch (error) {
      persistenceError =
        error instanceof Error ? error : new Error(String(error));
    }

    if (db) {
      try {
        await clearPersistence(db);
      } catch (error) {
        persistenceError =
          error instanceof Error ? error : new Error(String(error));
      }
    }

    try {
      await AsyncStorage.clear();
    } catch (error) {
      storageError = error instanceof Error ? error : new Error(String(error));
    }

    if (persistenceError || storageError) {
      if (persistenceError && !storageError) {
        logger.warn("Data wipe partially failed (AsyncStorage cleared)", {
          deviceId,
          error: persistenceError.message,
        });
      } else if (!persistenceError && storageError) {
        logger.warn("Data wipe partially failed (persistence cleared)", {
          deviceId,
          error: storageError.message,
        });
      } else {
        logger.error("Data wipe failed (persistence + AsyncStorage)", {
          deviceId,
          persistenceError: persistenceError?.message,
          storageError: storageError?.message,
        });
      }

      const messageParts = [
        persistenceError
          ? `persistence: ${persistenceError.message}`
          : "persistence cleared",
        storageError
          ? `async storage: ${storageError.message}`
          : "async storage cleared",
      ];
      const compoundError = new Error(
        `Data wipe incomplete (${messageParts.join("; ")}).`,
      );
      setWipeError(compoundError);
      return { ok: false, error: compoundError };
    }

    applyRestoreState({ doc: initAutomergeDoc(), events: [] });
    return { ok: true };
  } catch (error) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    setWipeError(safeError);
    return { ok: false, error: safeError };
  } finally {
    setWiping(false);
  }
};
