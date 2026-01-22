import assert from "node:assert/strict";

import type { CalendarEvent } from "@domains/calendarEvent";
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

const createAuditEvent = (
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: "audit-1",
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.scheduled",
  summary: "Test Audit",
  scheduledFor: "2024-06-15T10:00:00.000Z",
  durationMinutes: 60,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  auditData: { accountId: "acct-1" },
  ...overrides,
});

// resolveAuditStatus tests

test("resolveAuditStatus returns completed for completed status", () => {
  const event = createAuditEvent({ status: "calendarEvent.status.completed" });
  assert.equal(resolveAuditStatus(event), "audits.status.completed");
});

test("resolveAuditStatus returns scheduled for scheduled status", () => {
  const event = createAuditEvent({ status: "calendarEvent.status.scheduled" });
  assert.equal(resolveAuditStatus(event), "audits.status.scheduled");
});

test("resolveAuditStatus returns canceled for canceled status", () => {
  const event = createAuditEvent({ status: "calendarEvent.status.canceled" });
  assert.equal(resolveAuditStatus(event), "audits.status.canceled");
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
  const event = createAuditEvent({
    status: "calendarEvent.status.completed",
    occurredAt: "2024-06-15T11:00:00.000Z",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(event), "2024-06-15T11:00:00.000Z");
});

test("getAuditStartTimestamp falls back to scheduledFor for completed without occurredAt", () => {
  const event = createAuditEvent({
    status: "calendarEvent.status.completed",
    scheduledFor: "2024-06-15T10:00:00.000Z",
    occurredAt: undefined,
  });
  assert.equal(getAuditStartTimestamp(event), "2024-06-15T10:00:00.000Z");
});

test("getAuditStartTimestamp returns scheduledFor for scheduled audit", () => {
  const event = createAuditEvent({
    status: "calendarEvent.status.scheduled",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(event), "2024-06-15T10:00:00.000Z");
});

test("getAuditStartTimestamp falls back to occurredAt for non-completed", () => {
  const event = createAuditEvent({
    status: "calendarEvent.status.canceled",
    scheduledFor: undefined as unknown as string,
    occurredAt: "2024-06-15T11:00:00.000Z",
  });
  assert.equal(getAuditStartTimestamp(event), "2024-06-15T11:00:00.000Z");
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
  const event = createAuditEvent({
    scheduledFor: "2024-06-15T10:00:00.000Z",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(event), "2024-06-15T11:00:00.000Z");
});

test("getAuditEndTimestamp returns undefined when no start timestamp", () => {
  const event = createAuditEvent({
    scheduledFor: undefined as unknown as string,
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(event), undefined);
});

test("getAuditEndTimestamp returns undefined when no duration", () => {
  const event = createAuditEvent({
    scheduledFor: "2024-06-15T10:00:00.000Z",
    durationMinutes: undefined as unknown as number,
  });
  assert.equal(getAuditEndTimestamp(event), undefined);
});

test("getAuditEndTimestamp returns undefined for invalid date", () => {
  const event = createAuditEvent({
    scheduledFor: "invalid-date",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(event), undefined);
});

test("getAuditEndTimestamp handles crossing midnight", () => {
  const event = createAuditEvent({
    scheduledFor: "2024-06-15T23:30:00.000Z",
    durationMinutes: 60,
  });
  assert.equal(getAuditEndTimestamp(event), "2024-06-16T00:30:00.000Z");
});

// getAuditSortTimestamp tests

test("getAuditSortTimestamp returns timestamp as number", () => {
  const event = createAuditEvent({ scheduledFor: "2024-06-15T10:00:00.000Z" });
  const result = getAuditSortTimestamp(event);
  assert.equal(result, Date.parse("2024-06-15T10:00:00.000Z"));
});

test("getAuditSortTimestamp returns NEGATIVE_INFINITY for missing timestamp", () => {
  const event = createAuditEvent({
    scheduledFor: undefined as unknown as string,
    occurredAt: undefined,
  });
  assert.equal(getAuditSortTimestamp(event), Number.NEGATIVE_INFINITY);
});

test("getAuditSortTimestamp returns NEGATIVE_INFINITY for invalid date", () => {
  const event = createAuditEvent({ scheduledFor: "invalid-date" });
  assert.equal(getAuditSortTimestamp(event), Number.NEGATIVE_INFINITY);
});

// sortAuditsByDescendingTime tests

test("sortAuditsByDescendingTime sorts most recent first", () => {
  const older = createAuditEvent({
    id: "audit-1",
    scheduledFor: "2024-06-01T10:00:00.000Z",
  });
  const newer = createAuditEvent({
    id: "audit-2",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });

  const result = [older, newer].sort(sortAuditsByDescendingTime);

  assert.equal(result[0]?.id, "audit-2");
  assert.equal(result[1]?.id, "audit-1");
});

test("sortAuditsByDescendingTime handles same timestamps", () => {
  const event1 = createAuditEvent({
    id: "audit-1",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  const event2 = createAuditEvent({
    id: "audit-2",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });

  const result = sortAuditsByDescendingTime(event1, event2);

  assert.equal(result, 0);
});

test("sortAuditsByDescendingTime puts audits without timestamps last", () => {
  const withTimestamp = createAuditEvent({
    id: "audit-1",
    scheduledFor: "2024-06-15T10:00:00.000Z",
  });
  const withoutTimestamp = createAuditEvent({
    id: "audit-2",
    scheduledFor: undefined as unknown as string,
  });

  const result = [withoutTimestamp, withTimestamp].sort(
    sortAuditsByDescendingTime,
  );

  assert.equal(result[0]?.id, "audit-1");
  assert.equal(result[1]?.id, "audit-2");
});
