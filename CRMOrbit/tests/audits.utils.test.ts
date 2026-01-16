import assert from "node:assert/strict";

import type { Audit } from "@domains/audit";
import {
  resolveAuditStatus,
  getAuditStatusTone,
  getAuditTimestampLabelKey,
  getAuditStartTimestamp,
  formatAuditScore,
  formatAuditScoreInput,
  getAuditEndTimestamp,
  getAuditSortTimestamp,
  sortAuditsByDescendingTime,
} from "@views/utils/audits";

const createAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  accountId: "acct-1",
  scheduledFor: "2024-06-15T10:00:00.000Z",
  durationMinutes: 60,
  status: "audits.status.scheduled",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// resolveAuditStatus tests

test("resolveAuditStatus returns explicit status when set", () => {
  const audit = createAudit({ status: "audits.status.completed" });
  assert.equal(resolveAuditStatus(audit), "audits.status.completed");
});

test("resolveAuditStatus returns completed when occurredAt is set and no explicit status", () => {
  const audit = createAudit({
    status: undefined as unknown as Audit["status"],
    occurredAt: "2024-06-15T11:00:00.000Z",
  });
  assert.equal(resolveAuditStatus(audit), "audits.status.completed");
});

test("resolveAuditStatus returns scheduled when no occurredAt and no explicit status", () => {
  const audit = createAudit({
    status: undefined as unknown as Audit["status"],
  });
  assert.equal(resolveAuditStatus(audit), "audits.status.scheduled");
});

// getAuditStatusTone tests

test("getAuditStatusTone returns success for completed", () => {
  assert.equal(getAuditStatusTone("audits.status.completed"), "success");
});

test("getAuditStatusTone returns danger for canceled", () => {
  assert.equal(getAuditStatusTone("audits.status.canceled"), "danger");
});

test("getAuditStatusTone returns warning for scheduled", () => {
  assert.equal(getAuditStatusTone("audits.status.scheduled"), "warning");
});

// getAuditTimestampLabelKey tests

test("getAuditTimestampLabelKey returns occurredAt for completed", () => {
  assert.equal(
    getAuditTimestampLabelKey("audits.status.completed"),
    "audits.fields.occurredAt",
  );
});

test("getAuditTimestampLabelKey returns canceledAt for canceled", () => {
  assert.equal(
    getAuditTimestampLabelKey("audits.status.canceled"),
    "audits.fields.canceledAt",
  );
});

test("getAuditTimestampLabelKey returns scheduledFor for scheduled", () => {
  assert.equal(
    getAuditTimestampLabelKey("audits.status.scheduled"),
    "audits.fields.scheduledFor",
  );
});

// getAuditStartTimestamp tests

test("getAuditStartTimestamp returns occurredAt for completed audit", () => {
  const audit = createAudit({
    status: "audits.status.completed",
    occurredAt: "2024-06-15T11:00:00.000Z",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(audit), "2024-06-15T11:00:00.000Z");
});

test("getAuditStartTimestamp falls back to scheduledFor for completed without occurredAt", () => {
  const audit = createAudit({
    status: "audits.status.completed",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(audit), "2024-06-15T10:00:00.000Z");
});

test("getAuditStartTimestamp returns scheduledFor for scheduled audit", () => {
  const audit = createAudit({
    status: "audits.status.scheduled",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(audit), "2024-06-15T10:00:00.000Z");
});

test("getAuditStartTimestamp falls back to occurredAt for non-completed", () => {
  const audit = createAudit({
    status: "audits.status.canceled",
    scheduledFor: undefined as unknown as string,
    occurredAt: "2024-06-15T11:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(audit), "2024-06-15T11:00:00.000Z");
});

// formatAuditScore tests

test("formatAuditScore formats whole number without decimals", () => {
  assert.equal(formatAuditScore(95), "95%");
});

test("formatAuditScore formats one decimal place", () => {
  assert.equal(formatAuditScore(95.5), "95.5%");
});

test("formatAuditScore formats two decimal places", () => {
  assert.equal(formatAuditScore(95.25), "95.25%");
});

test("formatAuditScore returns undefined for undefined score", () => {
  assert.equal(formatAuditScore(undefined), undefined);
});

test("formatAuditScore returns undefined for NaN score", () => {
  assert.equal(formatAuditScore(NaN), undefined);
});

test("formatAuditScore handles zero", () => {
  assert.equal(formatAuditScore(0), "0%");
});

test("formatAuditScore handles 100", () => {
  assert.equal(formatAuditScore(100), "100%");
});

// formatAuditScoreInput tests

test("formatAuditScoreInput formats whole number without decimals", () => {
  assert.equal(formatAuditScoreInput(95), "95");
});

test("formatAuditScoreInput formats decimal number", () => {
  assert.equal(formatAuditScoreInput(95.5), "95.5");
});

test("formatAuditScoreInput returns empty string for undefined", () => {
  assert.equal(formatAuditScoreInput(undefined), "");
});

test("formatAuditScoreInput returns empty string for NaN", () => {
  assert.equal(formatAuditScoreInput(NaN), "");
});

// getAuditEndTimestamp tests

test("getAuditEndTimestamp calculates end time from start and duration", () => {
  const audit = createAudit({
    scheduledFor: "2024-06-15T10:00:00.000Z",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(audit), "2024-06-15T11:00:00.000Z");
});

test("getAuditEndTimestamp returns undefined when no start timestamp", () => {
  const audit = createAudit({
    scheduledFor: undefined as unknown as string,
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(audit), undefined);
});

test("getAuditEndTimestamp returns undefined when no duration", () => {
  const audit = createAudit({
    scheduledFor: "2024-06-15T10:00:00.000Z",
    durationMinutes: undefined as unknown as number,
  });
  assert.equal(getAuditEndTimestamp(audit), undefined);
});

test("getAuditEndTimestamp returns undefined for invalid date", () => {
  const audit = createAudit({
    scheduledFor: "invalid-date",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(audit), undefined);
});

test("getAuditEndTimestamp handles crossing midnight", () => {
  const audit = createAudit({
    scheduledFor: "2024-06-15T23:30:00.000Z",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(audit), "2024-06-16T00:30:00.000Z");
});

// getAuditSortTimestamp tests

test("getAuditSortTimestamp returns timestamp as number", () => {
  const audit = createAudit({ scheduledFor: "2024-06-15T10:00:00.000Z" });
  const result = getAuditSortTimestamp(audit);
  assert.equal(result, Date.parse("2024-06-15T10:00:00.000Z"));
});

test("getAuditSortTimestamp returns NEGATIVE_INFINITY for missing timestamp", () => {
  const audit = createAudit({
    scheduledFor: undefined as unknown as string,
    occurredAt: undefined,
  });
  assert.equal(getAuditSortTimestamp(audit), Number.NEGATIVE_INFINITY);
});

test("getAuditSortTimestamp returns NEGATIVE_INFINITY for invalid date", () => {
  const audit = createAudit({ scheduledFor: "invalid-date" });
  assert.equal(getAuditSortTimestamp(audit), Number.NEGATIVE_INFINITY);
});

// sortAuditsByDescendingTime tests

test("sortAuditsByDescendingTime sorts most recent first", () => {
  const older = createAudit({
    id: "audit-1",
    scheduledFor: "2024-06-01T10:00:00.000Z",
  });
  const newer = createAudit({
    id: "audit-2",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });

  const result = [older, newer].sort(sortAuditsByDescendingTime);

  assert.equal(result[0]?.id, "audit-2");
  assert.equal(result[1]?.id, "audit-1");
});

test("sortAuditsByDescendingTime handles same timestamps", () => {
  const audit1 = createAudit({
    id: "audit-1",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  const audit2 = createAudit({
    id: "audit-2",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });

  const result = sortAuditsByDescendingTime(audit1, audit2);

  assert.equal(result, 0);
});

test("sortAuditsByDescendingTime puts audits without timestamps last", () => {
  const withTimestamp = createAudit({
    id: "audit-1",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  const withoutTimestamp = createAudit({
    id: "audit-2",
    scheduledFor: undefined as unknown as string,
  });

  const result = [withoutTimestamp, withTimestamp].sort(
    sortAuditsByDescendingTime,
  );

  assert.equal(result[0]?.id, "audit-1");
  assert.equal(result[1]?.id, "audit-2");
});
