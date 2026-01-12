import { useMemo, useState } from "react";
import type { Account } from "@domains/account";
import type { AccountContactRole } from "@domains/relations/accountContact";

export type ContactAccountManagementState = {
  // Modal state
  showLinkModal: boolean;
  setShowLinkModal: (show: boolean) => void;
  showAccountsModal: boolean;
  setShowAccountsModal: (show: boolean) => void;

  // Selection state
  selectedRole: AccountContactRole;
  setSelectedRole: (role: AccountContactRole) => void;

  // Computed state
  linkableAccounts: Account[];
};

export type UseContactAccountManagementParams = {
  contactId: string;
  linkedAccountIds: Set<string>;
  allAccounts: Account[];
};

/**
 * Manages contact-to-account linking state and operations.
 * Handles modal visibility, role selection, and account filtering.
 */
export const useContactAccountManagement = ({
  contactId: _contactId,
  linkedAccountIds,
  allAccounts,
}: UseContactAccountManagementParams): ContactAccountManagementState => {
  // Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);

  // Selection state
  const [selectedRole, setSelectedRole] = useState<AccountContactRole>(
    "account.contact.role.primary",
  );

  // Compute linkable accounts (not already linked)
  const linkableAccounts = useMemo(() => {
    return allAccounts
      .filter((account) => !linkedAccountIds.has(account.id))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [allAccounts, linkedAccountIds]);

  return {
    showLinkModal,
    setShowLinkModal,
    showAccountsModal,
    setShowAccountsModal,
    selectedRole,
    setSelectedRole,
    linkableAccounts,
  };
};
