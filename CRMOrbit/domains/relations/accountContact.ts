import type { EntityId } from "../shared/types";

export type AccountContactRole =
  | "account.contact.role.primary"
  | "account.contact.role.billing"
  | "account.contact.role.technical";

export interface AccountContact {
  accountId: EntityId;
  contactId: EntityId;
  role: AccountContactRole;
  isPrimary: boolean;
}
