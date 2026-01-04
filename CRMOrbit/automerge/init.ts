import type { AutomergeDoc } from "./schema";

export const initAutomergeDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
});
