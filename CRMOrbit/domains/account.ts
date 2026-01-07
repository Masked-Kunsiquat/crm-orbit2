import type { Entity, EntityId, Timestamp } from "./shared/types";

export type AccountStatus = "account.status.active" | "account.status.inactive";
export type AccountAuditFrequency =
  | "account.auditFrequency.monthly"
  | "account.auditFrequency.bimonthly"
  | "account.auditFrequency.quarterly"
  | "account.auditFrequency.triannually";

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

export interface Account extends Entity {
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  auditFrequency: AccountAuditFrequency;
  auditFrequencyUpdatedAt: Timestamp;
  addresses?: AccountAddresses;
  minFloor?: number;
  maxFloor?: number;
  excludedFloors?: number[];
  website?: string;
  socialMedia?: SocialMediaLinks;
  metadata?: Record<string, unknown>;
}
