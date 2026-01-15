import assert from "node:assert/strict";

import type { Account } from "@domains/account";
import {
  buildAccountCalendarMatchUpdate,
  findAccountsMatchingCalendarTitle,
  resolveAccountCalendarAliases,
} from "@domains/account.utils";

const createAccount = (
  id: string,
  name: string,
  aliases?: string[],
): Account => ({
  id,
  organizationId: "org-1",
  name,
  status: "account.status.active",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2026-01-01T00:00:00.000Z",
  auditFrequencyAnchorAt: "2026-01-01T00:00:00.000Z",
  calendarMatch: aliases
    ? {
        mode: "exact",
        aliases,
      }
    : undefined,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("resolveAccountCalendarAliases includes defaults and extras", () => {
  const account = createAccount("acct-1", "Comcast Center", [
    "Comcast HQ",
    "Audit - Comcast Center",
  ]);

  assert.deepEqual(resolveAccountCalendarAliases(account), [
    "Comcast Center",
    "Audit - Comcast Center",
    "Comcast HQ",
  ]);
});

test("findAccountsMatchingCalendarTitle matches exact aliases", () => {
  const accounts = [
    createAccount("acct-1", "Comcast Center"),
    createAccount("acct-2", "Other Plaza", ["Other Plaza West"]),
  ];

  const matches = findAccountsMatchingCalendarTitle(
    accounts,
    "Audit - Comcast Center",
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, "acct-1");
});

test("buildAccountCalendarMatchUpdate appends new aliases", () => {
  const account = createAccount("acct-1", "Comcast Center");
  const next = buildAccountCalendarMatchUpdate(account, "Comcast HQ");

  assert.deepEqual(next, {
    mode: "exact",
    aliases: ["Comcast HQ"],
  });
});

test("buildAccountCalendarMatchUpdate skips default aliases", () => {
  const account = createAccount("acct-1", "Comcast Center");
  const next = buildAccountCalendarMatchUpdate(account, "Comcast Center");

  assert.equal(next, undefined);
});
