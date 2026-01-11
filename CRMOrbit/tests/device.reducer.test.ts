import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { deviceReducer } from "@reducers/device.reducer";
import type { Event } from "@events/event";

test("device.registered returns doc unchanged", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "device.registered",
    payload: {
      id: "device-123",
      name: "iPhone 15",
      platform: "ios",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-123",
  };

  const next = deviceReducer(doc, event);

  // The reducer should return the doc unchanged
  assert.deepEqual(next, doc);
});

test("device.registered handles minimal payload", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-2",
    type: "device.registered",
    payload: {
      id: "device-456",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-456",
  };

  const next = deviceReducer(doc, event);

  // The reducer should return the doc unchanged
  assert.deepEqual(next, doc);
});

test("device.registered preserves existing doc state", () => {
  const doc = initAutomergeDoc();
  // Add some existing data to the doc
  doc.accounts["acct-1"] = {
    id: "acct-1",
    organizationId: "org-1",
    name: "Test Account",
    status: "account.status.active",
    metadata: {},
    auditFrequency: 30,
  };

  const event: Event = {
    id: "evt-3",
    type: "device.registered",
    payload: {
      id: "device-789",
      name: "Android Device",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-789",
  };

  const next = deviceReducer(doc, event);

  // The reducer should preserve existing state
  assert.ok(next.accounts["acct-1"]);
  assert.equal(next.accounts["acct-1"].name, "Test Account");
});

test("unhandled event type throws error", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-4",
    type: "device.updated" as Event["type"],
    payload: {},
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => deviceReducer(doc, event), {
    name: "Error",
    message: "device.reducer does not handle event type: device.updated",
  });
});

test("invalid event type throws error with correct message", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-5",
    type: "device.deleted" as Event["type"],
    payload: {},
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => deviceReducer(doc, event), {
    name: "Error",
    message: "device.reducer does not handle event type: device.deleted",
  });
});
