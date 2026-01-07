import type { Account } from "@domains/account";
import type { Audit } from "@domains/audit";
import { getAccountAuditFrequencyMonths } from "@domains/account.utils";
import { getAuditStartTimestamp, resolveAuditStatus } from "./audits";

export type AuditScheduleStatus = "ok" | "missing" | "overdue";

export type AuditScheduleResult = {
  status: AuditScheduleStatus;
  dueAt: string;
  lastAuditAt?: string;
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

const addMonths = (anchor: Date, months: number): Date => {
  const targetYear = anchor.getFullYear();
  const targetMonth = anchor.getMonth() + months;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(anchor.getDate(), lastDay);

  return new Date(
    targetYear,
    targetMonth,
    clampedDay,
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  );
};

export const getAuditScheduleStatus = (
  account: Account,
  audits: Audit[],
  now: Date = new Date(),
): AuditScheduleResult | null => {
  const anchorTimestamp =
    account.auditFrequencyUpdatedAt || account.createdAt || account.updatedAt;
  if (!anchorTimestamp) {
    return null;
  }

  const anchorTime = Date.parse(anchorTimestamp);
  if (Number.isNaN(anchorTime)) {
    return null;
  }

  const lastAuditAt = getLatestCompletedAuditTimestamp(audits);
  const lastAuditTime = lastAuditAt ? Date.parse(lastAuditAt) : null;
  const effectiveAnchor =
    lastAuditTime && lastAuditTime > anchorTime
      ? new Date(lastAuditTime)
      : new Date(anchorTime);
  const months = getAccountAuditFrequencyMonths(account.auditFrequency);
  const dueAtDate = addMonths(effectiveAnchor, months);
  if (Number.isNaN(dueAtDate.getTime())) {
    return null;
  }

  const isOverdue = now.getTime() > dueAtDate.getTime();
  if (!isOverdue) {
    return {
      status: "ok",
      dueAt: dueAtDate.toISOString(),
      ...(lastAuditAt && { lastAuditAt }),
    };
  }

  return {
    status: lastAuditAt ? "overdue" : "missing",
    dueAt: dueAtDate.toISOString(),
    ...(lastAuditAt && { lastAuditAt }),
  };
};
