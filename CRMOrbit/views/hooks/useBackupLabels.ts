import { useMemo } from "react";

import type { BackupLabels } from "@i18n/backupLabels";

export const useBackupLabels = (provider: () => BackupLabels): BackupLabels =>
  useMemo(provider, [provider]);
