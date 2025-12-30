import type { EntityId } from "../shared/types";

export interface AutomergeDoc {
  organizations: Record<EntityId, unknown>;
  accounts: Record<EntityId, unknown>;
  contacts: Record<EntityId, unknown>;
  notes: Record<EntityId, unknown>;
  interactions: Record<EntityId, unknown>;
  relations: {
    accountContacts: Record<EntityId, unknown>;
    noteLinks: Record<EntityId, unknown>;
  };
}
