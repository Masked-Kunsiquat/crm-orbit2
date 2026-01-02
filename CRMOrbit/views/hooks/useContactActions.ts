import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { Contact, ContactMethod } from "../../domains/contact";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import { detectContactChanges } from "../../utils/historyChanges";

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
    ): DispatchResult => {
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

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const addContactMethod = useCallback(
    (
      contactId: EntityId,
      methodType: "emails" | "phones",
      method: ContactMethod,
    ): DispatchResult => {
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
    [deviceId, dispatch],
  );

  const updateContactMethod = useCallback(
    (
      contactId: EntityId,
      methodType: "emails" | "phones",
      index: number,
      method: ContactMethod,
      previousMethod?: ContactMethod,
    ): DispatchResult => {
      const event = buildEvent({
        type: "contact.method.updated",
        entityId: contactId,
        payload: {
          methodType,
          index,
          method,
          ...(previousMethod && { previousMethod }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
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
      previousContact?: Contact,
    ): DispatchResult => {
      const changes =
        previousContact
          ? detectContactChanges(previousContact, {
              firstName,
              lastName,
              type,
              title,
              methods: {
                emails: methods.emails ?? [],
                phones: methods.phones ?? [],
              },
            })
          : undefined;

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
          ...(changes && changes.length > 0 && { changes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
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
    [deviceId, dispatch],
  );

  return {
    createContact,
    addContactMethod,
    updateContactMethod,
    updateContact,
    deleteContact,
  };
};
