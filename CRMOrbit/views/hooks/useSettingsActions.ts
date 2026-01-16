import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type {
  AppearanceThemeMode,
  CalendarPaletteId,
  SecurityAuthFrequency,
  SecurityBiometricSetting,
  SecurityBlurTimeout,
} from "../../domains/settings";
import type { AppPaletteId } from "../../domains/shared/theme/colors";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import { createLogger } from "@utils/logger";

type SecuritySettingsUpdate = {
  biometricAuth?: SecurityBiometricSetting;
  blurTimeout?: SecurityBlurTimeout;
  authFrequency?: SecurityAuthFrequency;
};

type CalendarSettingsUpdate = {
  palette?: CalendarPaletteId;
};

type AppearanceSettingsUpdate = {
  palette?: AppPaletteId;
  mode?: AppearanceThemeMode;
};

export const useSettingsActions = (deviceId: string) => {
  const { dispatch } = useDispatch();
  const logger = createLogger("SettingsActions");

  const updateSecuritySettings = useCallback(
    (updates: SecuritySettingsUpdate): DispatchResult => {
      const event = buildEvent({
        type: "settings.security.updated",
        payload: updates,
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateCalendarSettings = useCallback(
    (updates: CalendarSettingsUpdate): DispatchResult => {
      const event = buildEvent({
        type: "settings.calendar.updated",
        payload: updates,
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAppearanceSettings = useCallback(
    (updates: AppearanceSettingsUpdate): DispatchResult => {
      logger.info("Appearance settings update requested", updates);
      const event = buildEvent({
        type: "settings.appearance.updated",
        payload: updates,
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch, logger],
  );

  return {
    updateSecuritySettings,
    updateCalendarSettings,
    updateAppearanceSettings,
  };
};
