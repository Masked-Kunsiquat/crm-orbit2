import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { accountReducer } from "@reducers/account.reducer";
import { codeReducer } from "@reducers/code.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import { buildCodeEncryptionEvents } from "@domains/migrations/codeEncryption";
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

test("buildCodeEncryptionEvents returns events for unencrypted codes", async () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const plain: Event = {
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
    id: "evt-code-2",
    type: "code.created",
    payload: {
      id: "code-2",
      accountId: "acct-1",
      label: "Gate",
      codeValue: "encrypted-value",
      isEncrypted: true,
      type: "code.type.gate",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withPlain = codeReducer(accountDoc, plain);
  const withCodes = codeReducer(withPlain, encrypted);

  const events = await buildCodeEncryptionEvents(
    withCodes,
    "device-1",
    async (value) => `enc:${value}`,
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "code.encrypted");
  assert.equal(events[0]?.entityId, "code-1");
  assert.deepEqual(events[0]?.payload, {
    codeValue: "enc:1234",
    isEncrypted: true,
  });
});

test("buildCodeEncryptionEvents returns empty when all codes are encrypted", async () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  const encrypted: Event = {
    id: "evt-code-2",
    type: "code.created",
    payload: {
      id: "code-2",
      accountId: "acct-1",
      label: "Gate",
      codeValue: "encrypted-value",
      isEncrypted: true,
      type: "code.type.gate",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withCodes = codeReducer(accountDoc, encrypted);
  const events = await buildCodeEncryptionEvents(
    withCodes,
    "device-1",
    async (value) => `enc:${value}`,
  );

  assert.equal(events.length, 0);
});
