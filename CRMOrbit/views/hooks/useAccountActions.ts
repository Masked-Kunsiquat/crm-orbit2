import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useAccountActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createAccount = useCallback(
    (
      organizationId: EntityId,
      name: string,
      status = "account.status.active",
    ): DispatchResult & { id: string } => {
      const id = nextId("account");
      const event = buildEvent({
        type: "account.created",
        entityId: id,
        payload: {
          id,
          organizationId,
          name,
          status,
          metadata: {},
        },
        deviceId,
      });

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  const updateAccountStatus = useCallback(
    (accountId: EntityId, status: string) => {
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
    [deviceId],
  );

  const updateAccount = useCallback(
    (
      accountId: EntityId,
      name: string,
      status: string,
      organizationId?: EntityId,
    ): DispatchResult => {
      const event = buildEvent({
        type: "account.updated",
        entityId: accountId,
        payload: {
          name,
          status,
          ...(organizationId && { organizationId }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  const linkContact = useCallback(
    (
      accountId: EntityId,
      contactId: EntityId,
      role = "account.contact.role.primary",
      isPrimary = false,
    ) => {
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
    [deviceId],
  );

  const setPrimaryContact = useCallback(
    (accountId: EntityId, contactId: EntityId, role: string) => {
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
    [deviceId],
  );

  const unsetPrimaryContact = useCallback(
    (accountId: EntityId, contactId: EntityId, role: string) => {
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
    [deviceId],
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
    [deviceId],
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
    [deviceId],
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
