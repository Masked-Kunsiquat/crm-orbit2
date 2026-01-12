import { useMemo, useState } from "react";
import type { Account } from "@domains/account";

export type OrganizationAccountManagementState = {
  // Modal state
  showLinkModal: boolean;
  setShowLinkModal: (show: boolean) => void;
  showAccountsModal: boolean;
  setShowAccountsModal: (show: boolean) => void;
  showContactsModal: boolean;
  setShowContactsModal: (show: boolean) => void;

  // Computed state
  linkableAccounts: Account[];
};

export type UseOrganizationAccountManagementParams = {
  organizationId: string;
  linkedAccountIds: Set<string>;
  allAccounts: Account[];
};

/**
 * Manages organization-to-account linking state and operations.
 * Handles modal visibility and account filtering.
 */
export const useOrganizationAccountManagement = ({
  organizationId: _organizationId,
  linkedAccountIds,
  allAccounts,
}: UseOrganizationAccountManagementParams): OrganizationAccountManagementState => {
  // Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Compute linkable accounts (sorted and not already linked)
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
    showContactsModal,
    setShowContactsModal,
    linkableAccounts,
  };
};
