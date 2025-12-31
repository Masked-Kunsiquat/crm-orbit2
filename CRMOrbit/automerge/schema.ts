import type { Account } from "@domains/account";
import type { Contact } from "@domains/contact";
import type { Interaction } from "@domains/interaction";
import type { Note } from "@domains/note";
import type { Organization } from "@domains/organization";
import type { AccountContact } from "@domains/relations/accountContact";
import type { NoteLink } from "@domains/relations/noteLink";
import type { EntityId } from "@domains/shared/types";

export interface AutomergeDoc {
  organizations: Record<EntityId, Organization>;
  accounts: Record<EntityId, Account>;
  contacts: Record<EntityId, Contact>;
  notes: Record<EntityId, Note>;
  interactions: Record<EntityId, Interaction>;
  relations: {
    accountContacts: Record<EntityId, AccountContact>;
    noteLinks: Record<EntityId, NoteLink>;
  };
}
