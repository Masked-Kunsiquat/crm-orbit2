import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import type { ContactMethod } from "../domains/contact";
import { nextId } from "../shared/idGenerator";
import type { EntityId } from "../shared/types";
import { useDispatch } from "./useDispatch";

export const useContactActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createContact = useCallback(
    (
      name: string,
      type = "contact.type.internal",
      methods: {
        emails?: ContactMethod[];
        phones?: ContactMethod[];
      } = {},
    ) => {
      const id = nextId("contact");
      const event = buildEvent({
        type: "contact.created",
        entityId: id,
        payload: {
          id,
          type,
          name,
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

  return {
    createContact,
    addContactMethod,
    updateContactMethod,
  };
};
