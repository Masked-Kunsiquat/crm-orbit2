import { create } from "zustand";

import type { BackupImportMode, BackupImportResult } from "./backup";
import type {
  BackupFileInfo,
  BackupImportErrorKind,
  BackupRestoreState,
} from "./backupService";
import { exportBackupToFile, importBackupFromFile } from "./backupService";
import { createLogger } from "@utils/logger";

type BackupOperationsState = {
  isExporting: boolean;
  isImporting: boolean;
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

const useBackupOperationsStore = create<BackupOperationsState>(() => ({
  isExporting: false,
  isImporting: false,
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
