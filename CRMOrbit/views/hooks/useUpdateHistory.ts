import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { createLogger } from "@utils/logger";

const logger = createLogger("UpdateHistory");
const UPDATE_HISTORY_KEY = "app.updateHistory";
const MAX_HISTORY_ENTRIES = 20;

export type UpdateHistoryEntry = {
  /** Unique update ID from Expo */
  updateId: string;
  /** Message passed to eas update --message */
  message: string | null;
  /** When the update was created/published */
  createdAt: string;
  /** When the user first received this update */
  receivedAt: string;
  /** Runtime version this update targets */
  runtimeVersion: string | null;
};

type ExpoManifestExtra = {
  expoClient?: {
    extra?: {
      message?: string;
    };
  };
};

type ExpoManifest = {
  id?: string;
  createdAt?: string;
  runtimeVersion?: string;
  extra?: ExpoManifestExtra;
};

/**
 * Extract the update message from the manifest.
 * The --message from `eas update` is stored in manifest.extra.expoClient.extra.message
 */
const extractMessage = (manifest: ExpoManifest | null): string | null => {
  if (!manifest?.extra?.expoClient?.extra?.message) {
    return null;
  }
  return manifest.extra.expoClient.extra.message;
};

/**
 * Load update history from AsyncStorage.
 */
export const loadUpdateHistory = async (): Promise<UpdateHistoryEntry[]> => {
  try {
    const stored = await AsyncStorage.getItem(UPDATE_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as UpdateHistoryEntry[];
  } catch (error) {
    logger.error("Failed to load update history:", error);
    return [];
  }
};

/**
 * Save update history to AsyncStorage.
 */
const saveHistory = async (history: UpdateHistoryEntry[]): Promise<void> => {
  try {
    // Keep only the most recent entries
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    await AsyncStorage.setItem(UPDATE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    logger.error("Failed to save update history:", error);
  }
};

/**
 * Get info about the currently running update (if any).
 */
export const getCurrentUpdateInfo = (): UpdateHistoryEntry | null => {
  if (__DEV__ || !Updates.isEnabled) {
    return null;
  }

  const updateId = Updates.updateId;
  if (!updateId) {
    return null;
  }

  const manifest = Updates.manifest as ExpoManifest | null;
  const message = extractMessage(manifest);
  const createdAt = manifest?.createdAt ?? new Date().toISOString();
  const runtimeVersion = manifest?.runtimeVersion ?? null;

  return {
    updateId,
    message,
    createdAt,
    receivedAt: new Date().toISOString(),
    runtimeVersion,
  };
};

/**
 * Record the current update to history if it's new.
 * Call this on app startup to track OTA updates.
 */
export const recordCurrentUpdateToHistory = async (): Promise<void> => {
  const current = getCurrentUpdateInfo();
  if (!current) {
    return;
  }

  const existingHistory = await loadUpdateHistory();

  // Check if this update is already recorded
  const alreadyRecorded = existingHistory.some(
    (entry) => entry.updateId === current.updateId,
  );

  if (!alreadyRecorded) {
    // Add to beginning of history
    const newHistory = [current, ...existingHistory];
    await saveHistory(newHistory);
    logger.info("Recorded new update:", current.updateId);
  }
};

/**
 * Hook to access OTA update history.
 *
 * Provides the list of recorded updates and info about the currently running update.
 * Use `recordCurrentUpdateToHistory()` on app startup to ensure updates are tracked.
 */
export const useUpdateHistory = () => {
  const [history, setHistory] = useState<UpdateHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateHistoryEntry | null>(
    null,
  );

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      const loadedHistory = await loadUpdateHistory();
      setHistory(loadedHistory);
      setCurrentUpdate(getCurrentUpdateInfo());
      setIsLoading(false);
    };
    void load();
  }, []);

  // Clear all history (for debugging/testing)
  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(UPDATE_HISTORY_KEY);
    setHistory([]);
    logger.info("Cleared update history");
  }, []);

  return {
    /** List of all recorded updates, most recent first */
    history,
    /** Info about the currently running update */
    currentUpdate,
    /** Whether history is still loading */
    isLoading,
    /** Clear all update history */
    clearHistory,
  };
};
