import { describe, it, expect } from "@jest/globals";
import type { AutomergeDoc } from "../../automerge/schema";
import type { Account } from "../account";
import {
  migrateAccountLifecycle,
  validateAccountLifecycleMigration,
} from "./migrateAccountLifecycle";

const createEmptyDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  audits: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  calendarEvents: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: {} as any, // Simplified for testing
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
});

const createAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acct-1",
  organizationId: "org-1",
  name: "Acme HQ",
  status: "account.status.active",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2024-01-01T00:00:00.000Z",
  auditFrequencyAnchorAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  ...overrides,
});

describe("migrateAccountLifecycle", () => {
  it("backfills activeAt and clears inactiveAt for active accounts", () => {
    const doc = createEmptyDoc();
    const account = createAccount({
      activeAt: undefined,
      inactiveAt: "2024-01-15T00:00:00.000Z",
    });
    doc.accounts[account.id] = account;

    const { doc: migrated, report } = migrateAccountLifecycle(doc, "device-1");
    const migratedAccount = migrated.accounts[account.id];

    expect(migratedAccount.activeAt).toBe(account.createdAt);
    expect(migratedAccount.inactiveAt).toBeUndefined();
    expect(report.migratedAccounts).toBe(1);
    expect(report.accountIds).toEqual([account.id]);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].type).toBe("account.updated");
    expect(report.events[0].timestamp).toBe(account.updatedAt);
    expect(report.events[0].payload).toEqual({
      id: account.id,
      activeAt: account.createdAt,
      inactiveAt: null,
    });
  });

  it("skips inactive accounts without changing activeAt/inactiveAt", () => {
    const doc = createEmptyDoc();
    const account = createAccount({
      status: "account.status.inactive",
      activeAt: undefined,
      inactiveAt: "2024-02-01T00:00:00.000Z",
    });
    doc.accounts[account.id] = account;

    const { doc: migrated, report } = migrateAccountLifecycle(doc, "device-1");
    const migratedAccount = migrated.accounts[account.id];

    expect(migratedAccount.activeAt).toBeUndefined();
    expect(migratedAccount.inactiveAt).toBe(account.inactiveAt);
    expect(report.migratedAccounts).toBe(0);
    expect(report.events).toHaveLength(0);
  });

  it("is idempotent for already migrated active accounts", () => {
    const doc = createEmptyDoc();
    const account = createAccount({
      activeAt: "2024-01-03T00:00:00.000Z",
    });
    doc.accounts[account.id] = account;

    const firstRun = migrateAccountLifecycle(doc, "device-1");
    const secondRun = migrateAccountLifecycle(firstRun.doc, "device-1");

    expect(firstRun.report.migratedAccounts).toBe(0);
    expect(firstRun.report.events).toHaveLength(0);
    expect(secondRun.report.migratedAccounts).toBe(0);
    expect(secondRun.report.events).toHaveLength(0);
  });
});

describe("validateAccountLifecycleMigration", () => {
  it("flags active accounts missing activeAt or with inactiveAt set", () => {
    const doc = createEmptyDoc();
    const account = createAccount({
      activeAt: undefined,
      inactiveAt: "2024-01-10T00:00:00.000Z",
    });
    doc.accounts[account.id] = account;

    const validation = validateAccountLifecycleMigration(doc);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual([
      `Active account ${account.id} missing activeAt`,
      `Active account ${account.id} has inactiveAt set`,
    ]);
  });
});
