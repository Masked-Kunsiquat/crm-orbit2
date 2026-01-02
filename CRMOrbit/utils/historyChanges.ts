import type { Contact } from "../domains/contact";
import type { Account } from "../domains/account";
import type { Organization } from "../domains/organization";

export type FieldChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

/**
 * Detects changes between an old contact and new contact data
 */
export const detectContactChanges = (
  oldContact: Contact,
  newData: {
    firstName: string;
    lastName: string;
    type: string;
    title?: string;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldContact.firstName !== newData.firstName) {
    changes.push({
      field: "firstName",
      oldValue: oldContact.firstName,
      newValue: newData.firstName,
    });
  }

  if (oldContact.lastName !== newData.lastName) {
    changes.push({
      field: "lastName",
      oldValue: oldContact.lastName,
      newValue: newData.lastName,
    });
  }

  if (oldContact.type !== newData.type) {
    changes.push({
      field: "type",
      oldValue: oldContact.type,
      newValue: newData.type,
    });
  }

  const oldTitle = oldContact.title || "";
  const newTitle = newData.title || "";
  if (oldTitle !== newTitle) {
    changes.push({
      field: "title",
      oldValue: oldTitle,
      newValue: newTitle,
    });
  }

  return changes;
};

/**
 * Detects changes between an old account and new account data
 */
export const detectAccountChanges = (
  oldAccount: Account,
  newData: {
    name: string;
    status: string;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldAccount.name !== newData.name) {
    changes.push({
      field: "name",
      oldValue: oldAccount.name,
      newValue: newData.name,
    });
  }

  if (oldAccount.status !== newData.status) {
    changes.push({
      field: "status",
      oldValue: oldAccount.status,
      newValue: newData.status,
    });
  }

  return changes;
};

/**
 * Detects changes between an old organization and new organization data
 */
export const detectOrganizationChanges = (
  oldOrganization: Organization,
  newData: {
    name: string;
    status: string;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldOrganization.name !== newData.name) {
    changes.push({
      field: "name",
      oldValue: oldOrganization.name,
      newValue: newData.name,
    });
  }

  if (oldOrganization.status !== newData.status) {
    changes.push({
      field: "status",
      oldValue: oldOrganization.status,
      newValue: newData.status,
    });
  }

  return changes;
};
