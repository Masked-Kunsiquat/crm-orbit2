import type {
  Account,
  AccountAuditFrequency,
  AccountAuditFrequencyChangeTiming,
  AccountStatus,
  AccountAddresses,
  SocialMediaLinks,
  AccountCalendarMatch,
} from "../domains/account";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";
import {
  DEFAULT_ACCOUNT_AUDIT_FREQUENCY,
  isAccountAuditFrequency,
  getAccountAuditFrequencyMonths,
  getMonthStartTimestamp,
  getPeriodStartFromAnchor,
  addMonthsToPeriodStart,
  resolveAccountAuditFrequency,
  sanitizeAccountCalendarMatch,
} from "../domains/account.utils";

const logger = createLogger("AccountReducer");

type AccountCreatedPayload = {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  auditFrequency?: AccountAuditFrequency;
  addresses?: AccountAddresses;
  minFloor?: number;
  maxFloor?: number;
  excludedFloors?: number[];
  website?: string;
  socialMedia?: SocialMediaLinks;
  calendarMatch?: AccountCalendarMatch;
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
  auditFrequency?: AccountAuditFrequency;
  auditFrequencyChangeTiming?: AccountAuditFrequencyChangeTiming;
  organizationId?: EntityId;
  addresses?: AccountAddresses;
  minFloor?: number;
  maxFloor?: number;
  excludedFloors?: number[];
  website?: string;
  socialMedia?: SocialMediaLinks;
  calendarMatch?: AccountCalendarMatch | null;
};

const assertValidFloorConfig = (
  minFloor: number | undefined,
  maxFloor: number | undefined,
  excludedFloors: number[] | undefined,
): void => {
  const hasMin = typeof minFloor === "number";
  const hasMax = typeof maxFloor === "number";

  if (hasMin !== hasMax) {
    throw new Error("Account floor range requires both minFloor and maxFloor.");
  }

  if (!hasMin || !hasMax) {
    if (excludedFloors && excludedFloors.length > 0) {
      throw new Error(
        "Account floor exclusions require minFloor and maxFloor.",
      );
    }
    return;
  }

  if (!Number.isInteger(minFloor) || !Number.isInteger(maxFloor)) {
    throw new Error("Account floor range must use integer values.");
  }

  if (minFloor > maxFloor) {
    throw new Error("Account floor range is invalid: minFloor > maxFloor.");
  }

  if (excludedFloors && excludedFloors.length > 0) {
    const unique = new Set(excludedFloors);
    if (unique.size !== excludedFloors.length) {
      throw new Error("Account excluded floors must be unique.");
    }
    for (const floor of excludedFloors) {
      if (!Number.isInteger(floor)) {
        throw new Error("Account excluded floors must be integers.");
      }
      if (floor < minFloor || floor > maxFloor) {
        throw new Error(
          `Account excluded floor ${floor} is outside the configured range.`,
        );
      }
    }
  }
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

  assertValidFloorConfig(
    payload.minFloor,
    payload.maxFloor,
    payload.excludedFloors,
  );
  if (
    payload.auditFrequency !== undefined &&
    !isAccountAuditFrequency(payload.auditFrequency)
  ) {
    throw new Error("Invalid account audit frequency.");
  }
  const auditFrequency =
    payload.auditFrequency ?? DEFAULT_ACCOUNT_AUDIT_FREQUENCY;
  const frequencyUpdatedAt = event.timestamp;
  const frequencyAnchorAt =
    getMonthStartTimestamp(event.timestamp) ?? event.timestamp;
  const calendarMatch = sanitizeAccountCalendarMatch(payload.calendarMatch);

  const account: Account = {
    id,
    organizationId: payload.organizationId,
    name: payload.name,
    status: payload.status,
    auditFrequency,
    auditFrequencyUpdatedAt: frequencyUpdatedAt,
    auditFrequencyAnchorAt: frequencyAnchorAt,
    addresses: payload.addresses,
    minFloor: payload.minFloor,
    maxFloor: payload.maxFloor,
    excludedFloors: payload.excludedFloors,
    website: payload.website,
    socialMedia: payload.socialMedia,
    calendarMatch,
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

  const nextMinFloor =
    payload.minFloor !== undefined ? payload.minFloor : existing.minFloor;
  const nextMaxFloor =
    payload.maxFloor !== undefined ? payload.maxFloor : existing.maxFloor;
  const nextExcludedFloors =
    payload.excludedFloors !== undefined
      ? payload.excludedFloors
      : existing.excludedFloors;

  assertValidFloorConfig(nextMinFloor, nextMaxFloor, nextExcludedFloors);

  if (
    payload.auditFrequency !== undefined &&
    !isAccountAuditFrequency(payload.auditFrequency)
  ) {
    throw new Error("Invalid account audit frequency.");
  }

  const existingFrequency = resolveAccountAuditFrequency(
    existing.auditFrequency,
  );
  const existingFrequencyUpdatedAt =
    existing.auditFrequencyUpdatedAt ?? existing.createdAt ?? event.timestamp;
  const existingFrequencyAnchorAt =
    existing.auditFrequencyAnchorAt ??
    getMonthStartTimestamp(existingFrequencyUpdatedAt) ??
    event.timestamp;

  let nextFrequency = existingFrequency;
  let nextFrequencyUpdatedAt = existingFrequencyUpdatedAt;
  let nextFrequencyAnchorAt = existingFrequencyAnchorAt;
  let nextFrequencyPending = existing.auditFrequencyPending;
  let nextFrequencyPendingEffectiveAt =
    existing.auditFrequencyPendingEffectiveAt;

  const frequencyChanged =
    payload.auditFrequency !== undefined &&
    payload.auditFrequency !== existingFrequency;

  if (frequencyChanged) {
    const changeTiming =
      payload.auditFrequencyChangeTiming ??
      "account.auditFrequencyChange.immediate";
    const updatedFrequency = payload.auditFrequency ?? existingFrequency;

    if (changeTiming === "account.auditFrequencyChange.nextPeriod") {
      const months = getAccountAuditFrequencyMonths(existingFrequency);
      const currentPeriodStart =
        getPeriodStartFromAnchor(
          existingFrequencyAnchorAt,
          months,
          event.timestamp,
        ) ?? existingFrequencyAnchorAt;
      const pendingEffectiveAt =
        addMonthsToPeriodStart(currentPeriodStart, months) ??
        currentPeriodStart;

      nextFrequencyPending = updatedFrequency;
      nextFrequencyPendingEffectiveAt = pendingEffectiveAt;
    } else {
      nextFrequency = updatedFrequency;
      nextFrequencyUpdatedAt = event.timestamp;
      nextFrequencyAnchorAt =
        getMonthStartTimestamp(event.timestamp) ?? existingFrequencyAnchorAt;
      nextFrequencyPending = undefined;
      nextFrequencyPendingEffectiveAt = undefined;
    }
  }

  const hasCalendarMatch = Object.prototype.hasOwnProperty.call(
    payload,
    "calendarMatch",
  );
  const nextCalendarMatch = hasCalendarMatch
    ? sanitizeAccountCalendarMatch(payload.calendarMatch)
    : existing.calendarMatch;

  logger.debug("Updating account", { id, updates: payload });

  return {
    ...doc,
    accounts: {
      ...doc.accounts,
      [id]: {
        ...existing,
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.status !== undefined && { status: payload.status }),
        auditFrequency: nextFrequency,
        auditFrequencyUpdatedAt: nextFrequencyUpdatedAt,
        auditFrequencyAnchorAt: nextFrequencyAnchorAt,
        ...(nextFrequencyPending !== undefined && {
          auditFrequencyPending: nextFrequencyPending,
        }),
        ...(nextFrequencyPendingEffectiveAt !== undefined && {
          auditFrequencyPendingEffectiveAt: nextFrequencyPendingEffectiveAt,
        }),
        ...(nextFrequencyPending === undefined && {
          auditFrequencyPending: undefined,
          auditFrequencyPendingEffectiveAt: undefined,
        }),
        ...(payload.organizationId !== undefined && {
          organizationId: payload.organizationId,
        }),
        ...(payload.addresses !== undefined && {
          addresses: payload.addresses,
        }),
        ...(payload.minFloor !== undefined && { minFloor: payload.minFloor }),
        ...(payload.maxFloor !== undefined && { maxFloor: payload.maxFloor }),
        ...(payload.excludedFloors !== undefined && {
          excludedFloors: payload.excludedFloors,
        }),
        ...(payload.website !== undefined && { website: payload.website }),
        ...(payload.socialMedia !== undefined && {
          socialMedia: payload.socialMedia,
        }),
        ...(hasCalendarMatch && { calendarMatch: nextCalendarMatch }),
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
