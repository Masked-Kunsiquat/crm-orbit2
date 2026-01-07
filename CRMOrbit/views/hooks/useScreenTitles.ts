import { t } from "@i18n/index";

export const SCREEN_TITLE_KEYS = {
  events: "screens.events",
  auditsList: "audits.listTitle",
  auditDetail: "screens.auditDetails",
  auditFormNew: "screens.newAudit",
  auditFormEdit: "screens.editAudit",
  calendar: "screens.calendar",
  interactionsList: "interactions.title",
  interactionDetail: "screens.interactionDetails",
  interactionFormNew: "screens.newInteraction",
  interactionFormEdit: "screens.editInteraction",
} as const;

export type ScreenTitleKey =
  (typeof SCREEN_TITLE_KEYS)[keyof typeof SCREEN_TITLE_KEYS];

export const useScreenTitles = () => {
  const getScreenTitle = (key: ScreenTitleKey): string => t(key);

  return {
    getScreenTitle,
    screenTitleKeys: SCREEN_TITLE_KEYS,
  };
};
