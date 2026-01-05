import type { Audit, AuditStatus } from "@domains/audit";

export type AuditStatusTone = "success" | "warning" | "danger";

export const resolveAuditStatus = (audit: Audit): AuditStatus => {
  if (audit.status) {
    return audit.status;
  }
  return audit.occurredAt
    ? "audits.status.completed"
    : "audits.status.scheduled";
};

export const getAuditStatusTone = (status: AuditStatus): AuditStatusTone => {
  switch (status) {
    case "audits.status.completed":
      return "success";
    case "audits.status.canceled":
      return "danger";
    case "audits.status.scheduled":
    default:
      return "warning";
  }
};

export const getAuditTimestampLabelKey = (
  status: AuditStatus,
):
  | "audits.fields.occurredAt"
  | "audits.fields.scheduledFor"
  | "audits.fields.canceledAt" => {
  switch (status) {
    case "audits.status.completed":
      return "audits.fields.occurredAt";
    case "audits.status.canceled":
      return "audits.fields.canceledAt";
    case "audits.status.scheduled":
    default:
      return "audits.fields.scheduledFor";
  }
};

export const getAuditStartTimestamp = (audit: Audit): string | undefined => {
  const status = resolveAuditStatus(audit);
  if (status === "audits.status.completed") {
    return audit.occurredAt ?? audit.scheduledFor;
  }
  return audit.scheduledFor ?? audit.occurredAt;
};

export const getAuditEndTimestamp = (audit: Audit): string | undefined => {
  const start = getAuditStartTimestamp(audit);
  if (!start || !audit.durationMinutes) {
    return undefined;
  }
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  date.setMinutes(date.getMinutes() + audit.durationMinutes);
  return date.toISOString();
};

export const getAuditSortTimestamp = (audit: Audit): number => {
  const timestamp = getAuditStartTimestamp(audit);
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

export const sortAuditsByDescendingTime = (left: Audit, right: Audit): number =>
  getAuditSortTimestamp(right) - getAuditSortTimestamp(left);
