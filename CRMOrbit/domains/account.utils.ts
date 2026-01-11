import type {
  Account,
  AccountAuditFrequency,
  AccountAuditFrequencyChangeTiming,
  AccountStatus,
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

/**
 * Type guard for account status
 */
const isAccountStatus = (value: unknown): value is AccountStatus => {
  return (
    typeof value === "string" &&
    (value === "account.status.active" || value === "account.status.inactive")
  );
};

/**
 * Build account state from event payload.
 * Used by both reducers and timeline rendering for consistent state derivation.
 *
 * Handles complex audit frequency logic including:
 * - Immediate vs. next-period frequency changes
 * - Anchor date management
 * - Pending frequency tracking
 *
 * @param id - Account entity ID
 * @param payload - Event payload (may be partial for updates)
 * @param timestamp - Event timestamp
 * @param existing - Existing account state (for updates)
 * @returns Complete account state
 */
export const buildAccountFromPayload = (
  id: string,
  payload: Record<string, unknown>,
  timestamp: string,
  existing?: Account,
): Account => {
  const existingFrequency = resolveAccountAuditFrequency(
    existing?.auditFrequency,
  );
  const existingUpdatedAt =
    existing?.auditFrequencyUpdatedAt ?? existing?.createdAt ?? timestamp;
  const existingAnchorAt =
    existing?.auditFrequencyAnchorAt ??
    getMonthStartTimestamp(existingUpdatedAt) ??
    timestamp;
  const payloadFrequency =
    typeof payload.auditFrequency === "string"
      ? resolveAccountAuditFrequency(payload.auditFrequency)
      : undefined;
  const frequencyChanged =
    payloadFrequency !== undefined && payloadFrequency !== existingFrequency;
  const changeTiming = isAccountAuditFrequencyChangeTiming(
    payload.auditFrequencyChangeTiming,
  )
    ? payload.auditFrequencyChangeTiming
    : "account.auditFrequencyChange.immediate";

  let auditFrequency = existingFrequency;
  let auditFrequencyUpdatedAt = existingUpdatedAt;
  let auditFrequencyAnchorAt = existingAnchorAt;
  let auditFrequencyPending = existing?.auditFrequencyPending;
  let auditFrequencyPendingEffectiveAt =
    existing?.auditFrequencyPendingEffectiveAt;

  if (!existing) {
    // Creating new account
    auditFrequency = payloadFrequency ?? existingFrequency;
    auditFrequencyUpdatedAt = timestamp;
    auditFrequencyAnchorAt = getMonthStartTimestamp(timestamp) ?? timestamp;
    auditFrequencyPending = undefined;
    auditFrequencyPendingEffectiveAt = undefined;
  } else if (frequencyChanged && payloadFrequency) {
    // Updating existing account's frequency
    if (changeTiming === "account.auditFrequencyChange.nextPeriod") {
      const months = getAccountAuditFrequencyMonths(existingFrequency);
      const currentPeriodStart =
        getPeriodStartFromAnchor(existingAnchorAt, months, timestamp) ??
        existingAnchorAt;
      auditFrequencyPending = payloadFrequency;
      auditFrequencyPendingEffectiveAt =
        addMonthsToPeriodStart(currentPeriodStart, months) ??
        currentPeriodStart;
    } else {
      auditFrequency = payloadFrequency;
      auditFrequencyUpdatedAt = timestamp;
      auditFrequencyAnchorAt =
        getMonthStartTimestamp(timestamp) ?? existingAnchorAt;
      auditFrequencyPending = undefined;
      auditFrequencyPendingEffectiveAt = undefined;
    }
  }

  return {
    id,
    organizationId:
      typeof payload.organizationId === "string"
        ? payload.organizationId
        : (existing?.organizationId ?? ""),
    name:
      typeof payload.name === "string" ? payload.name : (existing?.name ?? ""),
    status: isAccountStatus(payload.status)
      ? payload.status
      : (existing?.status ?? "account.status.active"),
    minFloor:
      typeof payload.minFloor === "number"
        ? payload.minFloor
        : existing?.minFloor,
    maxFloor:
      typeof payload.maxFloor === "number"
        ? payload.maxFloor
        : existing?.maxFloor,
    auditFrequency,
    auditFrequencyUpdatedAt,
    auditFrequencyAnchorAt,
    auditFrequencyPending,
    auditFrequencyPendingEffectiveAt,
    excludedFloors: Array.isArray(payload.excludedFloors)
      ? (payload.excludedFloors as number[])
      : existing?.excludedFloors,
    addresses:
      payload.addresses !== undefined
        ? (payload.addresses as Account["addresses"])
        : existing?.addresses,
    website:
      typeof payload.website === "string" ? payload.website : existing?.website,
    socialMedia:
      payload.socialMedia !== undefined
        ? (payload.socialMedia as Account["socialMedia"])
        : existing?.socialMedia,
    metadata:
      payload.metadata !== undefined
        ? (payload.metadata as Record<string, unknown>)
        : existing?.metadata,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};
