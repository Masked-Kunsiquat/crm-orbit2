import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import type { ContactMethod } from "../domains/contact";
import type { EntityId } from "../shared/types";
import { useDispatch } from "./useDispatch";

let idCounter = 0;

const nextId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

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
      methodType: "email" | "phone",
      method: ContactMethod,
    ) => {
      const id = nextId("contactMethod");
      const event = buildEvent({
        type: "contact.method.added",
        entityId: id,
        payload: {
          contactId,
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
      methodType: "email" | "phone",
      oldValue: string,
      newMethod: ContactMethod,
    ) => {
      const id = nextId("updateMethod");
      const event = buildEvent({
        type: "contact.method.updated",
        entityId: id,
        payload: {
          contactId,
          methodType,
          oldValue,
          newMethod,
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
