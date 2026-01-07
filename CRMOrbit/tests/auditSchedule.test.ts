import assert from "node:assert/strict";

import type { Account } from "@domains/account";
import type { Audit } from "@domains/audit";
import { getAuditScheduleStatus } from "@views/utils/auditSchedule";

const baseAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acct-1",
  organizationId: "org-1",
  name: "Account A",
  status: "account.status.active",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const completedAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  accountId: "acct-1",
  scheduledFor: "2024-01-05T00:00:00.000Z",
  durationMinutes: 60,
  status: "audits.status.completed",
  occurredAt: "2024-01-05T00:00:00.000Z",
  createdAt: "2024-01-05T00:00:00.000Z",
  updatedAt: "2024-01-05T00:00:00.000Z",
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

test("audit schedule stays ok when last audit is within frequency", () => {
  const account = baseAccount();
  const audits = [completedAudit({ occurredAt: "2024-01-10T00:00:00.000Z" })];
  const result = getAuditScheduleStatus(
    account,
    audits,
    new Date("2024-02-05T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result.status, "ok");
});

test("audit schedule respects mid-cycle frequency changes", () => {
  const account = baseAccount({
    auditFrequency: "account.auditFrequency.quarterly",
    auditFrequencyUpdatedAt: "2024-01-20T00:00:00.000Z",
  });
  const audits = [completedAudit({ occurredAt: "2024-01-05T00:00:00.000Z" })];
  const result = getAuditScheduleStatus(
    account,
    audits,
    new Date("2024-04-25T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result.status, "overdue");
});
