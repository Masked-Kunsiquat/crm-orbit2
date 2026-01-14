import type { Entity, EntityId, Timestamp } from "./shared/types";

export type AccountStatus = "account.status.active" | "account.status.inactive";
export type AccountAuditFrequency =
  | "account.auditFrequency.monthly"
  | "account.auditFrequency.bimonthly"
  | "account.auditFrequency.quarterly"
  | "account.auditFrequency.triannually";
export type AccountAuditFrequencyChangeTiming =
  | "account.auditFrequencyChange.immediate"
  | "account.auditFrequencyChange.nextPeriod";
export type AccountCalendarMatchMode = "exact";

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface AccountAddresses {
  site?: Address;
  parking?: Address;
  useSameForParking?: boolean;
}

export interface SocialMediaLinks {
  x?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
}

export interface AccountCalendarMatch {
  mode: AccountCalendarMatchMode;
  aliases: string[];
}

export interface Account extends Entity {
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  auditFrequency: AccountAuditFrequency;
  auditFrequencyUpdatedAt: Timestamp;
  auditFrequencyAnchorAt: Timestamp;
  auditFrequencyPending?: AccountAuditFrequency;
  auditFrequencyPendingEffectiveAt?: Timestamp;
  addresses?: AccountAddresses;
  minFloor?: number;
  maxFloor?: number;
  excludedFloors?: number[];
  website?: string;
  socialMedia?: SocialMediaLinks;
  calendarMatch?: AccountCalendarMatch;
  metadata?: Record<string, unknown>;
}
