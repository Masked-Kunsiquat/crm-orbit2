import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type {
  SecurityAuthFrequency,
  SecurityBiometricSetting,
  SecurityBlurTimeout,
} from "../../domains/settings";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

type SecuritySettingsUpdate = {
  biometricAuth?: SecurityBiometricSetting;
  blurTimeout?: SecurityBlurTimeout;
  authFrequency?: SecurityAuthFrequency;
};

export const useSettingsActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

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

  return {
    updateSecuritySettings,
  };
};
