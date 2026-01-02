import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { accountReducer } from "@reducers/account.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import type { Event } from "@events/event";

const createOrganization = (docId = "org-1") => {
  const event: Event = {
    id: "evt-org-1",
    type: "organization.created",
    payload: {
      id: docId,
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  return event;
};

test("account.created adds a new account linked to an organization", () => {
  const doc = initAutomergeDoc();
  const orgEvent = createOrganization();
  const orgDoc = organizationReducer(doc, orgEvent);
  const event: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
      metadata: { tier: "gold" },
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = accountReducer(orgDoc, event);
  const account = next.accounts["acct-1"];

  assert.ok(account);
  assert.equal(account.id, "acct-1");
  assert.equal(account.organizationId, "org-1");
  assert.equal(account.name, "ACME Retail");
  assert.equal(account.status, "account.status.active");
  assert.equal(account.createdAt, event.timestamp);
  assert.equal(account.updatedAt, event.timestamp);
});

test("account.created rejects missing organizations", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => accountReducer(doc, event), {
    message: "Organization not found for account: org-1",
  });
});

test("account.created rejects duplicate ids", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const event: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = accountReducer(orgDoc, event);

  assert.throws(() => accountReducer(next, event), {
    message: "Account already exists: acct-1",
  });
});

test("account.status.updated updates status and timestamp", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const created: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "account.status.updated",
    payload: {
      id: "acct-1",
      status: "account.status.inactive",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = accountReducer(orgDoc, created);
  const updatedDoc = accountReducer(createdDoc, updated);
  const account = updatedDoc.accounts["acct-1"];

  assert.equal(account.status, "account.status.inactive");
  assert.equal(account.createdAt, created.timestamp);
  assert.equal(account.updatedAt, updated.timestamp);
});

test("account.status.updated rejects missing accounts", () => {
  const doc = initAutomergeDoc();
  const updated: Event = {
    id: "evt-2",
    type: "account.status.updated",
    payload: {
      id: "acct-1",
      status: "account.status.inactive",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => accountReducer(doc, updated), {
    message: "Account not found: acct-1",
  });
});

test("account.deleted removes the account when no contacts are linked", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const created: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-2",
    type: "account.deleted",
    payload: {
      id: "acct-1",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = accountReducer(orgDoc, created);
  const deletedDoc = accountReducer(createdDoc, deleted);

  assert.equal(deletedDoc.accounts["acct-1"], undefined);
});

test("account.deleted rejects deletion when contacts are linked", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const created: Event = {
    id: "evt-1",
    type: "account.created",
    payload: {
      id: "acct-1",
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active",
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-2",
    type: "account.deleted",
    payload: {
      id: "acct-1",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = accountReducer(orgDoc, created);
  const docWithRelation = {
    ...createdDoc,
    relations: {
      ...createdDoc.relations,
      accountContacts: {
        ...createdDoc.relations.accountContacts,
        "rel-1": {
          accountId: "acct-1" as const,
          contactId: "contact-1" as const,
          role: "account.contact.role.primary" as const,
          isPrimary: true,
        },
      },
    },
  };

  assert.throws(() => accountReducer(docWithRelation, deleted), {
    message: "Cannot delete account acct-1: contacts still linked",
  });
});
