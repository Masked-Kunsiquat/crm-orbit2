import assert from "node:assert/strict";

import type { Account } from "@domains/account";
import type { CalendarEvent } from "@domains/calendarEvent";
import { getAuditScheduleStatus } from "@views/utils/auditSchedule";

const baseAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acct-1",
  organizationId: "org-1",
  name: "Account A",
  status: "account.status.active",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2024-01-01T00:00:00.000Z",
  auditFrequencyAnchorAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const completedAuditEvent = (
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: "audit-1",
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.completed",
  summary: "Test Audit",
  scheduledFor: "2024-01-05T00:00:00.000Z",
  durationMinutes: 60,
  occurredAt: "2024-01-05T00:00:00.000Z",
  createdAt: "2024-01-05T00:00:00.000Z",
  updatedAt: "2024-01-05T00:00:00.000Z",
  auditData: { accountId: "acct-1" },
  ...overrides,
});

test("audit schedule marks missing when no audits exist past due", () => {
  const account = baseAccount();
  const result = getAuditScheduleStatus(
    account,
    [],
    new Date("2024-02-05T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result.status, "missing");
});

test("audit schedule warns when current period has no audit scheduled", () => {
  const account = baseAccount();
  const audits = [
    completedAuditEvent({ occurredAt: "2024-01-10T00:00:00.000Z" }),
  ];
  const result = getAuditScheduleStatus(
    account,
    audits,
    new Date("2024-02-05T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result.status, "due");
});

test("audit schedule flags missing when a closed period has no audit", () => {
  const account = baseAccount({
    auditFrequency: "account.auditFrequency.quarterly",
    auditFrequencyUpdatedAt: "2024-01-01T00:00:00.000Z",
    auditFrequencyAnchorAt: "2024-01-01T00:00:00.000Z",
  });
  const audits = [
    completedAuditEvent({ occurredAt: "2024-01-05T00:00:00.000Z" }),
  ];
  const result = getAuditScheduleStatus(
    account,
    audits,
    new Date("2024-09-10T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result.status, "overdue");
});
