import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { auditReducer } from "@reducers/audit.reducer";
import { accountReducer } from "@reducers/account.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import type { Event } from "@events/event";
import type { AccountStatus } from "@domains/account";

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

type AccountPayloadOverrides = Partial<{
  name: string;
  status: AccountStatus;
  minFloor: number;
  maxFloor: number;
  excludedFloors: number[];
}>;

const createAccount = (docId = "acct-1", overrides: AccountPayloadOverrides = {}) => {
  const event: Event = {
    id: `evt-${docId}`,
    type: "account.created",
    payload: {
      id: docId,
      organizationId: "org-1",
      name: "ACME Retail",
      status: "account.status.active" as AccountStatus,
      ...overrides,
    },
    timestamp: "2024-01-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  return event;
};

const createDocWithAccount = (overrides?: Partial<Event["payload"]>) => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  return accountReducer(orgDoc, createAccount("acct-1", overrides));
};

test("audit.created adds a scheduled audit", () => {
  const doc = createDocWithAccount({
    minFloor: -2,
    maxFloor: 3,
    excludedFloors: [0],
  });
  const event: Event = {
    id: "evt-audit-1",
    type: "audit.created",
    payload: {
      id: "audit-1",
      accountId: "acct-1",
      scheduledFor: "2024-03-01T12:00:00.000Z",
      notes: "Bring checklist",
      floorsVisited: [-2, 1, 2],
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = auditReducer(doc, event);
  const audit = next.audits["audit-1"];

  assert.ok(audit);
  assert.equal(audit.accountId, "acct-1");
  assert.equal(audit.scheduledFor, "2024-03-01T12:00:00.000Z");
  assert.equal(audit.notes, "Bring checklist");
  assert.deepEqual(audit.floorsVisited, [-2, 1, 2]);
});

test("audit.created rejects missing account", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-audit-1",
    type: "audit.created",
    payload: {
      id: "audit-1",
      accountId: "acct-1",
      scheduledFor: "2024-03-01T12:00:00.000Z",
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => auditReducer(doc, event), {
    message: "Account not found: acct-1",
  });
});

test("audit.completed stores outcomes", () => {
  const doc = createDocWithAccount({
    minFloor: 1,
    maxFloor: 5,
    excludedFloors: [3],
  });
  const created: Event = {
    id: "evt-audit-1",
    type: "audit.created",
    payload: {
      id: "audit-1",
      accountId: "acct-1",
      scheduledFor: "2024-03-01T12:00:00.000Z",
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const completed: Event = {
    id: "evt-audit-2",
    type: "audit.completed",
    payload: {
      id: "audit-1",
      occurredAt: "2024-03-01T13:00:00.000Z",
      score: 92,
      notes: "All good",
      floorsVisited: [1, 2, 4],
    },
    timestamp: "2024-03-01T13:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = auditReducer(doc, created);
  const completedDoc = auditReducer(createdDoc, completed);
  const audit = completedDoc.audits["audit-1"];

  assert.equal(audit.occurredAt, "2024-03-01T13:00:00.000Z");
  assert.equal(audit.score, 92);
  assert.equal(audit.notes, "All good");
  assert.deepEqual(audit.floorsVisited, [1, 2, 4]);
});

test("audit.completed rejects floors outside the configured range", () => {
  const doc = createDocWithAccount({
    minFloor: 1,
    maxFloor: 3,
  });
  const created: Event = {
    id: "evt-audit-1",
    type: "audit.created",
    payload: {
      id: "audit-1",
      accountId: "acct-1",
      scheduledFor: "2024-03-01T12:00:00.000Z",
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const completed: Event = {
    id: "evt-audit-2",
    type: "audit.completed",
    payload: {
      id: "audit-1",
      occurredAt: "2024-03-01T13:00:00.000Z",
      floorsVisited: [5],
    },
    timestamp: "2024-03-01T13:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = auditReducer(doc, created);

  assert.throws(() => auditReducer(createdDoc, completed), {
    message: "Audit floor 5 is not allowed for this account.",
  });
});

test("audit.account.reassigned validates floors against new account", () => {
  const doc = createDocWithAccount({
    minFloor: 1,
    maxFloor: 2,
  });
  const orgDoc = doc;
  const secondAccount = createAccount("acct-2", {
    minFloor: 5,
    maxFloor: 6,
  });
  const docWithSecond = accountReducer(orgDoc, secondAccount);
  const created: Event = {
    id: "evt-audit-1",
    type: "audit.created",
    payload: {
      id: "audit-1",
      accountId: "acct-1",
      scheduledFor: "2024-03-01T12:00:00.000Z",
      floorsVisited: [1],
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const reassigned: Event = {
    id: "evt-audit-2",
    type: "audit.account.reassigned",
    payload: {
      id: "audit-1",
      accountId: "acct-2",
    },
    timestamp: "2024-03-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = auditReducer(docWithSecond, created);

  assert.throws(() => auditReducer(createdDoc, reassigned), {
    message: "Audit floor 1 is not allowed for this account.",
  });
});
