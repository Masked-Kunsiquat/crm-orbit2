import type { Audit, AuditStatus } from "@domains/audit";
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
  durationMinutes?: number;
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
  durationMinutes?: number;
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

type AuditDeletedPayload = {
  id: EntityId;
};

type AuditCanceledPayload = {
  id: EntityId;
};

type AuditDurationUpdatedPayload = {
  id: EntityId;
  durationMinutes: number;
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

const DEFAULT_MIGRATION_DURATION_MINUTES = 60;

const resolveAuditDurationMinutes = (
  durationMinutes: number | undefined,
  auditId: EntityId,
  options: { allowFallback?: boolean } = {},
): number => {
  if (durationMinutes == null) {
    if (options.allowFallback) {
      logger.warn("Audit duration missing, applying migration default", {
        auditId,
        durationMinutes: DEFAULT_MIGRATION_DURATION_MINUTES,
      });
      return DEFAULT_MIGRATION_DURATION_MINUTES;
    }
    throw new Error("Audit durationMinutes is required.");
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Audit durationMinutes must be a positive integer.");
  }

  return durationMinutes;
};

const resolveAuditStatus = (audit: Audit): AuditStatus => {
  if (audit.status) {
    return audit.status;
  }
  return audit.occurredAt
    ? "audits.status.completed"
    : "audits.status.scheduled";
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

  const durationMinutes = resolveAuditDurationMinutes(
    payload.durationMinutes,
    id,
    { allowFallback: true },
  );

  if (doc.audits[id]) {
    throw new Error(`Audit already exists: ${id}`);
  }

  const account = getAccountOrThrow(doc, payload.accountId);
  assertFloorsVisitedValid(account, payload.floorsVisited);

  const audit: Audit = {
    id,
    accountId: payload.accountId,
    scheduledFor: payload.scheduledFor,
    durationMinutes,
    status: "audits.status.scheduled",
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

  const status = resolveAuditStatus(existing);
  if (status === "audits.status.completed") {
    throw new Error("Completed audits cannot be rescheduled.");
  }

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        scheduledFor: payload.scheduledFor,
        status: "audits.status.scheduled",
        occurredAt:
          status === "audits.status.canceled" ? undefined : existing.occurredAt,
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

  const durationMinutes = resolveAuditDurationMinutes(
    payload.durationMinutes ?? existing.durationMinutes,
    id,
  );

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
        status: "audits.status.completed",
        durationMinutes,
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

const applyAuditCanceled = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AuditCanceledPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  const status = resolveAuditStatus(existing);
  if (status === "audits.status.completed") {
    throw new Error("Completed audits cannot be canceled.");
  }

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        status: "audits.status.canceled",
        occurredAt: undefined,
        score: undefined,
        floorsVisited: undefined,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditDurationUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as AuditDurationUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  const durationMinutes = resolveAuditDurationMinutes(
    payload.durationMinutes,
    id,
  );

  return {
    ...doc,
    audits: {
      ...doc.audits,
      [id]: {
        ...existing,
        durationMinutes,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyAuditDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as AuditDeletedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.audits[id];

  if (!existing) {
    throw new Error(`Audit not found: ${id}`);
  }

  logger.info("Audit deleted", { id });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingAudits } = doc.audits;

  return {
    ...doc,
    audits: remainingAudits,
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
    case "audit.canceled":
      return applyAuditCanceled(doc, event);
    case "audit.duration.updated":
      return applyAuditDurationUpdated(doc, event);
    case "audit.deleted":
      return applyAuditDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `audit.reducer does not handle event type: ${event.type}`,
      );
  }
};
