import type { Audit } from "@domains/audit";
import type { Account } from "@domains/account";
import type { AutomergeDoc } from "@automerge/schema";
import type { Event } from "@events/event";
import type { EntityId, Timestamp } from "@domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "@utils/logger";

const logger = createLogger("AuditReducer");

type AuditCreatedPayload = {
  id: EntityId;
  accountId: EntityId;
  scheduledFor: Timestamp;
  notes?: string;
  floorsVisited?: number[];
};

type AuditRescheduledPayload = {
  id: EntityId;
  scheduledFor: Timestamp;
};

type AuditCompletedPayload = {
  id: EntityId;
  occurredAt: Timestamp;
  score?: number;
  notes?: string;
  floorsVisited?: number[];
};

type AuditNotesUpdatedPayload = {
  id: EntityId;
  notes?: string;
};

type AuditFloorsVisitedUpdatedPayload = {
  id: EntityId;
  floorsVisited: number[];
};

type AuditAccountReassignedPayload = {
  id: EntityId;
  accountId: EntityId;
};

const buildAllowedFloors = (account: Account): Set<number> | null => {
  const minFloor = account.minFloor;
  const maxFloor = account.maxFloor;
  if (minFloor === undefined || maxFloor === undefined) {
    return null;
  }

  if (!Number.isInteger(minFloor) || !Number.isInteger(maxFloor)) {
    throw new Error("Account floor range must use integer values.");
  }

  if (minFloor > maxFloor) {
    throw new Error("Account floor range is invalid: minFloor > maxFloor.");
  }

  const excluded = new Set(account.excludedFloors ?? []);
  const allowed = new Set<number>();
  for (let floor = minFloor; floor <= maxFloor; floor += 1) {
    if (!excluded.has(floor)) {
      allowed.add(floor);
    }
  }

  return allowed;
};

const assertFloorsVisitedValid = (
  account: Account,
  floorsVisited: number[] | undefined,
): void => {
  if (!floorsVisited || floorsVisited.length === 0) {
    return;
  }

  const allowedFloors = buildAllowedFloors(account);
  if (!allowedFloors) {
    throw new Error("Account floor range is not configured for audits.");
  }

  const unique = new Set(floorsVisited);
  if (unique.size !== floorsVisited.length) {
    throw new Error("Audit floors visited must be unique.");
  }

  for (const floor of floorsVisited) {
    if (!Number.isInteger(floor)) {
      throw new Error("Audit floors visited must be integers.");
    }
    if (!allowedFloors.has(floor)) {
      throw new Error(`Audit floor ${floor} is not allowed for this account.`);
    }
  }
};

const getAccountOrThrow = (doc: AutomergeDoc, accountId: EntityId): Account => {
  const account = doc.accounts[accountId];
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  return account;
};

const applyAuditCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AuditCreatedPayload;
  const id = resolveEntityId(event, payload);

  if (payload.accountId == null) {
    throw new Error("Audit accountId is required.");
  }

  if (!payload.scheduledFor) {
    throw new Error("Audit scheduledFor is required.");
  }

  if (doc.audits[id]) {
    throw new Error(`Audit already exists: ${id}`);
  }

  const account = getAccountOrThrow(doc, payload.accountId);
  assertFloorsVisitedValid(account, payload.floorsVisited);

  const audit: Audit = {
    id,
    accountId: payload.accountId,
    scheduledFor: payload.scheduledFor,
    notes: payload.notes,
    floorsVisited: payload.floorsVisited,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  logger.info("Audit created", { id, accountId: payload.accountId });

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: audit,
    },
  };
};

const applyAuditRescheduled = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AuditRescheduledPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  if (!payload.scheduledFor) {
    throw new Error("Audit scheduledFor is required.");
  }

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        scheduledFor: payload.scheduledFor,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditCompleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AuditCompletedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  if (!payload.occurredAt) {
    throw new Error("Audit occurredAt is required.");
  }

  const account = getAccountOrThrow(doc, existing.accountId);
  const nextFloors =
    payload.floorsVisited !== undefined
      ? payload.floorsVisited
      : existing.floorsVisited;
  assertFloorsVisitedValid(account, nextFloors);

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        occurredAt: payload.occurredAt,
        ...(payload.score !== undefined && { score: payload.score }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
        ...(payload.floorsVisited !== undefined && {
          floorsVisited: payload.floorsVisited,
        }),
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditNotesUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AuditNotesUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        notes: payload.notes,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditFloorsVisitedUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AuditFloorsVisitedUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  const account = getAccountOrThrow(doc, existing.accountId);
  assertFloorsVisitedValid(account, payload.floorsVisited);

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        floorsVisited: payload.floorsVisited,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditAccountReassigned = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AuditAccountReassignedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  const account = getAccountOrThrow(doc, payload.accountId);
  assertFloorsVisitedValid(account, existing.floorsVisited);

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        accountId: payload.accountId,
        updatedAt: event.timestamp,
      },
    },
  };
};

export const auditReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "audit.created":
      return applyAuditCreated(doc, event);
    case "audit.rescheduled":
      return applyAuditRescheduled(doc, event);
    case "audit.completed":
      return applyAuditCompleted(doc, event);
    case "audit.notes.updated":
      return applyAuditNotesUpdated(doc, event);
    case "audit.floorsVisited.updated":
      return applyAuditFloorsVisitedUpdated(doc, event);
    case "audit.account.reassigned":
      return applyAuditAccountReassigned(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `audit.reducer does not handle event type: ${event.type}`,
      );
  }
};
