import type { Entity, Timestamp } from "./shared/types";

export type OrganizationStatus =
  | "organization.status.active"
  | "organization.status.inactive";

export interface SocialMediaLinks {
  x?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
}

export interface Organization extends Entity {
  name: string;
  status: OrganizationStatus;
  /** When this organization became active (can be backdated) */
  activeAt?: Timestamp;
  /** When this organization became inactive (only set when status is inactive) */
  inactiveAt?: Timestamp;
  logoUri?: string;
  website?: string;
  socialMedia?: SocialMediaLinks;
  metadata?: Record<string, unknown>;
}
