import type { Account } from "@domains/account";
import type { Audit } from "@domains/audit";
import {
  addMonthsToPeriodStart,
  getAccountAuditFrequencyMonths,
  getMonthStartTimestamp,
  getPeriodStartFromAnchor,
} from "@domains/account.utils";
import { getAuditStartTimestamp, resolveAuditStatus } from "./audits";

export type AuditScheduleStatus = "ok" | "due" | "missing" | "overdue";
export type AuditPeriodStatus = "ok" | "due" | "missing";

export type AuditScheduleResult = {
  status: AuditScheduleStatus;
  dueAt: string;
  periodStart: string;
  periodEnd: string;
  lastAuditAt?: string;
};

export type AuditPeriod = {
  start: string;
  end: string;
  status: AuditPeriodStatus;
};

const getLatestCompletedAuditTimestamp = (audits: Audit[]): string | null => {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const audit of audits) {
    if (resolveAuditStatus(audit) !== "audits.status.completed") {
      continue;
    }
    const timestamp = getAuditStartTimestamp(audit);
    if (!timestamp) continue;
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) continue;
    if (parsed > latestTime) {
      latestTime = parsed;
      latest = timestamp;
    }
  }

  return latest;
};

const parseTimestamp = (timestamp: string | undefined): number | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? null : parsed;
};

const isAuditInPeriod = (
  audit: Audit,
  startTime: number,
  endTime: number,
): boolean => {
  const timestamp = getAuditStartTimestamp(audit);
  const parsed = parseTimestamp(timestamp);
  return parsed !== null && parsed >= startTime && parsed < endTime;
};

const selectActiveFrequency = (
  account: Account,
  reference: Date,
): { frequency: Account["auditFrequency"]; anchorAt: string } | null => {
  const baseAnchor =
    account.auditFrequencyAnchorAt ??
    getMonthStartTimestamp(
      account.auditFrequencyUpdatedAt ?? account.createdAt ?? "",
    ) ??
    account.auditFrequencyUpdatedAt ??
    account.createdAt ??
    account.updatedAt ??
    "";
  if (!baseAnchor) {
    return null;
  }

  if (
    account.auditFrequencyPending &&
    account.auditFrequencyPendingEffectiveAt
  ) {
    const pendingTime = parseTimestamp(account.auditFrequencyPendingEffectiveAt);
    if (pendingTime !== null && reference.getTime() >= pendingTime) {
      return {
        frequency: account.auditFrequencyPending,
        anchorAt: account.auditFrequencyPendingEffectiveAt,
      };
    }
  }

  return {
    frequency: account.auditFrequency,
    anchorAt: baseAnchor,
  };
};

const buildPeriod = (
  audits: Audit[],
  reference: Date,
  periodStart: string,
  periodEnd: string,
  isCurrent: boolean,
): AuditPeriod => {
  const startTime = parseTimestamp(periodStart) ?? Number.NEGATIVE_INFINITY;
  const endTime = parseTimestamp(periodEnd) ?? Number.NEGATIVE_INFINITY;
  const hasCompleted = audits.some(
    (audit) =>
      resolveAuditStatus(audit) === "audits.status.completed" &&
      isAuditInPeriod(audit, startTime, endTime),
  );
  if (hasCompleted) {
    return { start: periodStart, end: periodEnd, status: "ok" };
  }

  const hasScheduled = audits.some(
    (audit) =>
      resolveAuditStatus(audit) === "audits.status.scheduled" &&
      isAuditInPeriod(audit, startTime, endTime),
  );

  if (isCurrent && hasScheduled) {
    return { start: periodStart, end: periodEnd, status: "ok" };
  }

  if (isCurrent && reference.getTime() < endTime) {
    return { start: periodStart, end: periodEnd, status: "due" };
  }

  return { start: periodStart, end: periodEnd, status: "missing" };
};

export const getAuditPeriods = (
  account: Account,
  audits: Audit[],
  reference: Date = new Date(),
  count = 3,
): AuditPeriod[] | null => {
  if (count <= 0) return [];

  const active = selectActiveFrequency(account, reference);
  if (!active) return null;

  const months = getAccountAuditFrequencyMonths(active.frequency);
  const anchorStart =
    getMonthStartTimestamp(active.anchorAt) ?? active.anchorAt;
  const periodStart =
    getPeriodStartFromAnchor(anchorStart, months, reference.toISOString()) ??
    anchorStart;
  const periodEnd = addMonthsToPeriodStart(periodStart, months);
  if (!periodEnd) return null;

  const anchorTime = parseTimestamp(anchorStart);
  const periods: AuditPeriod[] = [];

  let currentStart = periodStart;
  let currentEnd = periodEnd;

  for (let index = 0; index < count; index += 1) {
    const currentStartTime = parseTimestamp(currentStart);
    if (anchorTime !== null && currentStartTime !== null) {
      if (currentStartTime < anchorTime) break;
    }

    const isCurrent = index === 0;
    periods.push(
      buildPeriod(audits, reference, currentStart, currentEnd, isCurrent),
    );

    const previousStart = addMonthsToPeriodStart(currentStart, -months);
    if (!previousStart) break;
    currentEnd = currentStart;
    currentStart = previousStart;
  }

  return periods;
};

export const getAuditScheduleStatus = (
  account: Account,
  audits: Audit[],
  now: Date = new Date(),
): AuditScheduleResult | null => {
  const periods = getAuditPeriods(account, audits, now, 2);
  if (!periods || periods.length === 0) {
    return null;
  }

  const lastAuditAt = getLatestCompletedAuditTimestamp(audits);
  const hasCompleted = lastAuditAt !== null;
  const current = periods[0];
  const previous = periods.length > 1 ? periods[1] : null;

  if (previous && previous.status === "missing") {
    return {
      status: hasCompleted ? "overdue" : "missing",
      dueAt: previous.end,
      periodStart: previous.start,
      periodEnd: previous.end,
      ...(lastAuditAt && { lastAuditAt }),
    };
  }

  if (current.status === "ok") {
    return {
      status: "ok",
      dueAt: current.end,
      periodStart: current.start,
      periodEnd: current.end,
      ...(lastAuditAt && { lastAuditAt }),
    };
  }

  if (current.status === "due") {
    return {
      status: "due",
      dueAt: current.end,
      periodStart: current.start,
      periodEnd: current.end,
      ...(lastAuditAt && { lastAuditAt }),
    };
  }

  return {
    status: hasCompleted ? "overdue" : "missing",
    dueAt: current.end,
    periodStart: current.start,
    periodEnd: current.end,
    ...(lastAuditAt && { lastAuditAt }),
  };
};
