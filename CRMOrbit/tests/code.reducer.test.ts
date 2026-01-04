import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { accountReducer } from "@reducers/account.reducer";
import { codeReducer } from "@reducers/code.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import type { Event } from "@events/event";

const createOrganization = (id = "org-1"): Event => ({
  id: "evt-org-1",
  type: "organization.created",
  payload: {
    id,
    name: "Acme Corp",
    status: "organization.status.active",
  },
  timestamp: "2024-01-01T00:00:00.000Z",
  deviceId: "device-1",
});

const createAccount = (id = "acct-1", organizationId = "org-1"): Event => ({
  id: `evt-account-${id}`,
  type: "account.created",
  payload: {
    id,
    organizationId,
    name: "ACME Retail",
    status: "account.status.active",
  },
  timestamp: "2024-01-02T00:00:00.000Z",
  deviceId: "device-1",
});

test("code.created adds a new code and relation", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const event: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = codeReducer(accountDoc, event);
  const code = next.codes["code-1"];
  const relation = next.relations.accountCodes["code-1"];

  assert.ok(code);
  assert.equal(code.accountId, "acct-1");
  assert.equal(code.label, "Front Door");
  assert.equal(code.codeValue, "1234");
  assert.equal(code.isEncrypted, false);
  assert.equal(code.type, "code.type.door");
  assert.equal(code.createdAt, event.timestamp);
  assert.equal(code.updatedAt, event.timestamp);
  assert.deepEqual(relation, { accountId: "acct-1", codeId: "code-1" });
});

test("code.created rejects duplicates", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const event: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = codeReducer(accountDoc, event);

  assert.throws(() => codeReducer(next, event), {
    message: "Code already exists: code-1",
  });
});

test("code.created rejects missing accounts", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => codeReducer(doc, event), {
    message: "Account not found for code: acct-1",
  });
});

test("code.updated updates fields and relation", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount("acct-1"));
  const accountDocWithSecond = accountReducer(
    accountDoc,
    createAccount("acct-2"),
  );
  const created: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-code-2",
    type: "code.updated",
    payload: {
      id: "code-1",
      accountId: "acct-2",
      label: "Gate Code",
      codeValue: "9999",
      isEncrypted: true,
      type: "code.type.gate",
      notes: "Temporary",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = codeReducer(accountDocWithSecond, created);
  const updatedDoc = codeReducer(createdDoc, updated);
  const code = updatedDoc.codes["code-1"];
  const relation = updatedDoc.relations.accountCodes["code-1"];

  assert.equal(code.accountId, "acct-2");
  assert.equal(code.label, "Gate Code");
  assert.equal(code.codeValue, "9999");
  assert.equal(code.isEncrypted, true);
  assert.equal(code.type, "code.type.gate");
  assert.equal(code.notes, "Temporary");
  assert.equal(code.updatedAt, updated.timestamp);
  assert.deepEqual(relation, { accountId: "acct-2", codeId: "code-1" });
});

test("code.encrypted updates codeValue and marks encrypted", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const created: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const encrypted: Event = {
    id: "evt-code-enc-1",
    type: "code.encrypted",
    entityId: "code-1",
    payload: {
      codeValue: "encrypted-value",
      isEncrypted: true,
    },
    timestamp: "2024-02-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = codeReducer(accountDoc, created);
  const encryptedDoc = codeReducer(createdDoc, encrypted);
  const code = encryptedDoc.codes["code-1"];

  assert.equal(code.codeValue, "encrypted-value");
  assert.equal(code.isEncrypted, true);
  assert.equal(code.updatedAt, encrypted.timestamp);
});

test("code.updated rejects missing codes", () => {
  const doc = initAutomergeDoc();
  const updated: Event = {
    id: "evt-code-2",
    type: "code.updated",
    payload: {
      id: "code-1",
      label: "Gate Code",
      codeValue: "9999",
      isEncrypted: true,
      type: "code.type.gate",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => codeReducer(doc, updated), {
    message: "Code not found: code-1",
  });
});

test("code.updated rejects missing accounts", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const created: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-code-2",
    type: "code.updated",
    payload: {
      id: "code-1",
      accountId: "acct-missing",
      label: "Gate Code",
      codeValue: "9999",
      isEncrypted: true,
      type: "code.type.gate",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = codeReducer(accountDoc, created);

  assert.throws(() => codeReducer(createdDoc, updated), {
    message: "Account not found: acct-missing",
  });
});

test("code.deleted removes code and relation", () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const created: Event = {
    id: "evt-code-1",
    type: "code.created",
    payload: {
      id: "code-1",
      accountId: "acct-1",
      label: "Front Door",
      codeValue: "1234",
      isEncrypted: false,
      type: "code.type.door",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-code-2",
    type: "code.deleted",
    payload: {
      id: "code-1",
    },
    timestamp: "2024-02-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = codeReducer(accountDoc, created);
  assert.ok(createdDoc.codes["code-1"]);
  assert.ok(createdDoc.relations.accountCodes["code-1"]);

  const deletedDoc = codeReducer(createdDoc, deleted);
  assert.equal(deletedDoc.codes["code-1"], undefined);
  assert.equal(deletedDoc.relations.accountCodes["code-1"], undefined);
});
