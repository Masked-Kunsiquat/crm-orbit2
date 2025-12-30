import type { AutomergeDoc } from "./schema";

export const initAutomergeDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  contacts: {},
  notes: {},
  interactions: {},
  relations: {
    accountContacts: {},
    noteLinks: {},
  },
});
