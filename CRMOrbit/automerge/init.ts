import type { AutomergeDoc } from "./schema";
import { DEFAULT_SETTINGS } from "@domains/settings";

export const initAutomergeDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  audits: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  calendarEvents: {},
  settings: DEFAULT_SETTINGS,
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
});
