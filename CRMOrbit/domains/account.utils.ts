import type {
  AccountAuditFrequency,
  AccountAuditFrequencyChangeTiming,
} from "./account";

export const DEFAULT_ACCOUNT_AUDIT_FREQUENCY: AccountAuditFrequency =
  "account.auditFrequency.monthly";

const ACCOUNT_AUDIT_FREQUENCY_MONTHS: Record<AccountAuditFrequency, number> = {
  "account.auditFrequency.monthly": 1,
  "account.auditFrequency.bimonthly": 2,
  "account.auditFrequency.quarterly": 3,
  "account.auditFrequency.triannually": 4,
};
const ACCOUNT_AUDIT_FREQUENCY_CHANGE_TIMINGS: Record<
  AccountAuditFrequencyChangeTiming,
  true
> = {
  "account.auditFrequencyChange.immediate": true,
  "account.auditFrequencyChange.nextPeriod": true,
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

export const isAccountAuditFrequencyChangeTiming = (
  value: unknown,
): value is AccountAuditFrequencyChangeTiming =>
  typeof value === "string" && value in ACCOUNT_AUDIT_FREQUENCY_CHANGE_TIMINGS;

const toMonthIndex = (date: Date): number =>
  date.getUTCFullYear() * 12 + date.getUTCMonth();

const fromMonthIndex = (
  monthIndex: number,
): { year: number; month: number } => {
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  return {
    year,
    month: month < 0 ? month + 12 : month,
  };
};

export const getMonthStartTimestamp = (timestamp: string): string | null => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return start.toISOString();
};

export const getPeriodStartFromAnchor = (
  anchorTimestamp: string,
  months: number,
  targetTimestamp: string,
): string | null => {
  const anchorDate = new Date(anchorTimestamp);
  const targetDate = new Date(targetTimestamp);
  if (
    Number.isNaN(anchorDate.getTime()) ||
    Number.isNaN(targetDate.getTime())
  ) {
    return null;
  }
  const anchorIndex = toMonthIndex(anchorDate);
  const targetIndex = toMonthIndex(targetDate);
  const offset = Math.floor((targetIndex - anchorIndex) / months) * months;
  const periodStartIndex = anchorIndex + offset;
  const { year, month } = fromMonthIndex(periodStartIndex);
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
};

export const addMonthsToPeriodStart = (
  periodStartTimestamp: string,
  months: number,
): string | null => {
  const startDate = new Date(periodStartTimestamp);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }
  const startIndex = toMonthIndex(startDate);
  const nextIndex = startIndex + months;
  const { year, month } = fromMonthIndex(nextIndex);
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
};
