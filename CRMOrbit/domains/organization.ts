import type { Entity } from "./shared/types";

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
  logoUri?: string;
  website?: string;
  socialMedia?: SocialMediaLinks;
  metadata?: Record<string, unknown>;
}
