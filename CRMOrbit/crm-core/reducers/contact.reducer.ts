import type { Contact, ContactMethod, ContactMethods } from "../domains/contact";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../shared/types";

type ContactCreatedPayload = {
  id: EntityId;
  type: Contact["type"];
  name: string;
  methods: ContactMethods;
};

type ContactMethodAddedPayload = {
  id?: EntityId;
  methodType: keyof ContactMethods;
  method: ContactMethod;
};

type ContactMethodUpdatedPayload = {
  id?: EntityId;
  methodType: keyof ContactMethods;
  index: number;
  method: ContactMethod;
};

type ContactUpdatedPayload = {
  id?: EntityId;
  name?: string;
  type?: Contact["type"];
  methods?: ContactMethods;
};

const resolveEntityId = <T extends { id?: EntityId }>(
  event: Event,
  payload: T,
): EntityId => {
  if (payload.id && event.entityId && payload.id !== event.entityId) {
    throw new Error(
      `Event entityId mismatch: payload=${payload.id}, event=${event.entityId}`,
    );
  }

  const entityId = payload.id ?? event.entityId;

  if (!entityId) {
    throw new Error("Event entityId is required.");
  }

  return entityId;
};

const assertMethodType = (
  methodType: keyof ContactMethods,
): methodType is keyof ContactMethods => {
  if (methodType !== "emails" && methodType !== "phones") {
    throw new Error(`Invalid contact method type: ${methodType}`);
  }

  return true;
};

const applyContactCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as ContactCreatedPayload;
  const id = resolveEntityId(event, payload);

  if (doc.contacts[id]) {
    throw new Error(`Contact already exists: ${id}`);
  }

  if (!payload.methods || !payload.methods.emails || !payload.methods.phones) {
    throw new Error("Contact methods must include emails and phones arrays.");
  }

  const contact: Contact = {
    id,
    type: payload.type,
    name: payload.name,
    methods: {
      emails: [...payload.methods.emails],
      phones: [...payload.methods.phones],
    },
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  return {
    ...doc,
    contacts: {
      ...doc.contacts,
      [id]: contact,
    },
  };
};

const applyContactMethodAdded = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as ContactMethodAddedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.contacts[id] as Contact | undefined;

  if (!existing) {
    throw new Error(`Contact not found: ${id}`);
  }

  assertMethodType(payload.methodType);

  return {
    ...doc,
    contacts: {
      ...doc.contacts,
      [id]: {
        ...existing,
        methods: {
          ...existing.methods,
          [payload.methodType]: [
            ...existing.methods[payload.methodType],
            payload.method,
          ],
        },
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyContactMethodUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as ContactMethodUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.contacts[id] as Contact | undefined;

  if (!existing) {
    throw new Error(`Contact not found: ${id}`);
  }

  assertMethodType(payload.methodType);

  const methods = existing.methods[payload.methodType];

  if (payload.index < 0 || payload.index >= methods.length) {
    throw new Error(
      `Contact method index out of bounds: ${payload.index}`,
    );
  }

  const nextMethods = [...methods];
  nextMethods[payload.index] = payload.method;

  return {
    ...doc,
    contacts: {
      ...doc.contacts,
      [id]: {
        ...existing,
        methods: {
          ...existing.methods,
          [payload.methodType]: nextMethods,
        },
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyContactUpdated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as ContactUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.contacts[id] as Contact | undefined;

  if (!existing) {
    throw new Error(`Contact not found: ${id}`);
  }

  return {
    ...doc,
    contacts: {
      ...doc.contacts,
      [id]: {
        ...existing,
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.type !== undefined && { type: payload.type }),
        ...(payload.methods !== undefined && {
          methods: {
            emails: [...payload.methods.emails],
            phones: [...payload.methods.phones],
          },
        }),
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyContactDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.contacts[id] as Contact | undefined;

  if (!existing) {
    throw new Error(`Contact not found: ${id}`);
  }

  // Remove the contact
  const { [id]: removed, ...remainingContacts } = doc.contacts;

  return {
    ...doc,
    contacts: remainingContacts,
  };
};

export const contactReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  switch (event.type) {
    case "contact.created":
      return applyContactCreated(doc, event);
    case "contact.method.added":
      return applyContactMethodAdded(doc, event);
    case "contact.method.updated":
      return applyContactMethodUpdated(doc, event);
    case "contact.updated":
      return applyContactUpdated(doc, event);
    case "contact.deleted":
      return applyContactDeleted(doc, event);
    default:
      throw new Error(`contact.reducer does not handle event type: ${event.type}`);
  }
};
