import type { Entity, EntityId } from "./shared/types";

export type OrganizationStatus =
  | "organization.status.active"
  | "organization.status.inactive";

export interface Organization extends Entity {
  name: string;
  status: OrganizationStatus;
  metadata?: Record<string, unknown>;
}
