import { useCallback } from "react";

import {
  requestDataWipe,
  useBackupOperationsState,
} from "@domains/persistence/backupOperations";

export const useDataWipe = () => {
  const { isWiping, lastError } = useBackupOperationsState();

  const requestWipe = useCallback(async () => requestDataWipe(), []);

  return { isWiping, lastError, requestWipe };
};
