import type { Entity, EntityId } from "../shared/types";

export type AccountStatus = "account.status.active" | "account.status.inactive";

export interface Account extends Entity {
  organizationId: EntityId;
  name: string;
  status: AccountStatus;
  metadata?: Record<string, unknown>;
}
