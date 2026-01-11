import { useMemo, useState } from "react";
import type { Contact, ContactType } from "@domains/contact";
import type { AccountContactRole } from "@domains/relations/accountContact";
import type { EntityId } from "@domains/shared/types";
import { getContactDisplayName } from "@domains/contact.utils";

export type AccountContactManagementState = {
  // Filter state
  contactFilter: "all" | ContactType;
  setContactFilter: (filter: "all" | ContactType) => void;

  // Modal state
  showLinkModal: boolean;
  setShowLinkModal: (show: boolean) => void;
  linkRole: AccountContactRole;
  setLinkRole: (role: AccountContactRole) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  createRole: AccountContactRole;
  setCreateRole: (role: AccountContactRole) => void;
  createPrimary: boolean;
  setCreatePrimary: (primary: boolean) => void;
  showContactsModal: boolean;
  setShowContactsModal: (show: boolean) => void;

  // Computed state
  primaryRoles: Set<AccountContactRole>;
  hasPrimaryForRole: (role: AccountContactRole) => boolean;
  linkedContactIds: Set<EntityId>;
  sortedLinkableContacts: Contact[];
  handleOpenCreateModal: () => void;
};

export type UseAccountContactManagementParams = {
  accountId: EntityId;
  accountContactRelations: Record<
    string,
    {
      accountId: EntityId;
      contactId: EntityId;
      role: AccountContactRole;
      isPrimary?: boolean;
    }
  >;
  allContactsInCrm: Contact[];
};

/**
 * Manages state and logic for account contact management.
 * Handles filtering, linking modals, role management, and primary contact tracking.
 */
export const useAccountContactManagement = ({
  accountId,
  accountContactRelations,
  allContactsInCrm,
}: UseAccountContactManagementParams): AccountContactManagementState => {
  const [contactFilter, setContactFilter] = useState<"all" | ContactType>(
    "all",
  );
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkRole, setLinkRole] = useState<AccountContactRole>(
    "account.contact.role.primary",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRole, setCreateRole] = useState<AccountContactRole>(
    "account.contact.role.primary",
  );
  const [createPrimary, setCreatePrimary] = useState(true);
  const [showContactsModal, setShowContactsModal] = useState(false);

  const primaryRoles = useMemo(() => {
    const roles = new Set<AccountContactRole>();
    Object.values(accountContactRelations).forEach((relation) => {
      if (relation.accountId === accountId && relation.isPrimary) {
        roles.add(relation.role);
      }
    });
    return roles;
  }, [accountContactRelations, accountId]);

  const hasPrimaryForRole = (role: AccountContactRole) =>
    primaryRoles.has(role);

  const linkedContactIds = useMemo(() => {
    const relations = Object.values(accountContactRelations);
    return new Set(
      relations
        .filter((relation) => relation.accountId === accountId)
        .map((relation) => relation.contactId),
    );
  }, [accountContactRelations, accountId]);

  const sortedLinkableContacts = useMemo(() => {
    return [...allContactsInCrm]
      .filter((contact) => !linkedContactIds.has(contact.id))
      .sort((left, right) =>
        getContactDisplayName(left).localeCompare(
          getContactDisplayName(right),
          undefined,
          { sensitivity: "base" },
        ),
      );
  }, [allContactsInCrm, linkedContactIds]);

  const handleOpenCreateModal = () => {
    const defaultRole: AccountContactRole = "account.contact.role.primary";
    setCreateRole(defaultRole);
    setCreatePrimary(!hasPrimaryForRole(defaultRole));
    setShowCreateModal(true);
  };

  return {
    contactFilter,
    setContactFilter,
    showLinkModal,
    setShowLinkModal,
    linkRole,
    setLinkRole,
    showCreateModal,
    setShowCreateModal,
    createRole,
    setCreateRole,
    createPrimary,
    setCreatePrimary,
    showContactsModal,
    setShowContactsModal,
    primaryRoles,
    hasPrimaryForRole,
    linkedContactIds,
    sortedLinkableContacts,
    handleOpenCreateModal,
  };
};
