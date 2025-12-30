import assert from "node:assert/strict";
import { test } from "node:test";

import { initAutomergeDoc } from "../crm-core/automerge/init";
import { organizationReducer } from "../crm-core/reducers/organization.reducer";
import type { Event } from "../crm-core/events/event";

test("organization.created adds a new organization", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
      metadata: { region: "north" },
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = organizationReducer(doc, event);
  const org = next.organizations["org-1"];

  assert.ok(org);
  assert.equal(org.id, "org-1");
  assert.equal(org.name, "Acme Corp");
  assert.equal(org.status, "organization.status.active");
  assert.equal(org.createdAt, event.timestamp);
  assert.equal(org.updatedAt, event.timestamp);
});

test("organization.created rejects duplicate ids", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = organizationReducer(doc, event);

  assert.throws(() => organizationReducer(next, event), {
    message: "Organization already exists: org-1",
  });
});

test("organization.status.updated updates status and timestamp", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.inactive");
  assert.equal(org.createdAt, created.timestamp);
  assert.equal(org.updatedAt, updated.timestamp);
});

test("organization.status.updated rejects missing organizations", () => {
  const doc = initAutomergeDoc();
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => organizationReducer(doc, updated), {
    message: "Organization not found: org-1",
  });
});
