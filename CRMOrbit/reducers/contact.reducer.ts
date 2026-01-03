import type {
  Contact,
  ContactMethod,
  ContactMethods,
} from "../domains/contact";
import { splitLegacyName } from "../domains/contact.utils";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("ContactReducer");

type ContactCreatedPayload = {
  id: EntityId;
  type: Contact["type"];
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
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
  firstName?: string;
  lastName?: string;
  title?: string;
  type?: Contact["type"];
  methods?: ContactMethods;
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

  logger.debug("Creating contact", { id, type: payload.type });

  if (doc.contacts[id]) {
    logger.error("Contact already exists", { id });
    throw new Error(`Contact already exists: ${id}`);
  }

  if (!payload.methods || !payload.methods.emails || !payload.methods.phones) {
    logger.error("Invalid contact methods", { id, methods: payload.methods });
    throw new Error("Contact methods must include emails and phones arrays.");
  }

  const legacyName =
    typeof payload.name === "string" ? payload.name.trim() : "";
  const legacySplit = legacyName ? splitLegacyName(legacyName) : undefined;
  const resolvedFirstName =
    payload.firstName ?? legacySplit?.firstName ?? "";
  const resolvedLastName = payload.lastName ?? legacySplit?.lastName ?? "";
  const resolvedName =
    legacyName || `${resolvedFirstName} ${resolvedLastName}`.trim();

  const contact: Contact = {
    id,
    type: payload.type,
    ...(resolvedName && { name: resolvedName }),
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    title: payload.title,
    methods: {
      emails: [...payload.methods.emails],
      phones: [...payload.methods.phones],
    },
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  logger.info("Contact created", {
    id,
    name: resolvedName,
  });

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
    throw new Error(`Contact method index out of bounds: ${payload.index}`);
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
    logger.error("Contact not found for update", { id });
    throw new Error(`Contact not found: ${id}`);
  }

  logger.debug("Updating contact", { id, updates: payload });

  const nameValue = typeof payload.name === "string" ? payload.name : undefined;
  const legacyName = nameValue ? nameValue.trim() : "";
  const legacySplit = legacyName ? splitLegacyName(legacyName) : undefined;
  const nextFirstName =
    payload.firstName ?? legacySplit?.firstName ?? existing.firstName;
  const nextLastName =
    payload.lastName ?? legacySplit?.lastName ?? existing.lastName;
  const nextLegacyName = legacyName || `${nextFirstName} ${nextLastName}`.trim();
  const shouldUpdateName =
    payload.firstName !== undefined ||
    payload.lastName !== undefined ||
    payload.name !== undefined;

  return {
    ...doc,
    contacts: {
      ...doc.contacts,
      [id]: {
        ...existing,
        ...(shouldUpdateName && { name: nextLegacyName || undefined }),
        ...((payload.firstName !== undefined || legacySplit) && {
          firstName: nextFirstName,
        }),
        ...((payload.lastName !== undefined || legacySplit) && {
          lastName: nextLastName,
        }),
        ...(payload.title !== undefined && { title: payload.title }),
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
    logger.error("Contact not found for deletion", { id });
    throw new Error(`Contact not found: ${id}`);
  }

  logger.info("Contact deleted", { id });

  // Remove the contact
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingContacts } = doc.contacts;

  return {
    ...doc,
    contacts: remainingContacts,
  };
};

export const contactReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

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
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `contact.reducer does not handle event type: ${event.type}`,
      );
  }
};
