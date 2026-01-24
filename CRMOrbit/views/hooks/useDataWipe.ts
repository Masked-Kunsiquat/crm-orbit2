import { useCallback } from "react";

import {
  requestDataWipe,
  useBackupOperationsState,
} from "@domains/persistence/backupOperations";

export const useDataWipe = (deviceId: string) => {
  const { isWiping, lastError } = useBackupOperationsState();

  const requestWipe = useCallback(
    async () => requestDataWipe(deviceId),
    [deviceId],
  );

  return { isWiping, lastError, requestWipe };
};
