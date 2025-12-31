import type { Account, AccountStatus } from "../domains/account";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";

type AccountCreatedPayload = {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  metadata?: Record<string, unknown>;
};

type AccountStatusUpdatedPayload = {
  id: EntityId;
  status: AccountStatus;
};

type AccountUpdatedPayload = {
  id?: EntityId;
  name?: string;
  status?: AccountStatus;
  organizationId?: EntityId;
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

const applyAccountCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AccountCreatedPayload;
  const id = resolveEntityId(event, payload);

  if (doc.accounts[id]) {
    throw new Error(`Account already exists: ${id}`);
  }

  if (!doc.organizations[payload.organizationId]) {
    throw new Error(
      `Organization not found for account: ${payload.organizationId}`,
    );
  }

  const account: Account = {
    id,
    organizationId: payload.organizationId,
    name: payload.name,
    status: payload.status,
    metadata: payload.metadata,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  return {
    ...doc,
    accounts: {
      ...doc.accounts,
      [id]: account,
    },
  };
};

const applyAccountStatusUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AccountStatusUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.accounts[id] as Account | undefined;

  if (!existing) {
    throw new Error(`Account not found: ${id}`);
  }

  return {
    ...doc,
    accounts: {
      ...doc.accounts,
      [id]: {
        ...existing,
        status: payload.status,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAccountUpdated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AccountUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.accounts[id] as Account | undefined;

  if (!existing) {
    throw new Error(`Account not found: ${id}`);
  }

  // Validate organization if being changed
  if (payload.organizationId && !doc.organizations[payload.organizationId]) {
    throw new Error(`Organization not found: ${payload.organizationId}`);
  }

  return {
    ...doc,
    accounts: {
      ...doc.accounts,
      [id]: {
        ...existing,
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.status !== undefined && { status: payload.status }),
        ...(payload.organizationId !== undefined && { organizationId: payload.organizationId }),
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAccountDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.accounts[id] as Account | undefined;

  if (!existing) {
    throw new Error(`Account not found: ${id}`);
  }

  const hasLinkedContacts = Object.values(doc.relations.accountContacts).some(
    (relation) => relation.accountId === id,
  );
  if (hasLinkedContacts) {
    throw new Error(`Cannot delete account ${id}: contacts still linked`);
  }

  // Remove the account
  const { [id]: removed, ...remainingAccounts } = doc.accounts;

  return {
    ...doc,
    accounts: remainingAccounts,
  };
};

export const accountReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  switch (event.type) {
    case "account.created":
      return applyAccountCreated(doc, event);
    case "account.status.updated":
      return applyAccountStatusUpdated(doc, event);
    case "account.updated":
      return applyAccountUpdated(doc, event);
    case "account.deleted":
      return applyAccountDeleted(doc, event);
    default:
      throw new Error(
        `account.reducer does not handle event type: ${event.type}`,
      );
  }
};
