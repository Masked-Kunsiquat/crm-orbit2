import { useCallback, useEffect, useState } from "react";
import * as Updates from "expo-updates";
import { Alert } from "react-native";
import { createLogger } from "@utils/logger";
import { t } from "@i18n/index";

const logger = createLogger("AppUpdates");

type UpdatesWithPending = typeof Updates & {
  isUpdatePending?: () => Promise<boolean>;
};
const updatesWithPending = Updates as UpdatesWithPending;

export type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "error"
  | "up-to-date";

export type UseAppUpdatesReturn = {
  /** Current update status */
  status: UpdateStatus;
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** Whether an update has been downloaded and is ready to apply */
  isUpdateReady: boolean;
  /** Download progress (0-1) when downloading */
  downloadProgress: number | null;
  /** Error message if update check/download failed */
  error: string | null;
  /** Manually check for updates */
  checkForUpdate: () => Promise<void>;
  /** Apply the downloaded update (reloads the app) */
  applyUpdate: () => Promise<void>;
  /** Whether updates are enabled (false in dev mode) */
  isEnabled: boolean;
};

/**
 * Hook for managing OTA updates via expo-updates.
 *
 * In development mode, updates are disabled and the hook returns a no-op state.
 * In production, it automatically checks for updates on mount and provides
 * methods to manually check and apply updates.
 *
 * @param options.checkOnMount - Whether to check for updates when the hook mounts (default: true)
 * @param options.showAlertOnUpdate - Whether to show an alert when an update is ready (default: true)
 */
export const useAppUpdates = (
  options: {
    checkOnMount?: boolean;
    showAlertOnUpdate?: boolean;
  } = {},
): UseAppUpdatesReturn => {
  const { checkOnMount = true, showAlertOnUpdate = true } = options;

  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // expo-updates is disabled in development mode
  const isEnabled = !__DEV__ && Updates.isEnabled;

  const checkForUpdate = useCallback(async () => {
    if (!isEnabled) {
      logger.debug("Updates disabled (dev mode or not configured)");
      return;
    }

    try {
      setStatus("checking");
      setError(null);

      logger.info("Checking for updates...");
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        logger.info("Update available, downloading...");
        setIsUpdateAvailable(true);
        setStatus("downloading");
        setDownloadProgress(0);

        const fetchResult = await Updates.fetchUpdateAsync();

        if (fetchResult.isNew) {
          logger.info("Update downloaded successfully");
          setIsUpdateReady(true);
          setStatus("ready");
          setDownloadProgress(1);

          if (showAlertOnUpdate) {
            Alert.alert(
              t("settings.version.alertTitle"),
              t("settings.version.alertMessage"),
              [
                { text: t("settings.version.alertLater"), style: "cancel" },
                {
                  text: t("settings.version.alertRestart"),
                  onPress: () => {
                    Updates.reloadAsync();
                  },
                },
              ],
            );
          }
        } else {
          const isPending = updatesWithPending.isUpdatePending
            ? await updatesWithPending.isUpdatePending()
            : (Updates.latestContext?.isUpdatePending ?? false);

          if (isPending) {
            logger.info("Update already downloaded; pending reload");
            setIsUpdateReady(true);
            setStatus("ready");
            setDownloadProgress(1);

            if (showAlertOnUpdate) {
              Alert.alert(
                t("settings.version.alertTitle"),
                t("settings.version.alertMessage"),
                [
                  { text: t("settings.version.alertLater"), style: "cancel" },
                  {
                    text: t("settings.version.alertRestart"),
                    onPress: () => {
                      Updates.reloadAsync();
                    },
                  },
                ],
              );
            }
          } else {
            setStatus("up-to-date");
          }
        }
      } else {
        logger.info("App is up to date");
        setStatus("up-to-date");
        setIsUpdateAvailable(false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      logger.error("Update check failed:", errorMessage);
      setStatus("error");
      setError(errorMessage);
    }
  }, [isEnabled, showAlertOnUpdate]);

  const applyUpdate = useCallback(async () => {
    if (!isUpdateReady) {
      logger.warn("No update ready to apply");
      return;
    }

    try {
      logger.info("Applying update...");
      await Updates.reloadAsync();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      logger.error("Failed to apply update:", errorMessage);
      setError(errorMessage);
    }
  }, [isUpdateReady]);

  // Check for updates on mount if enabled
  useEffect(() => {
    if (checkOnMount && isEnabled) {
      checkForUpdate();
    }
  }, [checkOnMount, isEnabled, checkForUpdate]);

  return {
    status,
    isUpdateAvailable,
    isUpdateReady,
    downloadProgress,
    error,
    checkForUpdate,
    applyUpdate,
    isEnabled,
  };
};

/**
 * Get the current app version from expo-updates or Constants.
 * Returns the version string (e.g., "2.0.0").
 */
export const getAppVersion = (): string => {
  // In production with expo-updates, we can get version from the manifest
  if (!__DEV__ && Updates.manifest) {
    const manifest = Updates.manifest as { version?: string };
    if (manifest.version) {
      return manifest.version;
    }
  }

  // Fallback to package.json version (imported at build time)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const packageJson = require("../../package.json") as { version: string };
  return packageJson.version;
};

/**
 * Get the current runtime version used by expo-updates.
 */
export const getRuntimeVersion = (): string | null => {
  return Updates.runtimeVersion ?? null;
};

/**
 * Get the update ID of the currently running update (if any).
 */
export const getUpdateId = (): string | null => {
  return Updates.updateId ?? null;
};
