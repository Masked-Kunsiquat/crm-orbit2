import { useCallback } from "react";

import type { Contact, ContactMethod } from "../../domains/contact";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import {
  createContact as createContactAction,
  updateContact as updateContactAction,
  addContactMethod as addContactMethodAction,
  updateContactMethod as updateContactMethodAction,
  deleteContact as deleteContactAction,
} from "@domains/actions";

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
      idOverride?: EntityId,
    ): DispatchResult => {
      return createContactAction(dispatch, deviceId, {
        firstName,
        lastName,
        type,
        title,
        methods,
        idOverride,
      });
    },
    [deviceId, dispatch],
  );

  const addContactMethod = useCallback(
    (
      contactId: EntityId,
      methodType: "emails" | "phones",
      method: ContactMethod,
    ): DispatchResult => {
      return addContactMethodAction(dispatch, deviceId, contactId, {
        methodType,
        method,
      });
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
      return updateContactMethodAction(dispatch, deviceId, contactId, {
        methodType,
        index,
        method,
        previousMethod,
      });
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
      _previousContact?: Contact, // Kept for backwards compatibility, unused since change detection moved to view layer
    ): DispatchResult => {
      return updateContactAction(dispatch, deviceId, contactId, {
        firstName,
        lastName,
        type,
        title,
        methods,
      });
    },
    [deviceId, dispatch],
  );

  const deleteContact = useCallback(
    (contactId: EntityId): DispatchResult => {
      return deleteContactAction(dispatch, deviceId, contactId);
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
