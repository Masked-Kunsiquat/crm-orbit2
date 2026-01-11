import type { Event } from "@events/event";
import type { ContactMethod } from "@domains/contact";
import type { DeviceId, EntityId } from "@domains/shared/types";
import { nextId } from "@domains/shared/idGenerator";
import { buildTypedEvent } from "./eventBuilder";
import type { EventDispatcher, DispatchResult } from "./entityLinkActions";

export type CreateContactParams = {
  firstName: string;
  lastName: string;
  type?: string;
  title?: string;
  methods?: {
    emails?: ContactMethod[];
    phones?: ContactMethod[];
  };
  idOverride?: EntityId;
};

export type UpdateContactParams = {
  firstName: string;
  lastName: string;
  type: string;
  title?: string;
  methods?: {
    emails?: ContactMethod[];
    phones?: ContactMethod[];
  };
};

export type AddContactMethodParams = {
  methodType: "emails" | "phones";
  method: ContactMethod;
};

export type UpdateContactMethodParams = {
  methodType: "emails" | "phones";
  index: number;
  method: ContactMethod;
  previousMethod?: ContactMethod;
};

/**
 * Creates a new contact
 */
export const createContact = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  params: CreateContactParams,
): DispatchResult => {
  const id = params.idOverride ?? nextId("contact");
  const event: Event = buildTypedEvent({
    type: "contact.created",
    entityId: id,
    payload: {
      id,
      type: params.type ?? "contact.type.internal",
      firstName: params.firstName,
      lastName: params.lastName,
      title: params.title,
      methods: {
        emails: params.methods?.emails ?? [],
        phones: params.methods?.phones ?? [],
      },
    },
    deviceId,
  });

  return dispatch([event]);
};

/**
 * Updates an existing contact
 */
export const updateContact = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  contactId: EntityId,
  params: UpdateContactParams,
): DispatchResult => {
  const event: Event = buildTypedEvent({
    type: "contact.updated",
    entityId: contactId,
    payload: {
      firstName: params.firstName,
      lastName: params.lastName,
      title: params.title,
      type: params.type,
      methods: {
        emails: params.methods?.emails ?? [],
        phones: params.methods?.phones ?? [],
      },
    },
    deviceId,
  });

  return dispatch([event]);
};

/**
 * Adds a contact method (email or phone)
 */
export const addContactMethod = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  contactId: EntityId,
  params: AddContactMethodParams,
): DispatchResult => {
  const event: Event = buildTypedEvent({
    type: "contact.method.added",
    entityId: contactId,
    payload: {
      methodType: params.methodType,
      method: params.method,
    },
    deviceId,
  });

  return dispatch([event]);
};

/**
 * Updates a contact method (email or phone)
 */
export const updateContactMethod = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  contactId: EntityId,
  params: UpdateContactMethodParams,
): DispatchResult => {
  const event: Event = buildTypedEvent({
    type: "contact.method.updated",
    entityId: contactId,
    payload: {
      methodType: params.methodType,
      index: params.index,
      method: params.method,
      ...(params.previousMethod && { previousMethod: params.previousMethod }),
    },
    deviceId,
  });

  return dispatch([event]);
};

/**
 * Deletes a contact
 */
export const deleteContact = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  contactId: EntityId,
): DispatchResult => {
  const event: Event = buildTypedEvent({
    type: "contact.deleted",
    entityId: contactId,
    payload: {
      id: contactId,
    },
    deviceId,
  });

  return dispatch([event]);
};
