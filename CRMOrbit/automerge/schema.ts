import type { Account } from "@domains/account";
import type { Audit } from "@domains/audit";
import type { Code } from "@domains/code";
import type { Contact } from "@domains/contact";
import type { Interaction } from "@domains/interaction";
import type { Note } from "@domains/note";
import type { Organization } from "@domains/organization";
import type { Settings } from "@domains/settings";
import type { AccountCode } from "@domains/relations/accountCode";
import type { AccountContact } from "@domains/relations/accountContact";
import type { EntityLink } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";

export interface AutomergeDoc {
  organizations: Record<EntityId, Organization>;
  accounts: Record<EntityId, Account>;
  audits: Record<EntityId, Audit>;
  contacts: Record<EntityId, Contact>;
  notes: Record<EntityId, Note>;
  interactions: Record<EntityId, Interaction>;
  codes: Record<EntityId, Code>;
  settings: Settings;
  relations: {
    accountContacts: Record<EntityId, AccountContact>;
    accountCodes: Record<EntityId, AccountCode>;
    entityLinks: Record<EntityId, EntityLink>;
  };
}
