import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { ContactMethod } from "../../domains/contact";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useContactActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createContact = useCallback(
    (
      firstName: string,
      lastName: string,
      type = "contact.type.internal",
      title?: string,
      methods: {
        emails?: ContactMethod[];
        phones?: ContactMethod[];
      } = {},
    ): DispatchResult & { id: string } => {
      const id = nextId("contact");
      const event = buildEvent({
        type: "contact.created",
        entityId: id,
        payload: {
          id,
          type,
          firstName,
          lastName,
          title,
          methods: {
            emails: methods.emails ?? [],
            phones: methods.phones ?? [],
          },
        },
        deviceId,
      });

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  const addContactMethod = useCallback(
    (
      contactId: EntityId,
      methodType: "emails" | "phones",
      method: ContactMethod,
    ) => {
      const event = buildEvent({
        type: "contact.method.added",
        entityId: contactId,
        payload: {
          methodType,
          method,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  const updateContactMethod = useCallback(
    (
      contactId: EntityId,
      methodType: "emails" | "phones",
      index: number,
      method: ContactMethod,
    ) => {
      const event = buildEvent({
        type: "contact.method.updated",
        entityId: contactId,
        payload: {
          methodType,
          index,
          method,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  const updateContact = useCallback(
    (
      contactId: EntityId,
      firstName: string,
      lastName: string,
      type: string,
      title?: string,
      methods: {
        emails?: ContactMethod[];
        phones?: ContactMethod[];
      } = {},
    ): DispatchResult => {
      const event = buildEvent({
        type: "contact.updated",
        entityId: contactId,
        payload: {
          firstName,
          lastName,
          title,
          type,
          methods: {
            emails: methods.emails ?? [],
            phones: methods.phones ?? [],
          },
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  const deleteContact = useCallback(
    (contactId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "contact.deleted",
        entityId: contactId,
        payload: {
          id: contactId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  return {
    createContact,
    addContactMethod,
    updateContactMethod,
    updateContact,
    deleteContact,
  };
};
