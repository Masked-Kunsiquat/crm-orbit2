import type { Audit } from "@domains/audit";

export const getAuditSortTimestamp = (audit: Audit): number => {
  const timestamp = audit.occurredAt ?? audit.scheduledFor;
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

export const sortAuditsByDescendingTime = (left: Audit, right: Audit): number =>
  getAuditSortTimestamp(right) - getAuditSortTimestamp(left);
