import type { AccountAuditFrequency } from "./account";

export const DEFAULT_ACCOUNT_AUDIT_FREQUENCY: AccountAuditFrequency =
  "account.auditFrequency.monthly";

const ACCOUNT_AUDIT_FREQUENCY_MONTHS: Record<AccountAuditFrequency, number> = {
  "account.auditFrequency.monthly": 1,
  "account.auditFrequency.bimonthly": 2,
  "account.auditFrequency.quarterly": 3,
  "account.auditFrequency.triannually": 4,
};

export const isAccountAuditFrequency = (
  value: unknown,
): value is AccountAuditFrequency =>
  typeof value === "string" && value in ACCOUNT_AUDIT_FREQUENCY_MONTHS;

export const resolveAccountAuditFrequency = (
  value: unknown,
): AccountAuditFrequency =>
  isAccountAuditFrequency(value) ? value : DEFAULT_ACCOUNT_AUDIT_FREQUENCY;

export const getAccountAuditFrequencyMonths = (value: unknown): number =>
  ACCOUNT_AUDIT_FREQUENCY_MONTHS[resolveAccountAuditFrequency(value)];
