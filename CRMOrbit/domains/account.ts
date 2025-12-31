import type { Entity, EntityId } from "./shared/types";

export type AccountStatus = "account.status.active" | "account.status.inactive";

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
  addresses?: AccountAddresses;
  website?: string;
  socialMedia?: SocialMediaLinks;
  metadata?: Record<string, unknown>;
}
