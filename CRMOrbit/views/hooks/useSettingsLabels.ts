import { t } from "@i18n/index";

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
