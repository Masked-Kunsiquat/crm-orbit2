import type { AutomergeDoc } from "./schema";
import { DEFAULT_SETTINGS } from "@domains/settings";

export const initAutomergeDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  settings: DEFAULT_SETTINGS,
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
});
