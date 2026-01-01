import type {
  Account,
  AccountStatus,
  AccountAddresses,
  SocialMediaLinks,
} from "../domains/account";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("AccountReducer");

type AccountCreatedPayload = {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  addresses?: AccountAddresses;
  website?: string;
  socialMedia?: SocialMediaLinks;
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
  addresses?: AccountAddresses;
  website?: string;
  socialMedia?: SocialMediaLinks;
};

const applyAccountCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AccountCreatedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Creating account", {
    id,
    organizationId: payload.organizationId,
  });

  if (doc.accounts[id]) {
    logger.error("Account already exists", { id });
    throw new Error(`Account already exists: ${id}`);
  }

  if (!doc.organizations[payload.organizationId]) {
    logger.error("Organization not found for account", {
      organizationId: payload.organizationId,
    });
    throw new Error(
      `Organization not found for account: ${payload.organizationId}`,
    );
  }

  const account: Account = {
    id,
    organizationId: payload.organizationId,
    name: payload.name,
    status: payload.status,
    addresses: payload.addresses,
    website: payload.website,
    socialMedia: payload.socialMedia,
    metadata: payload.metadata,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  logger.info("Account created", {
    id,
    name: payload.name,
    status: payload.status,
  });

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
    logger.error("Account not found for update", { id });
    throw new Error(`Account not found: ${id}`);
  }

  // Validate organization if being changed
  if (payload.organizationId && !doc.organizations[payload.organizationId]) {
    logger.error("Organization not found for account update", {
      organizationId: payload.organizationId,
    });
    throw new Error(`Organization not found: ${payload.organizationId}`);
  }

  logger.debug("Updating account", { id, updates: payload });

  return {
    ...doc,
    accounts: {
      ...doc.accounts,
      [id]: {
        ...existing,
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.status !== undefined && { status: payload.status }),
        ...(payload.organizationId !== undefined && {
          organizationId: payload.organizationId,
        }),
        ...(payload.addresses !== undefined && {
          addresses: payload.addresses,
        }),
        ...(payload.website !== undefined && { website: payload.website }),
        ...(payload.socialMedia !== undefined && {
          socialMedia: payload.socialMedia,
        }),
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
    logger.error("Account not found for deletion", { id });
    throw new Error(`Account not found: ${id}`);
  }

  const hasLinkedContacts = Object.values(doc.relations.accountContacts).some(
    (relation) => relation.accountId === id,
  );
  if (hasLinkedContacts) {
    logger.warn("Cannot delete account with linked contacts", { id });
    throw new Error(`Cannot delete account ${id}: contacts still linked`);
  }

  logger.info("Account deleted", { id });

  // Remove the account
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingAccounts } = doc.accounts;

  return {
    ...doc,
    accounts: remainingAccounts,
  };
};

export const accountReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

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
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `account.reducer does not handle event type: ${event.type}`,
      );
  }
};
