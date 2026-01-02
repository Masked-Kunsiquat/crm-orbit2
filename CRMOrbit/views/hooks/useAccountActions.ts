import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type {
  Account,
  AccountAddresses,
  SocialMediaLinks,
} from "../../domains/account";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import { detectAccountChanges } from "../../utils/historyChanges";

export const useAccountActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createAccount = useCallback(
    (
      organizationId: EntityId,
      name: string,
      status = "account.status.active",
      addresses?: AccountAddresses,
      website?: string,
      socialMedia?: SocialMediaLinks,
    ): DispatchResult => {
      const id = nextId("account");
      const event = buildEvent({
        type: "account.created",
        entityId: id,
        payload: {
          id,
          organizationId,
          name,
          status,
          addresses,
          website,
          socialMedia,
          metadata: {},
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAccountStatus = useCallback(
    (accountId: EntityId, status: string): DispatchResult => {
      const event = buildEvent({
        type: "account.status.updated",
        entityId: accountId,
        payload: {
          status,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAccount = useCallback(
    (
      accountId: EntityId,
      name: string,
      status: string,
      organizationId?: EntityId,
      addresses?: AccountAddresses,
      website?: string,
      socialMedia?: SocialMediaLinks,
      previousAccount?: Account,
    ): DispatchResult => {
      const changes = previousAccount
        ? detectAccountChanges(previousAccount, {
            name,
            status,
            website,
            addresses,
          })
        : undefined;

      const event = buildEvent({
        type: "account.updated",
        entityId: accountId,
        payload: {
          name,
          status,
          ...(organizationId && { organizationId }),
          addresses,
          website,
          socialMedia,
          ...(changes && changes.length > 0 && { changes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const linkContact = useCallback(
    (
      accountId: EntityId,
      contactId: EntityId,
      role = "account.contact.role.primary",
      isPrimary = false,
    ): DispatchResult => {
      const id = nextId("accountContact");
      const event = buildEvent({
        type: "account.contact.linked",
        entityId: id,
        payload: {
          id,
          accountId,
          contactId,
          role,
          isPrimary,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const setPrimaryContact = useCallback(
    (
      accountId: EntityId,
      contactId: EntityId,
      role: string,
    ): DispatchResult => {
      const id = nextId("setPrimary");
      const event = buildEvent({
        type: "account.contact.setPrimary",
        entityId: id,
        payload: {
          accountId,
          contactId,
          role,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const unsetPrimaryContact = useCallback(
    (
      accountId: EntityId,
      contactId: EntityId,
      role: string,
    ): DispatchResult => {
      const id = nextId("unsetPrimary");
      const event = buildEvent({
        type: "account.contact.unsetPrimary",
        entityId: id,
        payload: {
          accountId,
          contactId,
          role,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const unlinkContact = useCallback(
    (accountId: EntityId, contactId: EntityId): DispatchResult => {
      const id = nextId("unlinkContact");
      const event = buildEvent({
        type: "account.contact.unlinked",
        entityId: id,
        payload: {
          accountId,
          contactId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const deleteAccount = useCallback(
    (accountId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "account.deleted",
        entityId: accountId,
        payload: {
          id: accountId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createAccount,
    updateAccountStatus,
    updateAccount,
    linkContact,
    unlinkContact,
    setPrimaryContact,
    unsetPrimaryContact,
    deleteAccount,
  };
};
