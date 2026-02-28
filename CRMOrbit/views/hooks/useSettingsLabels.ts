import { t } from "@i18n/index";
import type { UpdateStatus } from "./useAppUpdates";

export const useSettingsListLabels = () => ({
  appearanceTitle: t("settings.appearance.title"),
  appearanceDescription: t("settings.appearance.description"),
  backupTitle: t("settings.backup.title"),
  backupDescription: t("settings.backup.description"),
  calendarTitle: t("settings.calendar.title"),
  calendarDescription: t("settings.calendar.description"),
  securityTitle: t("settings.security.title"),
  securityDescription: t("settings.security.description"),
  syncTitle: t("sync.title"),
  syncDescription: t("sync.description"),
  dummyDataTitle: t("settings.dummyData.title"),
  dummyDataDescription: t("settings.dummyData.description"),
  dummyDataLoadTitle: t("settings.dummyData.loadTitle"),
  dummyDataLoadMessage: t("settings.dummyData.loadMessage"),
  dummyDataLoadConfirm: t("settings.dummyData.loadConfirm"),
  dummyDataClearTitle: t("settings.dummyData.clearTitle"),
  dummyDataClearMessage: t("settings.dummyData.clearMessage"),
  dummyDataClearConfirm: t("settings.dummyData.clearConfirm"),
  dummyDataCancel: t("settings.dummyData.cancel"),
  dummyDataDemoBannerTitle: t("settings.dummyData.demoBannerTitle"),
  dummyDataDemoBannerMessage: t("settings.dummyData.demoBannerMessage"),
});

export const useVersionLabels = () => ({
  getVersionTitle: (version: string) =>
    t("settings.version.title", { version }),
  devBuild: t("settings.version.devBuild"),
  getUpdateStatus: (status: UpdateStatus, isUpdateReady: boolean): string => {
    if (isUpdateReady) return t("settings.version.ready");
    switch (status) {
      case "checking":
        return t("settings.version.checking");
      case "downloading":
        return t("settings.version.downloading");
      case "ready":
        return t("settings.version.ready");
      case "up-to-date":
        return t("settings.version.upToDate");
      case "error":
        return t("settings.version.error");
      default:
        return t("settings.version.checkForUpdates");
    }
  },
});

export const useMiscStackTitles = () => ({
  misc: t("screens.miscellaneous"),
  settings: t("settings.title"),
  sync: t("sync.title"),
  randomizer: t("randomizer.title"),
  backup: t("backup.title"),
  security: t("settings.security.title"),
  calendar: t("settings.calendar.title"),
  appearance: t("settings.appearance.title"),
});
